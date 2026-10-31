export type Row = { id?: unknown; grupo_id?: unknown; created_at?: unknown } & Record<string, unknown>;
export type Command = { table: string; action: 'insert' | 'update' | 'delete' | 'order'; rows?: Row[]; ids?: string[]; patch?: Row; before?: Row[] };
export type Operation = { id: string; commands: Command[]; error?: string; blocked?: boolean };
export type LocalState = { tables: Record<string, Row[]>; queue: Operation[] };
export const OFFLINE_TABLES = ['lancamentos', 'moto_despesas', 'feira_itens', 'feira_historico', 'estoque', 'estoque_divisoes', 'despesas', 'contas_fixas', 'carteiras', 'metas'] as const;

export function applyCommand(tables: LocalState['tables'], command: Command) {
  const rows = tables[command.table] ?? [];
  const ids = new Set(command.ids ?? []);
  if (command.action === 'insert') {
    const incoming = command.rows ?? [];
    tables[command.table] = [...rows.filter(r => !incoming.some(n => n.id === r.id)), ...incoming];
  } else if (command.action === 'update') {
    tables[command.table] = rows.map(r => ids.has(String(r.id)) ? { ...r, ...command.patch } : r);
  } else if (command.action === 'delete') {
    tables[command.table] = rows.filter(r => !ids.has(String(r.id)));
  } else {
    tables[command.table] = rows.map(r => {
      const position = (command.ids ?? []).indexOf(String(r.id));
      return position < 0 ? r : { ...r, ordem: position + 1 };
    });
  }
}

export function matches(row: Row, filters: { method: string; args: unknown[] }[]) {
  return filters.every(({ method, args }) => {
    const value = row[String(args[0])];
    return method === 'eq' ? value === args[1] : method === 'neq' ? value !== args[1] : method === 'in' ? Array.isArray(args[1]) && args[1].includes(value) : true;
  });
}

export function swRefused(production: boolean, framed: boolean, hostname: string, search: string) {
  return !production || framed || /^(id-preview--|preview--)/.test(hostname) ||
    ['lovableproject.com', 'lovableproject-dev.com', 'beta.lovable.dev'].some(domain => hostname === domain || hostname.endsWith(`.${domain}`)) || new URLSearchParams(search).get('sw') === 'off';
}