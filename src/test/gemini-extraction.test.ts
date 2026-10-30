import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extractWithGemini } from '@/lib/telegram/gemini.server';
import { ExtractionProviderError, isLovableCreditPause, lovableCreditPause, withCreditFallback } from '@/lib/telegram/extraction-policy.server';

const document = { valor: 12.34, data: '2026-10-30', emissao: null, beneficiario: 'Loja de teste', descricao: 'Compra fictícia', documento: 'comprovante', codigo: null, produtos: [] };
const complete = (value: unknown = document, finishReason = 'STOP') => Response.json({ candidates: [{ finishReason, content: { parts: [{ text: JSON.stringify(value) }] } }] });
beforeEach(() => { vi.stubEnv('GEMINI_API_KEY', 'test-only-not-a-real-key'); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('alternativa Gemini', () => {
  it('mantém Lovable quando a leitura funciona', async () => {
    const fallback = vi.fn();
    expect(await withCreditFallback(async () => document, fallback, { geminiAvailable: true })).toEqual(document);
    expect(fallback).not.toHaveBeenCalled();
  });
  it('tenta Gemini uma vez após 402 e registra a pausa antes da alternativa', async () => {
    const calls: string[] = [];
    const fallback = vi.fn(async () => { calls.push('gemini'); return document; });
    expect(await withCreditFallback(async () => { throw new ExtractionProviderError('lovable', 402, 'Denied'); }, fallback, {
      geminiAvailable: true, onLovableCreditsExhausted: async () => { calls.push('pause'); },
    })).toEqual(document);
    expect(calls).toEqual(['pause', 'gemini']); expect(fallback).toHaveBeenCalledTimes(1);
  });
  it('reconhece 402 encapsulado sem depender da mensagem técnica', async () => {
    const fallback = vi.fn(async () => document);
    await withCreditFallback(async () => { throw new Error('No output', { cause: new ExtractionProviderError('lovable', 402, 'Denied') }); }, fallback, { geminiAvailable: true });
    expect(fallback).toHaveBeenCalledTimes(1);
  });
  it.each([401, 403, 404, 429, 500])('não troca de provedor por falha %s', async status => {
    const fallback = vi.fn(); const error = new ExtractionProviderError('lovable', status, 'Denied');
    await expect(withCreditFallback(async () => { throw error; }, fallback, { geminiAvailable: true })).rejects.toBe(error);
    expect(fallback).not.toHaveBeenCalled();
  });
  it('mantém revisão manual sem chave e não tenta Gemini', async () => {
    const fallback = vi.fn();
    await expect(withCreditFallback(async () => { throw new ExtractionProviderError('lovable', 402, 'Denied'); }, fallback, { geminiAvailable: false })).rejects.toThrow('manualmente');
    expect(fallback).not.toHaveBeenCalled();
  });
  it('pausa de crédito usa Gemini sem chamar Lovable novamente', async () => {
    const primary = vi.fn(); const fallback = vi.fn(async () => document);
    await withCreditFallback(primary, fallback, { geminiAvailable: true, geminiOnly: true });
    expect(primary).not.toHaveBeenCalled(); expect(fallback).toHaveBeenCalledTimes(1);
    expect(isLovableCreditPause(lovableCreditPause)).toBe(true);
    expect(isLovableCreditPause('HTTP 402 Not enough credits')).toBe(true);
    expect(isLovableCreditPause('HTTP 403 acesso negado')).toBe(false);
    expect(isLovableCreditPause('Pausa manual')).toBe(false);
  });
  it('não repete automaticamente a alternativa quando ela falha', async () => {
    const fallback = vi.fn(async () => { throw new ExtractionProviderError('gemini', 429, 'Limit'); });
    await expect(withCreditFallback(async () => { throw new ExtractionProviderError('lovable', 402, 'Denied'); }, fallback, { geminiAvailable: true })).rejects.toThrow('Limit');
    expect(fallback).toHaveBeenCalledTimes(1);
  });
  it('envia PDF diretamente ao Google e chave apenas no cabeçalho', async () => {
    const request = vi.fn(async () => complete()); vi.stubGlobal('fetch', request);
    expect(await extractWithGemini('Instruções', 'Documento fictício', Buffer.from('%PDF-fake'), 'application/pdf')).toEqual(document);
    const [url, options] = request.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
    expect(url).not.toContain('test-only');
    expect(options.headers).toHaveProperty('x-goog-api-key', 'test-only-not-a-real-key');
    const body = JSON.parse(options.body as string);
    expect(body.contents[0].parts[0].inlineData.mimeType).toBe('application/pdf');
    expect(body.generationConfig.responseJsonSchema.properties.produtos.maxItems).toBe(200);
    expect(body.generationConfig.thinkingConfig.thinkingLevel).toBe('LOW');
  });
  it.each([401, 403, 429, 500])('erro Google %s não expõe resposta do provedor', async status => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('private-provider-body-and-key', { status })));
    await expect(extractWithGemini('instruções', 'fictício')).rejects.toMatchObject({ provider: 'gemini', statusCode: status });
    await expect(extractWithGemini('instruções', 'fictício')).rejects.not.toThrow('private-provider-body');
  });
  it('recusa resposta truncada, bloqueada ou fora do schema', async () => {
    const request = vi.fn().mockResolvedValueOnce(complete(document, 'MAX_TOKENS')).mockResolvedValueOnce(Response.json({ promptFeedback: { blockReason: 'SAFETY' } })).mockResolvedValueOnce(complete({ valor: 'inventado' }));
    vi.stubGlobal('fetch', request);
    for (let i = 0; i < 3; i++) await expect(extractWithGemini('instruções', 'fictício')).rejects.toThrow('dados válidos');
  });
  it('rede indisponível preserva mensagem de conferência manual', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('key=private'); }));
    await expect(extractWithGemini('instruções', 'fictício')).rejects.toThrow('manualmente');
  });
  it.each(['headers', 'body'])('encerra em 25 segundos mesmo com %s travado', async stage => {
    vi.useFakeTimers();
    const request = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => {
      if (stage === 'headers') return new Promise<Response>(() => {});
      const response = complete();
      response.json = () => new Promise(() => {});
      return response;
    });
    vi.stubGlobal('fetch', request);
    const result = extractWithGemini('instruções', 'fictício');
    const rejected = expect(result).rejects.toThrow('25 segundos');
    await vi.advanceTimersByTimeAsync(25_000);
    await rejected;
    expect(request.mock.calls[0]![1]?.signal?.aborted).toBe(true);
    await expect(result).rejects.toMatchObject({ reason: 'timeout' });
    expect(request).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('não envia parâmetro de Gemini 3 para modelo anterior configurado', async () => {
    vi.stubEnv('GEMINI_MODEL', 'gemini-2.5-flash');
    const request = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect(JSON.parse(init!.body as string).generationConfig.thinkingConfig).toBeUndefined();
      return complete();
    });
    vi.stubGlobal('fetch', request);
    await extractWithGemini('instruções', 'fictício');
  });
  it('usa o modo de redirecionamento compatível com Cloudflare Workers', async () => {
    const request = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      // Reproduce the documented Workers rejection instead of Node fetch behavior.
      if (init?.redirect === 'error') throw new TypeError('Invalid redirect value: error is not implemented');
      expect(init?.redirect).toBe('manual');
      return complete();
    });
    vi.stubGlobal('fetch', request);
    await expect(extractWithGemini('instruções', 'fictício')).resolves.toEqual(document);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it.each([301, 302, 307, 308])('não segue redirecionamento Google %s nem reenvia a chave', async status => {
    const request = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.redirect).toBe('manual');
      return new Response(null, { status, headers: { Location: 'https://other.example.test' } });
    });
    vi.stubGlobal('fetch', request);
    await expect(extractWithGemini('instruções', 'fictício')).rejects.toMatchObject({ provider: 'gemini', statusCode: status });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('recusa configuração ausente e tipo inválido antes da chamada', async () => {
    const request = vi.fn(); vi.stubGlobal('fetch', request);
    await expect(extractWithGemini('instruções', '', Buffer.from('bad'), 'text/html')).rejects.toThrow('incompatível');
    vi.stubEnv('GEMINI_API_KEY', '');
    await expect(extractWithGemini('instruções', 'fictício')).rejects.toThrow('não configurado');
    expect(request).not.toHaveBeenCalled();
  });
});

