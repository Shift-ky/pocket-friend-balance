export function ordenarEstoque<T extends { id: string; nome: string; ordem?: number | null }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => {
    if (a.ordem != null && b.ordem != null && a.ordem !== b.ordem) return a.ordem - b.ordem;
    if (a.ordem != null && b.ordem == null) return -1;
    if (a.ordem == null && b.ordem != null) return 1;
    return a.nome.localeCompare(b.nome, 'pt-BR') || a.id.localeCompare(b.id);
  });
}

export function moverProduto(ids: string[], ativo: string, destino: string): string[] {
  const origem = ids.indexOf(ativo);
  const alvo = ids.indexOf(destino);
  if (origem < 0 || alvo < 0 || origem === alvo) return ids;
  const nova = [...ids];
  nova.splice(origem, 1);
  nova.splice(alvo, 0, ativo);
  return nova;
}