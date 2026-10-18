import { moverProduto } from '@/lib/ordem-estoque';

export type DivisaoEstoque = { id: string; nome: string };
export function agruparEstoque<T extends { divisao_id?: string | null }>(produtos: T[], divisoes: DivisaoEstoque[]) {
  return [
    ...[...divisoes].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(d => ({ ...d, produtos: produtos.filter(p => p.divisao_id === d.id) })),
    { id: '', nome: 'Sem divisão', produtos: produtos.filter(p => !divisoes.some(d => d.id === p.divisao_id)) },
  ];
}

export function moverNaDivisao<T extends { id: string; divisao_id?: string | null }>(produtos: T[], ativo: string, destino: string) {
  const origem = produtos.find(p => p.id === ativo);
  const alvo = produtos.find(p => p.id === destino);
  if (!origem || !alvo || (origem.divisao_id ?? null) !== (alvo.divisao_id ?? null)) return produtos.map(p => p.id);
  const ids = produtos.filter(p => (p.divisao_id ?? null) === (origem.divisao_id ?? null)).map(p => p.id);
  const novos = moverProduto(ids, ativo, destino);
  let i = 0;
  return produtos.map(p => ids.includes(p.id) ? novos[i++] ?? p.id : p.id);
}