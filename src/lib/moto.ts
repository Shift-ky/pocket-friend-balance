export type AporteGasolina = { destino?: string; valor: number; pago: boolean; conta?: string };
export type DespesaMoto = { id: string; descricao: string; valor: number; data: string; conta: string };

export function totaisMoto(aportes: AporteGasolina[], despesas: Pick<DespesaMoto, "valor">[]) {
  const reservado = aportes.filter((a) => a.destino === "gasolina" && a.pago && a.conta === "dinheiro").reduce((s, a) => s + Number(a.valor), 0);
  const gasto = despesas.reduce((s, d) => s + Number(d.valor), 0);
  return { reservado, gasto, saldo: reservado - gasto };
}

export function movimentacaoGasolina(valor: number) {
  return { tipo: "debito", destino: "gasolina", conta: "dinheiro", pago: true, valor };
}