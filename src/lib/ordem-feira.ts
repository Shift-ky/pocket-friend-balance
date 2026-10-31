export type ItemOrdenavelFeira = { id: string; ordem?: number | null; created_at?: string | null };

export function ordenarItensFeira<T extends ItemOrdenavelFeira>(itens: T[]): T[] {
  return [...itens].sort((a, b) => {
    if (a.ordem != null && b.ordem != null && a.ordem !== b.ordem) return a.ordem - b.ordem;
    if (a.ordem != null && b.ordem == null) return -1;
    if (a.ordem == null && b.ordem != null) return 1;
    return (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.id.localeCompare(b.id);
  });
}

export function moverItemFeira(ids: string[], id: string, deslocamento: -1 | 1): string[] {
  const origem = ids.indexOf(id);
  const destino = Math.max(0, Math.min(ids.length - 1, origem + deslocamento));
  if (origem < 0 || destino === origem) return ids;
  const nova = [...ids];
  nova.splice(origem, 1);
  nova.splice(destino, 0, id);
  return nova;
}
