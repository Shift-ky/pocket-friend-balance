import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyCommand, swRefused, type LocalState } from '@/lib/offline-model';
import { scopeKey } from '@/lib/offline-store';

const mocks = vi.hoisted(() => ({ data: new Map<string, LocalState>(), rpc: vi.fn() }));
vi.mock('@/lib/offline-store', () => ({
  scopeKey: (u: string, g: string) => `data:${u}:${g}`,
  loadState: async (u: string, g: string) => structuredClone(mocks.data.get(`${u}:${g}`) ?? { tables: {}, queue: [] }),
  saveState: async (u: string, g: string, value: LocalState) => { mocks.data.set(`${u}:${g}`, structuredClone(value)); },
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) }),
} }));
import { closeOffline, offlineTransaction, openOffline, supabase, syncOffline } from '@/lib/offline-client';

beforeEach(() => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  closeOffline(); mocks.data.clear(); mocks.rpc.mockReset();
});
describe('durable offline changes', () => {
  it('stores the financial amount and payment state before returning success', async () => {
    await openOffline('user', 'group');
    const result = await supabase.from('lancamentos').insert({ grupo_id: 'group', tipo: 'debito', descricao: 'Conta', valor: 12.34, pago: false, data: '2026-10-19' });
    expect(result.error).toBeNull();
    expect(mocks.data.get('user:group')?.queue[0]?.commands[0]?.rows?.[0]).toMatchObject({ valor: 12.34, pago: false });
  });
  it('restores unsent rows after the account scope is reopened', async () => {
    await openOffline('user', 'group');
    await supabase.from('feira_itens').insert({ grupo_id: 'group', nome: 'Arroz', qtd: 2, preco: 7.25 });
    closeOffline(); await openOffline('user', 'group');
    const { data } = await supabase.from('feira_itens').select('*').eq('grupo_id', 'group');
    expect(data?.[0]).toMatchObject({ nome: 'Arroz', qtd: 2, preco: 7.25 });
  });
  it('never reads a different account or group cache', async () => {
    expect(scopeKey('a', 'g')).not.toBe(scopeKey('b', 'g'));
    expect(scopeKey('a', 'g')).not.toBe(scopeKey('a', 'h'));
    await openOffline('a', 'g');
    await supabase.from('feira_itens').insert({ grupo_id: 'g', nome: 'Privado' });
    closeOffline(); await openOffline('b', 'g');
    const { data, error } = await supabase.from('feira_itens').select('*');
    expect(data).toBeNull(); expect(error).not.toBeNull();
  });
  it('groups dependent finance and purchase changes into one operation', async () => {
    await openOffline('user', 'group');
    await offlineTransaction(async () => {
      const { data } = await supabase.from('lancamentos').insert({ grupo_id: 'group', tipo: 'debito', descricao: 'Feira', valor: 10, pago: true }).select('id').single();
      await supabase.from('feira_historico').insert({ grupo_id: 'group', total: 10, pagamento: 'dinheiro', lancamento_id: data?.id });
    });
    const queue = mocks.data.get('user:group')?.queue;
    expect(queue).toHaveLength(1); expect(queue?.[0]?.commands).toHaveLength(2);
    expect(queue?.[0]?.commands[1]?.rows?.[0]?.['lancamento_id']).toBe(queue?.[0]?.commands[0]?.rows?.[0]?.id);
  });
  it('does not persist a partial transaction when a later step fails', async () => {
    await openOffline('user', 'group');
    await expect(offlineTransaction(async () => {
      await supabase.from('feira_itens').insert({ grupo_id: 'group', nome: 'Arroz' });
      throw new Error('failed');
    })).rejects.toThrow('failed');
    expect(mocks.data.get('user:group')?.queue ?? []).toHaveLength(0);
  });
  it('retries with the same operation ID after an ambiguous network failure', async () => {
    await openOffline('user', 'group');
    await supabase.from('moto_despesas').insert({ grupo_id: 'group', descricao: 'Posto', valor: 20, conta: 'dinheiro' });
    const id = mocks.data.get('user:group')?.queue[0]?.id;
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    mocks.rpc.mockResolvedValueOnce({ error: { message: 'Network failed', code: '' } }).mockResolvedValueOnce({ error: null });
    await syncOffline(); await syncOffline();
    expect(mocks.rpc.mock.calls[0]?.[1]._id).toBe(id);
    expect(mocks.rpc.mock.calls[1]?.[1]._id).toBe(id);
    expect(mocks.data.get('user:group')?.queue).toHaveLength(0);
  });
  it('keeps rejected changes instead of claiming they synchronized', async () => {
    await openOffline('user', 'group');
    await supabase.from('feira_itens').insert({ grupo_id: 'group', nome: 'Arroz' });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    mocks.rpc.mockResolvedValue({ error: { code: '42501', message: 'Acesso removido' } });
    await syncOffline(); await syncOffline();
    expect(mocks.data.get('user:group')?.queue[0]).toMatchObject({ error: 'Acesso removido', blocked: true });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it('does not duplicate local rows when pending operations are overlaid twice', () => {
    const tables = {};
    const command = { table: 'feira_itens', action: 'insert' as const, rows: [{ id: 'one', nome: 'Arroz' }] };
    applyCommand(tables, command); applyCommand(tables, command);
    expect(tables).toEqual({ feira_itens: [{ id: 'one', nome: 'Arroz' }] });
  });
});
describe('PWA preview protection', () => {
  it('refuses development, iframe, preview hosts and the kill switch', () => {
    expect(swRefused(false, false, 'app.example', '')).toBe(true);
    expect(swRefused(true, true, 'app.example', '')).toBe(true);
    for (const host of ['id-preview--a.lovable.app', 'preview--a.test', 'a.lovableproject.com', 'lovableproject-dev.com', 'a.beta.lovable.dev']) expect(swRefused(true, false, host, '')).toBe(true);
    expect(swRefused(true, false, 'app.example', '?sw=off')).toBe(true);
  });
  it('allows the published app outside preview', () => {
    expect(swRefused(true, false, 'pocket-friend-balance.lovable.app', '')).toBe(false);
  });
});