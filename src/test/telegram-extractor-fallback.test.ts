import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { extractDocument } from '@/lib/telegram/extract.server';

const data = {
  valor: 12.345, data: '2026-02-30', emissao: null, beneficiario: 'Loja fictícia',
  descricao: null, documento: 'comprovante', codigo: null,
  produtos: [{ nome: 'Leite', qtd: null, preco: null }],
};
const response = () => Response.json({
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(data) }] } }],
});

beforeEach(() => { vi.stubEnv('GEMINI_API_KEY', 'test-only'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('envia o documento diretamente à Gemini e normaliza os campos extraídos', async () => {
  const request = vi.fn(async () => response());
  vi.stubGlobal('fetch', request);

  const result = await extractDocument('Documento fictício', Buffer.from('%PDF-fake'), 'application/pdf');

  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0]![0]).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
  expect(result.valor).toBe(12.35);
  expect(result.data).toBeNull();
  expect(result.produtos[0]!.qtd).toBeNull();
});

it('deixa a revisão para conferência manual se a chave Gemini estiver ausente', async () => {
  const request = vi.fn();
  vi.stubGlobal('fetch', request);
  vi.stubEnv('GEMINI_API_KEY', '');

  await expect(extractDocument('fictício')).rejects.toThrow('Gemini não configurado');
  expect(request).not.toHaveBeenCalled();
});
