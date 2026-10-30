import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ stream: vi.fn(), provider: vi.fn((_config: { fetch: typeof fetch }) => ({ responses: vi.fn(() => 'lovable-model') })) }));
vi.mock('ai', async importOriginal => ({ ...await importOriginal<typeof import('ai')>(), streamText: mocks.stream }));
vi.mock('@ai-sdk/openai', () => ({ createOpenAI: mocks.provider }));
import { extractDocument } from '@/lib/telegram/extract.server';
const data = { valor: 12.345, data: '2026-02-30', emissao: null, beneficiario: 'Loja fictícia', descricao: null, documento: 'comprovante', codigo: null, produtos: [{ nome: 'Leite', qtd: null, preco: null }] };
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('GEMINI_API_KEY', 'test-only'); vi.stubEnv('LOVABLE_API_KEY', 'test-only-lovable'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('captura 402 no fetch do SDK mesmo quando o erro de streaming perde o status', async () => {
  const pause = vi.fn(async () => {});
  const request = vi.fn(async (url: string) => url.includes('googleapis.com')
    ? Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(data) }] } }] })
    : new Response('Not enough credits', { status: 402 }));
  vi.stubGlobal('fetch', request);
  mocks.stream.mockImplementation(() => ({ output: (async () => {
    await mocks.provider.mock.calls[0]![0].fetch('https://ai.gateway.lovable.dev/v1/responses');
    throw new Error('No output generated. Check the stream for errors');
  })() }));
  const result = await extractDocument('Documento fictício', Buffer.from('%PDF-fake'), 'application/pdf', 'teste.pdf', { onLovableCreditsExhausted: pause });
  expect(pause).toHaveBeenCalledTimes(1); expect(request).toHaveBeenCalledTimes(2);
  expect(result.valor).toBe(12.35); expect(result.data).toBeNull(); expect(result.produtos[0]!.qtd).toBeNull();
});

it('não chama Gemini quando Lovable gera dados válidos', async () => {
  const request = vi.fn(); vi.stubGlobal('fetch', request); mocks.stream.mockReturnValue({ output: Promise.resolve(data) });
  expect((await extractDocument('fictício')).valor).toBe(12.35); expect(request).not.toHaveBeenCalled();
});
