export const MODULES = ['financas', 'moto', 'feira', 'estoque'] as const;
export type Module = typeof MODULES[number];
export type Access = Record<Module, boolean>;
export const ALL_ACCESS: Access = { financas: true, moto: true, feira: true, estoque: true };
export const NO_ACCESS: Access = { financas: false, moto: false, feira: false, estoque: false };
export const MODULE_LABELS: Record<Module, string> = { financas: 'Finanças', moto: 'Moto', feira: 'Feira', estoque: 'Estoque' };
export function visibleEntries<T extends { destino?: string }>(rows: T[], access: Access): T[] {
  return rows.filter(row => row.destino === 'gasolina' ? access.moto : access.financas);
}
export function moduleForTable(table: string): Module {
  return table === 'moto_despesas' ? 'moto' : table === 'estoque' ? 'estoque' : table.startsWith('feira_') ? 'feira' : 'financas';
}