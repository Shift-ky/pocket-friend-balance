export const ORDEM_PADRAO_PAINEL = ['patrimonio', 'financeiro', 'beneficios', 'poupanca'] as const;
export type CartaoPainelId = (typeof ORDEM_PADRAO_PAINEL)[number];

export function normalizarOrdemPainel(valor: unknown): CartaoPainelId[] {
  const validos = new Set<string>(ORDEM_PADRAO_PAINEL);
  const presentes = Array.isArray(valor) ? valor.filter((id): id is CartaoPainelId => typeof id === 'string' && validos.has(id)) : [];
  return [...new Set(presentes), ...ORDEM_PADRAO_PAINEL.filter(id => !presentes.includes(id))];
}

export function moverCartaoPainel(ids: CartaoPainelId[], id: CartaoPainelId, deslocamento: -1 | 1): CartaoPainelId[] {
  const origem = ids.indexOf(id);
  const destino = Math.max(0, Math.min(ids.length - 1, origem + deslocamento));
  if (origem < 0 || origem === destino) return ids;
  const proxima = [...ids];
  proxima.splice(origem, 1);
  proxima.splice(destino, 0, id);
  return proxima;
}

export function moverCartaoPainelPara(ids: CartaoPainelId[], ativo: CartaoPainelId, destinoId: CartaoPainelId): CartaoPainelId[] {
  const origem = ids.indexOf(ativo);
  const destino = ids.indexOf(destinoId);
  if (origem < 0 || destino < 0 || origem === destino) return ids;
  const proxima = [...ids];
  proxima.splice(origem, 1);
  proxima.splice(destino, 0, ativo);
  return proxima;
}
