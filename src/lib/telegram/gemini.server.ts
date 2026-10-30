import { extractedSchema } from './model';
import { ExtractionProviderError } from './extraction-policy.server';

const nullableString = { type: ['string', 'null'] };
const nullableNumber = { type: ['number', 'null'] };
const responseSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    valor: nullableNumber, data: nullableString, emissao: nullableString,
    beneficiario: nullableString, descricao: nullableString,
    documento: { type: 'string', enum: ['boleto', 'cupom', 'comprovante', 'texto', 'outro'] },
    codigo: nullableString,
    produtos: { type: 'array', maxItems: 200, items: {
      type: 'object', additionalProperties: false,
      properties: { nome: nullableString, qtd: nullableNumber, preco: nullableNumber }, required: ['nome', 'qtd', 'preco'],
    } },
  }, required: ['valor', 'data', 'emissao', 'beneficiario', 'descricao', 'documento', 'codigo', 'produtos'],
};

export async function extractWithGemini(instructions: string, text: string, bytes?: Buffer, mime?: string) {
  const key = process.env['GEMINI_API_KEY']?.trim();
  if (!key) throw new ExtractionProviderError('gemini', undefined, 'Gemini não configurado. Confira o documento manualmente.');
  const model = process.env['GEMINI_MODEL']?.trim() || 'gemini-3.8-flash';
  if (!/^gemini-[a-zA-Z0-9.-]+$/.test(model)) throw new Error('Modelo Gemini inválido.');
  if (bytes && (!['application/pdf', 'image/jpeg', 'image/png'].includes(mime ?? '') || bytes.length > 20 * 1024 * 1024)) {
    throw new Error('Arquivo incompatível com a leitura alternativa. Confira manualmente.');
  }
  // Fixed Google endpoint, header authentication and no Files API persistence.
  // Never include provider response bodies or credentials in stored/displayed errors.
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let payload: Awaited<ReturnType<Response['json']>>;
  try {
    const request = async () => {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      // Cloudflare Workers rejects redirect: 'error' before sending the request.
      // Manual mode also prevents forwarding the API key to a redirect target.
      method: 'POST', redirect: 'manual', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instructions }] },
        contents: [{ role: 'user', parts: [
          ...(bytes ? [{ inlineData: { mimeType: mime, data: bytes.toString('base64') } }] : []),
          { text: text || 'Leia este documento financeiro.' },
        ] }],
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: responseSchema, maxOutputTokens: 16384,
          ...(/^gemini-[34][.-]/.test(model) ? { thinkingConfig: { thinkingLevel: 'LOW' } } : {}),
        },
      }),
    });
      if (!response.ok) {
        const message = response.status === 429 ? 'Limite do Gemini atingido. Confira o documento manualmente.'
          : [401, 403].includes(response.status) ? 'Acesso ao Gemini indisponível. Confira a chave e as permissões no servidor.'
          : 'Não foi possível ler pelo Gemini. Confira o documento manualmente.';
        throw new ExtractionProviderError('gemini', response.status, message);
      }
      // Include the full response body in the deadline, not just response headers.
      return response.json();
    };
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new ExtractionProviderError('gemini', undefined, 'O Gemini ultrapassou o limite de 25 segundos. O arquivo continua disponível para conferência manual.', 'timeout'));
        controller.abort();
      }, 25_000);
    });
    payload = await Promise.race([request(), deadline]);
  } catch (error) {
    if (error instanceof ExtractionProviderError) throw error;
    throw new ExtractionProviderError('gemini', undefined, 'Gemini indisponível. Confira o documento manualmente.');
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
  try {
    const candidate = payload.candidates?.[0];
    if (payload.promptFeedback?.blockReason || candidate?.finishReason !== 'STOP') throw new Error('Incomplete output');
    const parts = candidate.content?.parts;
    if (!Array.isArray(parts)) throw new Error('Missing output');
    const output = parts.filter((p: { thought?: boolean; text?: unknown }) => !p.thought && typeof p.text === 'string').map((p: { text: string }) => p.text).join('');
    return extractedSchema.parse(JSON.parse(output));
  } catch {
    throw new ExtractionProviderError('gemini', undefined, 'O Gemini não retornou dados válidos. Confira os campos manualmente.');
  }
}

