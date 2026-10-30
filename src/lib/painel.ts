export type LancamentoPainel = { id: string; tipo: 'credito' | 'debito' | 'aplicacao' | 'resgate'; descricao: string; valor: number; data: string; pago: boolean; conta: 'dinheiro' | 'alimentacao' | 'refeicao'; destino?: string; origem_modulo?: string; criado_por?: string | null; created_at?: string };
export const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
type RegistroHistorico = { data?: string | undefined; created_at?: string | undefined };
export function dataLancamento(item: RegistroHistorico): string {
  if (item.created_at && Number.isFinite(Date.parse(item.created_at))) {
    const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(item.created_at));
    const parte = (tipo: string) => partes.find(p => p.type === tipo)?.value ?? '';
    return `${parte('year')}-${parte('month')}-${parte('day')}`;
  }
  return item.data?.slice(0, 10) ?? '';
}
export function historicoPorMes<T extends RegistroHistorico>(itens: T[], mes = ''): T[] {
  const instante = (item: T) => Date.parse(item.created_at ?? '') || Date.parse(`${item.data?.slice(0, 10)}T00:00:00-03:00`) || 0;
  return itens.filter(item => !mes || dataLancamento(item).slice(0, 7) === mes)
    .sort((a, b) => instante(b) - instante(a));
}
export function ordenarPorVencimento<T extends { data: string }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => a.data.localeCompare(b.data));
}
export function separarPendencias<T extends { data: string }>(itens: T[], hoje = new Date()) {
  const mes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  return { atuais: itens.filter(i => i.data.slice(0, 7) <= mes), futuras: itens.filter(i => i.data.slice(0, 7) > mes) };
}
export function pendenciasDoMes(itens: LancamentoPainel[], hoje = new Date()) {
  const mes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  return itens.filter(i => i.tipo === 'debito' && !i.pago && i.data.slice(0, 7) === mes)
    .reduce((total, i) => total + Number(i.valor), 0);
}
export function saldosPainel(itens: LancamentoPainel[]) {
  const soma = (tipo: string, conta?: string) => itens.filter(i => i.tipo === tipo && (!conta || (i.conta ?? 'dinheiro') === conta) && (tipo !== 'debito' || i.pago)).reduce((s, i) => s + Number(i.valor), 0);
  const guardado = soma('aplicacao') - soma('resgate');
  return { disponivel: soma('credito', 'dinheiro') - soma('debito', 'dinheiro') - guardado, guardado, alimentacao: soma('credito', 'alimentacao') - soma('debito', 'alimentacao'), refeicao: soma('credito', 'refeicao') - soma('debito', 'refeicao') };
}
export type MovimentoKpi = { data: string; valor: number; entrada: boolean; pendente: boolean };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function kpisPainel(movs: MovimentoKpi[], hoje = new Date()) {
  const mes = iso(hoje).slice(0, 7); const inicio = iso(hoje);
  const limite = new Date(hoje); limite.setDate(limite.getDate() + 7); const fim = iso(limite);
  const doMes = movs.filter(m => m.data.slice(0, 7) === mes);
  const vencer = movs.filter(m => m.pendente && m.data.slice(0, 10) >= inicio && m.data.slice(0, 10) <= fim);
  return {
    entradasMes: doMes.filter(m => m.entrada).reduce((s, m) => s + m.valor, 0),
    saidasPagasMes: doMes.filter(m => !m.entrada && !m.pendente).reduce((s, m) => s + m.valor, 0),
    aVencer7: vencer.reduce((s, m) => s + m.valor, 0), qtdAVencer7: vencer.length,
  };
}
export function fluxoMensal(movs: MovimentoKpi[], meses = 6) {
  const chaves = [...new Set(movs.map(m => m.data.slice(0, 7)))].sort().slice(-meses);
  return chaves.map(m => ({ mes: m, entradas: movs.filter(x => x.data.startsWith(m) && x.entrada).reduce((s, x) => s + x.valor, 0), saidas: movs.filter(x => x.data.startsWith(m) && !x.entrada && !x.pendente).reduce((s, x) => s + x.valor, 0) }));
}
