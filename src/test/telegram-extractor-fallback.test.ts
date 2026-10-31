import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { extractDocument } from '@/lib/telegram/extract.server';

const data = {
  valor: 12.345, data: '2026-02-30', emissao: null, beneficiario: 'Loja fictícia',
  descricao: null, documento: 'comprovante', codigo: null,
  produtos: [{ nome: 'Leite', qtd: null, preco: null }],
};
const response = () => Response.json({
  status: 'completed',
  output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(data) }] }],
});

beforeEach(() => { vi.stubEnv('OPENAI_API_KEY', 'test-only'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('envia o documento à OpenAI e normaliza os campos extraídos', async () => {
  const request = vi.fn(async (_input: string | URL | Request, _init?:RequestInit) => response());
  vi.stubGlobal('fetch', request);

  const result = await extractDocument('Documento fictício', Buffer.from('%PDF-fake'), 'application/pdf');

  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0]?.[0]).toBe('https://api.openai.com/v1/responses');
  const options = request.mock.calls[0]?.[1];
  const body = JSON.parse(String(options?.body));
  expect(body.store).toBe(false);
  expect(body.model).toBe('gpt-6-luna');
  expect(body.input[0].content[0].type).toBe('input_file');
  expect(body.text.format.strict).toBe(true);
  expect(result.valor).toBe(12.35);
  expect(result.data).toBeNull();
  expect(result.produtos[0]?.qtd).toBeNull();
});

it('deixa a revisão para conferência manual se a chave OpenAI estiver ausente', async () => {
  const request = vi.fn();
  vi.stubGlobal('fetch', request);
  vi.stubEnv('OPENAI_API_KEY', '');

  await expect(extractDocument('fictício')).rejects.toThrow('OpenAI não configurada');
  expect(request).not.toHaveBeenCalled();
});
