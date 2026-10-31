import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), extract: vi.fn(), send: vi.fn(), download: vi.fn(), upload: vi.fn() }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: mocks.from, rpc: mocks.rpc, storage: { from: () => ({ upload: mocks.upload }) } } }));
vi.mock('@/lib/telegram/extract.server', () => ({ extractDocument: mocks.extract }));
vi.mock('@/lib/telegram/gateway.server', () => ({ telegram: mocks.send, downloadTelegram: mocks.download }));
import { processReviews } from '@/lib/telegram/process.server';
import { ExtractionProviderError } from '@/lib/telegram/extraction-policy.server';

const extracted = { valor: 12, data: '2026-10-30', descricao: 'Teste fictício', documento: 'comprovante', produtos: [] };
const row = (id: string): {id:string;user_id:string;grupo_id:string;chat_id:number;source_text:string;file_id:string|null;mime_type?:string;file_name?:string} => ({ id, user_id: 'test-user', grupo_id: 'test-group', chat_id: 123, source_text: 'fictício', file_id: null });
let rows: ReturnType<typeof row>[];
let writes: { table: string; value: Record<string, unknown> }[];
let filters: unknown[][];
let pathSaveError: boolean;
let extractionSaveMissing: boolean;
beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.clearAllMocks(); vi.stubEnv('OPENAI_API_KEY', 'not-a-real-key');
  rows = [row('one')]; writes = []; filters = []; pathSaveError = false; extractionSaveMissing = false;
  mocks.upload.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ data: true }); mocks.extract.mockResolvedValue(extracted); mocks.send.mockResolvedValue({});
  mocks.from.mockImplementation((table: string) => {
    const query = {
      select: () => query,
      eq: (...args: unknown[]) => { filters.push(args); return query; },
      is: () => query, in: () => query, order: () => query, limit: () => query,
      update: (value: Record<string, unknown>) => { writes.push({ table, value }); return query; },
      maybeSingle: async () => {
        if (table === 'user_access') return { data: { moto: false }, error: null };
        const lastWrite = writes.at(-1)?.value;
        if (lastWrite?.['file_path']) return { data: pathSaveError ? null : { id: 'one' }, error: pathSaveError ? { message: 'failed' } : null };
        if (lastWrite?.['extraction_status'] === 'concluido') return { data: extractionSaveMissing ? null : { id: 'one' }, error: null };
        return { data: null, error: null };
      },
      then: (resolve: (x: unknown) => unknown) => Promise.resolve({ data: table === 'telegram_reviews' ? rows : null, error: null }).then(resolve),
    };
    return query;
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('processamento agendado com OpenAI', () => {
  it('processa a fila sem consultar pausas legadas do provedor Lovable', async () => {
    expect(await processReviews()).toEqual({ paused: false });
    expect(mocks.extract).toHaveBeenCalledWith('fictício', undefined, undefined);
    expect(writes.some(write => write.table === 'telegram_ai_state')).toBe(false);
    expect(writes.some(write => write.value['extraction_status'] === 'concluido')).toBe(true);
    expect(filters).toContainEqual(['extraction_status', 'aguardando']);
    expect(mocks.rpc.mock.calls.every(([name]) => !String(name).includes('action'))).toBe(true);
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
  it('baixa, armazena, extrai e confirma a gravação do PDF antes de notificar', async () => {
    rows = [{ ...row('one'), file_id: 'telegram-file', mime_type: 'application/pdf', file_name: 'teste.pdf' }];
    const pdf = Buffer.from('%PDF-ficticio');
    mocks.download.mockResolvedValue(pdf);
    await processReviews();
    expect(mocks.upload).toHaveBeenCalledWith('test-user/one/documento.pdf', pdf, { contentType: 'application/pdf', upsert: true });
    expect(mocks.extract).toHaveBeenCalledWith('fictício', pdf, 'application/pdf');
    expect(writes).toContainEqual({ table: 'telegram_reviews', value: { file_path: 'test-user/one/documento.pdf' } });
    expect(writes.some(write => write.value['extraction_status'] === 'concluido')).toBe(true);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    for (const stage of ['downloaded', 'stored', 'extracted', 'saved']) {
      expect(console.info).toHaveBeenCalledWith('telegram_extraction', expect.objectContaining({ reviewId: 'one', stage, elapsedMs: expect.any(Number) }));
    }
  });
  it('não extrai nem declara sucesso se falhar ao salvar o caminho do PDF', async () => {
    pathSaveError = true;
    rows = [{ ...row('one'), file_id: 'telegram-file', mime_type: 'application/pdf' }];
    mocks.download.mockResolvedValue(Buffer.from('%PDF-ficticio'));
    await processReviews();
    expect(mocks.extract).not.toHaveBeenCalled();
    expect(writes.some(write => write.value['extraction_status'] === 'concluido')).toBe(false);
    expect(writes).toContainEqual({ table: 'telegram_reviews', value: expect.objectContaining({ extraction_status: 'erro' }) });
  });
  it('não notifica sucesso se a atualização condicional não encontrou a revisão', async () => {
    extractionSaveMissing = true;
    await processReviews();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith('telegram_extraction', expect.objectContaining({ reviewId: 'one', stage: 'save_skipped' }));
    expect(writes.some(write => write.value['extraction_status'] === 'erro')).toBe(false);
  });
  it('mantém extração concluída mesmo se o Telegram não entregar a notificação', async () => {
    mocks.send.mockRejectedValue(new Error('telegram unavailable'));
    await processReviews();
    expect(writes.some(write => write.value['extraction_status'] === 'concluido')).toBe(true);
    expect(writes.some(write => write.value['extraction_status'] === 'erro')).toBe(false);
    expect(console.info).toHaveBeenCalledWith('telegram_extraction', expect.objectContaining({ reviewId: 'one', stage: 'notification_failed' }));
  });
  it('registra timeout OpenAI como diagnóstico estável sem expor a mensagem do provedor', async () => {
    mocks.extract.mockRejectedValue(new ExtractionProviderError('openai', undefined, 'A OpenAI ultrapassou o limite de 60 segundos.', 'timeout'));
    await processReviews();
    expect(console.info).toHaveBeenCalledWith('telegram_extraction', expect.objectContaining({
      reviewId: 'one', stage: 'failed', errorKind: 'openai_timeout', statusCode: undefined,
    }));
    expect(writes).toContainEqual({ table: 'telegram_reviews', value: { extraction_status: 'erro', error: 'A OpenAI ultrapassou o limite de 60 segundos.' } });
  });
});

