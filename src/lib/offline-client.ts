import { supabase as remote } from '@/integrations/supabase/client';
import { applyCommand, matches, OFFLINE_TABLES, type Command, type LocalState, type Row, type Operation } from './offline-model';
import { loadState, saveState } from './offline-store';

type Scope = { user: string; group: string; state: LocalState };
let scope: Scope | undefined;
let serial: Promise<unknown> = Promise.resolve();
let syncing: Promise<void> | undefined;
let refreshing: Promise<void> | undefined;
let batch: Command[] | undefined;
type Status = { online: boolean; pending: number; syncing: boolean; error: string };
let status: Status = { online: true, pending: 0, syncing: false, error: '' };
const listeners = new Set<() => void>();
export const subscribeOffline = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const offlineStatus = () => status;
function emit() {
  status = { online: navigator.onLine, pending: scope?.state.queue.length ?? 0, syncing: !!syncing, error: scope?.state.queue[0]?.error ?? '' };
  listeners.forEach(fn => fn());
  window.dispatchEvent(new Event('offline-data'));
}
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = serial.then(fn, fn); serial = run.catch(() => undefined); return run;
}
export async function openOffline(user: string, group: string) {
  await exclusive(async () => { scope = { user, group, state: await loadState(user, group) }; });
  emit();
  if (navigator.onLine) await syncOffline();
}
export function closeOffline() { scope = undefined; emit(); }
async function persist(s: Scope) { await saveState(s.user, s.group, s.state); }

async function refreshData() {
  const s = scope;
  if (!s || !navigator.onLine) return;
  const results = await Promise.all(OFFLINE_TABLES.map(async table => {
    const { data, error } = await remote.from(table).select('*').eq('grupo_id', s.group).order('created_at');
    return { table, data, error };
  }));
  await exclusive(async () => {
    if (scope !== s) return;
    for (const r of results) if (!r.error) s.state.tables[r.table] = r.data as unknown as Row[];
    // Pending writes remain local until the server acknowledges their transaction.
    for (const operation of s.state.queue) for (const command of operation.commands) applyCommand(s.state.tables, command);
    await persist(s);
  });
  emit();
}
export async function refreshOffline() {
  if (refreshing) return refreshing;
  refreshing = refreshData().finally(() => { refreshing = undefined; });
  return refreshing;
}

export async function syncOffline() {
  if (syncing) return syncing;
  if (!scope || !navigator.onLine) { emit(); return; }
  const s = scope;
  const work = async () => {
    await refreshOffline();
    while (scope === s && navigator.onLine) {
      const op = s.state.queue[0];
      if (!op) break;
      const { error } = await remote.rpc('sync_offline_operation', { _id: op.id, _grupo_id: s.group, _commands: op.commands as never });
      if (scope !== s) break;
      if (error) {
        await exclusive(async () => { op.error = navigator.onLine ? error.message : ''; await persist(s); });
        break;
      }
      await exclusive(async () => { s.state.queue = s.state.queue.filter(o => o.id !== op.id); await persist(s); });
    }
    await refreshOffline();
  };
  syncing = work().finally(() => { syncing = undefined; emit(); });
  emit(); return syncing;
}

export async function discardPending() {
  const s = scope;
  if (!s || syncing || !navigator.onLine) return;
  await exclusive(async () => { s.state.queue.shift(); await persist(s); });
  await refreshOffline(); await syncOffline();
}

async function enqueue(commands: Command[]) {
  await exclusive(async () => {
    const s = scope;
    if (!s) throw new Error('Entre na sua conta para salvar.');
    const next = structuredClone(s.state);
    const op: Operation = { id: crypto.randomUUID(), commands };
    next.queue.push(op);
    for (const c of commands) applyCommand(next.tables, c);
    // Persist before showing success; never fall back to memory on quota failure.
    await saveState(s.user, s.group, next);
    s.state = next;
  });
  emit();
  if (navigator.onLine) void syncOffline();
}

export async function offlineTransaction<T>(action: () => Promise<T>): Promise<T> {
  if (!scope) return action();
  if (batch) throw new Error('Aguarde o salvamento anterior.');
  batch = [];
  try {
    const result = await action();
    const commands = batch;
    batch = undefined;
    if (commands.length) await enqueue(commands);
    return result;
  } finally { batch = undefined; }
}

