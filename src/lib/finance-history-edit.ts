type EditValues = { descricao: string; valor: number; data: string; conta: 'dinheiro' | 'alimentacao' | 'refeicao'; categoria: string };

export function historyEditPayload(item: { tipo: string; conta: EditValues['conta']; carteira_id?: string | null; destino?: string }, values: EditValues, moto = false) {
  const base = { descricao: values.descricao.trim(), valor: values.valor, data: values.data };
  if (moto) return { ...base, categoria: values.categoria };
  const canChangeAccount = !item.carteira_id && item.destino !== 'gasolina' && (item.tipo === 'credito' || item.tipo === 'debito');
  return { ...base, conta: canChangeAccount ? values.conta : item.conta, ...(item.tipo === 'debito' ? { categoria: values.categoria } : {}) };
}

export function descendingValues<T extends { valor: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.valor - a.valor);
}