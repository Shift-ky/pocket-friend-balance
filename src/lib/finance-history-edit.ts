import { contaLegada, type Carteira, type Meta } from './carteiras';
type EditValues = { descricao: string; valor: number; data: string; conta: 'dinheiro' | 'alimentacao' | 'refeicao'; categoria: string };

export function telegramWalletOptions(wallets: Carteira[], goals: Meta[], currentId?: string | null, receipt = false) {
  return wallets.filter(w => w.id === currentId || (w.moeda === 'BRL' && w.legado !== 'gasolina' && !goals.some(m => m.carteira_id === w.id) && (!receipt || w.na_feira)));
}

export function historyEditPayload(item: { tipo: string; conta: EditValues['conta']; carteira_id?: string | null; destino?: string }, values: EditValues, moto = false, wallet?: Carteira) {
  const base = { descricao: values.descricao.trim(), valor: values.valor, data: values.data };
  if (moto) return { ...base, categoria: values.categoria };
  const canChangeAccount = !item.carteira_id && item.destino !== 'gasolina' && (item.tipo === 'credito' || item.tipo === 'debito');
  return { ...base, ...(wallet ? { conta: contaLegada(wallet), carteira_id: wallet.id } : { conta: canChangeAccount ? values.conta : item.conta }), ...(item.tipo === 'debito' ? { categoria: values.categoria } : {}) };
}

export function descendingValues<T extends { valor: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.valor - a.valor);
}