type Call = { method: string; args: unknown[] };
function localRows(table: string) {
  const tables = structuredClone(scope?.state.tables ?? {});
  for (const c of batch ?? []) applyCommand(tables, c);
  return tables[table] ?? [];
}
async function execute(table: string, calls: Call[]) {
  try {
    const s = scope;
    if (!s) throw new Error('Dados locais indisponíveis.');
    const filters = calls.filter(c => ['eq', 'neq', 'in'].includes(c.method));
    const mutation = calls.find(c => ['insert', 'update', 'delete'].includes(c.method));
    const select = calls.find(c => c.method === 'select');
    let rows: Row[];
    if (mutation) {
      const current = localRows(table).filter(r => matches(r, filters));
      let cmd: Command;
      if (mutation.method === 'insert') {
        const input = Array.isArray(mutation.args[0]) ? mutation.args[0] : [mutation.args[0]];
        const defaults: Record<string, Row> = { lancamentos: { pago: false, conta: 'dinheiro', destino: 'geral', origem_modulo: 'financas' }, feira_itens: { qtd: 1, preco: 0, pego: false }, feira_historico: { pagamento: 'nenhum', lancamento_id: null }, estoque: { qtd: 0, padrao: 1, divisao_id: null, ordem: null } };
        rows = input.map(value => ({ ...defaults[table], ...value as Row, id: (value as Row).id ?? crypto.randomUUID(), created_at: (value as Row).created_at ?? new Date().toISOString() }));
        if (rows.some(r => r.grupo_id !== s.group)) throw new Error('Grupo inválido.');
        cmd = { table, action: 'insert', rows };
      } else {
        if (!filters.some(c => ['id', 'grupo_id'].includes(String(c.args[0])))) throw new Error('Filtro obrigatório.');
        const patch = mutation.args[0] as Row;
        rows = mutation.method === 'delete' ? current : current.map(r => ({ ...r, ...patch }));
        cmd = { table, action: mutation.method as 'update' | 'delete', ids: current.map(r => String(r.id)), before: current, ...(mutation.method === 'update' ? { patch } : {}) };
      }
      if (batch) batch.push(cmd); else await enqueue([cmd]);
    } else {
      if (!s.state.tables[table]) {
        if (!navigator.onLine) throw new Error('Conecte uma vez para carregar estes dados no aparelho.');
        await refreshOffline();
      }
      rows = localRows(table).filter(r => matches(r, filters));
    }
    for (const c of calls.filter(c => c.method === 'order')) {
      const field = String(c.args[0]); const asc = (c.args[1] as { ascending?: boolean } | undefined)?.ascending !== false;
      rows.sort((a, b) => String(a[field] ?? '').localeCompare(String(b[field] ?? '')) * (asc ? 1 : -1));
    }
    const limit = calls.find(c => c.method === 'limit'); if (limit) rows = rows.slice(0, Number(limit.args[0]));
    if (select && select.args[0] && select.args[0] !== '*') {
      const fields = String(select.args[0]).split(',').map(f => f.trim());
      rows = rows.map(r => Object.fromEntries(fields.map(f => [f, r[f]])));
    }
    const single = calls.some(c => c.method === 'single'); const maybe = calls.some(c => c.method === 'maybeSingle');
    if ((single && rows.length !== 1) || (maybe && rows.length > 1)) throw new Error('Registro indisponível.');
    return { data: mutation && !select ? null : single || maybe ? rows[0] ?? null : rows, error: null, count: rows.length };
  } catch (error) { return { data: null, error: { message: error instanceof Error ? error.message : 'Não foi possível salvar no aparelho.' }, count: 0 }; }
}

function builder(table: string, calls: Call[] = []): unknown {
  let promise: ReturnType<typeof execute> | undefined;
  return new Proxy({}, { get: (_, method: string) => {
    if (method === 'then') return (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => (promise ??= execute(table, calls)).then(resolve, reject);
    return (...args: unknown[]) => builder(table, [...calls, { method, args }]);
  } });
}

// Keep the generated client intact; only group-owned application CRUD uses the journal.
export const supabase: typeof remote = new Proxy(remote, { get(target, prop) {
  if (prop === 'from') return (table: string) => scope && OFFLINE_TABLES.includes(table as typeof OFFLINE_TABLES[number]) ? builder(table) : target.from(table as typeof OFFLINE_TABLES[number]);
  if (prop === 'rpc') return (name: string, args: Record<string, unknown>) => {
    if (scope && name === 'ordenar_estoque') return enqueue([{ table: 'estoque', action: 'order', ids: args['_ids'] as string[] }]).then(() => ({ data: null, error: null })).catch(() => ({ data: null, error: { message: 'Não foi possível guardar a ordem.' } }));
    return target.rpc(name as 'ordenar_estoque', args as never);
  };
  const value = Reflect.get(target, prop); return typeof value === 'function' ? value.bind(target) : value;
} });