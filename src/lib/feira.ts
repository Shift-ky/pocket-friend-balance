export type ItemCesta = { nome?: string; qtd: number; qtd_comprada: number; preco: number; pego: boolean };

/** Valor total da lista pela quantidade prevista. */
export function valorPrevisto(itens: ItemCesta[]) {
  return itens.reduce((s, i) => s + i.qtd * i.preco, 0);
}

/** Valor do carrinho: somente a quantidade efetivamente comprada. */
export function valorCarrinho(itens: ItemCesta[]) {
  return itens.reduce((s, i) => s + i.qtd_comprada * i.preco, 0);
}

/** Ao marcar o checkbox, a quantidade comprada vira a previsão; ao desmarcar, volta a zero. */
export function alternarPego(item: ItemCesta): { pego: boolean; qtd_comprada: number } {
  return item.pego ? { pego: false, qtd_comprada: 0 } : { pego: true, qtd_comprada: item.qtd };
}

/** Quantidade comprada maior ou igual à previsão marca o checkbox automaticamente. */
export function definirComprada(item: ItemCesta, comprada: number): { qtd_comprada: number; pego: boolean } {
  const q = Number.isFinite(comprada) && comprada > 0 ? comprada : 0;
  return { qtd_comprada: q, pego: q > 0 && q >= item.qtd };
}

/** Somente produtos comprados (quantidade comprada maior que zero) vão para o histórico, com a quantidade comprada. */
export function itensComprados(itens: ItemCesta[]) {
  return itens.filter((i) => i.qtd_comprada > 0).map((i) => ({ nome: (i.nome ?? "").trim(), qtd: i.qtd_comprada, preco: i.preco, pego: true }));
}

/** Preserve untouched deficits; stock triggers reconcile quantities after a paid purchase. */
export function prepararListaAposCompra(itens: (ItemCesta & { id: string })[], paga: boolean) {
  const remover = itens.filter(i => paga && i.qtd_comprada > 0 && i.qtd_comprada >= i.qtd).map(i => i.id);
  const reiniciar = itens.filter(i => i.qtd_comprada > 0 && !remover.includes(i.id)).map(i => i.id);
  return { remover, reiniciar };
}
