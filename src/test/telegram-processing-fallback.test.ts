import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), extract: vi.fn(), send: vi.fn(), download: vi.fn() }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: mocks.from, rpc: mocks.rpc } }));
vi.mock('@/lib/telegram/extract.server', () => ({ extractDocument: mocks.extract }));
vi.mock('@/lib/telegram/gateway.server', () => ({ telegram: mocks.send, downloadTelegram: mocks.download }));
import { processReviews } from '@/lib/telegram/process.server';
import { ExtractionProviderError, lovableCreditPause } from '@/lib/telegram/extraction-policy.server';

const extracted = { valor: 12, data: '2026-10-30', descricao: 'Teste fictício', documento: 'comprovante', produtos: [] };
const row = (id: string) => ({ id, user_id: 'test-user', grupo_id: 'test-group', chat_id: 123, source_text: 'fictício', file_id: null });
let pause: { paused: boolean; reason: string } | null;
let rows: ReturnType<typeof row>[];
let writes: { table: string; value: Record<string, unknown> }[];
let filters: unknown[][];
let pauseError: boolean;
beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.clearAllMocks(); vi.stubEnv('GEMINI_API_KEY', 'not-a-real-key');
  pause = null; rows = [row('one')]; writes = []; filters = []; pauseError = false;
  mocks.rpc.mockResolvedValue({ data: true }); mocks.extract.mockResolvedValue(extracted); mocks.send.mockResolvedValue({});
  mocks.from.mockImplementation((table: string) => {
    const query = {
      select: () => query,
      eq: (...args: unknown[]) => { filters.push(args); return query; },
      is: () => query, in: () => query, order: () => query, limit: () => query,
      maybeSingle: async () => ({ data: table === 'telegram_ai_state' ? pause : { moto: false }, error: null }),
      update: (value: Record<string, unknown>) => { writes.push({ table, value }); return query; },
      upsert: async (value: Record<string, unknown>) => { writes.push({ table, value }); return { error: pauseError ? { message: 'failed' } : null }; },
      then: (resolve: (x: unknown) => unknown) => Promise.resolve({ data: table === 'telegram_reviews' ? rows : null, error: null }).then(resolve),
    };
    return query;
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('processamento agendado com alternativa', () => {
  it('processa novos documentos quando Lovable está pausado por crédito', async () => {
    pause = { paused: true, reason: lovableCreditPause };
    expect(await processReviews()).toEqual({ paused: false });
    expect(mocks.extract.mock.calls[0]![4].geminiOnly).toBe(true);
    expect(writes.some(w => w.value['extraction_status'] === 'concluido')).toBe(true);
    expect(filters).toContainEqual(['extraction_status', 'aguardando']);
    expect(mocks.rpc.mock.calls.every(([name]) => !String(name).includes('action'))).toBe(true);
  });
  it('mantém pausas de permissão e pausas não reconhecidas', async () => {
    for (const reason of ['Acesso negado 403', 'Pausa manual', 'No output generated']) {
      pause = { paused: true, reason };
      expect(await processReviews()).toEqual({ paused: true, reason });
    }
    expect(mocks.extract).not.toHaveBeenCalled();
  });
  it('mantém pausa de crédito sem chave Gemini', async () => {
    vi.stubEnv('GEMINI_API_KEY', ''); pause = { paused: true, reason: lovableCreditPause };
    expect((await processReviews()).paused).toBe(true); expect(mocks.extract).not.toHaveBeenCalled();
  });
  it('memoriza 402 no banco e usa Gemini no próximo item do mesmo lote', async () => {
    rows = [row('one'), row('two')];
    mocks.extract.mockImplementationOnce(async (_text, _bytes, _mime, _name, options) => { await options.onLovableCreditsExhausted(); return extracted; }).mockResolvedValue(extracted);
    await processReviews();
    expect(writes.filter(w => w.table === 'telegram_ai_state')).toEqual([expect.objectContaining({ value: expect.objectContaining({ paused: true, reason: lovableCreditPause }) })]);
    expect(mocks.extract.mock.calls[0]![4].geminiOnly).toBe(false);
    expect(mocks.extract.mock.calls[1]![4].geminiOnly).toBe(true);
  });
  it('falha Gemini preserva revisão manual sem sobrescrever a pausa do Lovable', async () => {
    pause = { paused: true, reason: lovableCreditPause };
    mocks.extract.mockRejectedValue(new ExtractionProviderError('gemini', 403, 'Confira manualmente.'));
    await processReviews();
    expect(writes).toContainEqual({ table: 'telegram_reviews', value: { extraction_status: 'erro', error: 'Confira manualmente.' } });
    expect(writes.some(w => w.table === 'telegram_ai_state')).toBe(false);
  });
  it('não lê documento se não conseguir persistir a pausa', async () => {
    pauseError = true;
    mocks.extract.mockImplementation(async (_text, _bytes, _mime, _name, options) => { await options.onLovableCreditsExhausted(); return extracted; });
    await processReviews();
    expect(writes.some(w => w.value['extraction_status'] === 'concluido')).toBe(false);
    expect(writes.some(w => w.value['extraction_status'] === 'erro')).toBe(true);
  });
  it('deixa próximo item aguardando quando o primeiro usa a janela de execução', async () => {
    let now = 0; vi.spyOn(Date, 'now').mockImplementation(() => now);
    rows = [row('one'), row('two')];
    mocks.extract.mockImplementationOnce(async () => { now = 21_000; return extracted; });
    await processReviews();
    expect(mocks.extract).toHaveBeenCalledTimes(1);
    expect(mocks.rpc.mock.calls.filter(([name]) => name === 'telegram_claim')).toHaveLength(1);
    expect(console.info).toHaveBeenCalledWith('telegram_extraction', expect.objectContaining({ stage: 'saved', elapsedMs: 21_000 }));
  });
});
