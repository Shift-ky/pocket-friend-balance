export type LancamentoPainel = { id: string; tipo: 'credito' | 'debito' | 'aplicacao' | 'resgate'; descricao: string; valor: number; data: string; pago: boolean; conta: 'dinheiro' | 'alimentacao' | 'refeicao'; destino?: string };
export const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function saldosPainel(itens: LancamentoPainel[]) {
  const soma = (tipo: string, conta?: string) => itens.filter(i => i.tipo === tipo && (!conta || (i.conta ?? 'dinheiro') === conta) && (tipo !== 'debito' || i.pago)).reduce((s, i) => s + Number(i.valor), 0);
  const guardado = soma('aplicacao') - soma('resgate');
  return { disponivel: soma('credito', 'dinheiro') - soma('debito', 'dinheiro') - guardado, guardado, alimentacao: soma('credito', 'alimentacao') - soma('debito', 'alimentacao'), refeicao: soma('credito', 'refeicao') - soma('debito', 'refeicao') };
}
