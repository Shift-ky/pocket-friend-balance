import { extractedSchema } from './model';
import { ExtractionProviderError } from './extraction-policy.server';

const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] };
const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] };
const responseSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    valor: nullableNumber, data: nullableString, emissao: nullableString,
    beneficiario: nullableString, descricao: nullableString,
    documento: { type: 'string', enum: ['boleto', 'cupom', 'comprovante', 'texto', 'outro'] },
    codigo: nullableString,
    produtos: { type: 'array', maxItems: 200, items: {
      type: 'object', additionalProperties: false,
      properties: { nome: nullableString, qtd: nullableNumber, preco: nullableNumber },
      required: ['nome', 'qtd', 'preco'],
    } },
  },
  required: ['valor', 'data', 'emissao', 'beneficiario', 'descricao', 'documento', 'codigo', 'produtos'],
};

type OpenAIResponse = {
  status?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string; refusal?: string }>;
  }>;
};

export async function extractWithOpenAI(instructions: string, text: string, bytes?: Buffer, mime?: string) {
  const key = process.env['OPENAI_API_KEY']?.trim();
  if (!key) throw new ExtractionProviderError('openai', undefined, 'OpenAI não configurada. Confira a chave de servidor.');

  const model = process.env['OPENAI_MODEL']?.trim() || 'gpt-6-luna';
  if (!/^gpt-[a-zA-Z0-9.-]+$/.test(model)) throw new Error('Modelo OpenAI inválido.');
  if (bytes && (!['application/pdf', 'image/jpeg', 'image/png'].includes(mime ?? '') || bytes.length > 20 * 1024 * 1024)) {
    throw new Error('Arquivo incompatível com a leitura. Confira manualmente.');
  }

  const content: Array<Record<string, unknown>> = [];
  if (bytes && mime === 'application/pdf') {
    content.push({
      type: 'input_file',
      filename: 'documento.pdf',
      file_data: 'data:application/pdf;base64,' + bytes.toString('base64'),
      detail: 'high',
    });
  } else if (bytes) {
    content.push({
      type: 'input_image',
      image_url: 'data:' + mime + ';base64,' + bytes.toString('base64'),
      detail: 'high',
    });
  }
  content.push({ type: 'input_text', text: text || 'Leia este documento financeiro.' });

  // Uses inline file data and store:false; no persistent Files API upload or response storage.
  // Never log provider response bodies, document contents, or credentials.
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let payload: OpenAIResponse;
  try {
    const request = async () => {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: JSON.stringify({
          model,
          instructions,
          input: [{ role: 'user', content }],
          text: { format: { type: 'json_schema', name: 'financial_document', strict: true, schema: responseSchema } },
          reasoning: { effort: 'none' },
          max_output_tokens: 16384,
          store: false,
        }),
      });
      if (!response.ok) {
        const message = response.status === 429 ? 'Limite da OpenAI atingido. Confira o documento manualmente.'
          : [401, 403].includes(response.status) ? 'Acesso à OpenAI indisponível. Confira a chave e as permissões no servidor.'
          : 'Não foi possível ler pela OpenAI. Confira o documento manualmente.';
        throw new ExtractionProviderError('openai', response.status, message);
      }
      return await response.json() as OpenAIResponse;
    };
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new ExtractionProviderError('openai', undefined, 'A OpenAI ultrapassou o limite de 60 segundos. O arquivo continua disponível para conferência manual.', 'timeout'));
        controller.abort();
      }, 60_000);
    });
    payload = await Promise.race([request(), deadline]);
  } catch (error) {
    if (error instanceof ExtractionProviderError) throw error;
    throw new ExtractionProviderError('openai', undefined, 'OpenAI indisponível. Confira o documento manualmente.');
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }

  try {
    const parts = (payload.output ?? []).filter(item => item.type === 'message').flatMap(item => item.content ?? []);
    if (parts.some(part => part.type === 'refusal' || part.refusal)) throw new Error('Refused');
    if (payload.status !== 'completed') throw new Error('Incomplete output');
    const output = parts.filter(part => part.type === 'output_text' && typeof part.text === 'string').map(part => part.text).join('');
    return extractedSchema.parse(JSON.parse(output));
  } catch {
    throw new ExtractionProviderError('openai', undefined, 'A OpenAI não retornou dados válidos. Confira os campos manualmente.');
  }
}
