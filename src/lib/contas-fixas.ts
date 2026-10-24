export type ContaFixa = {
  id: string; grupo_id: string; descricao: string; modalidade: 'credito' | 'debito' | 'gasolina';
  conta: 'dinheiro' | 'alimentacao' | 'refeicao'; valor: number; dia: number; inicio: string; fim: string | null; ativa: boolean;
};
export const carteirasFixas = { dinheiro: 'Dinheiro', alimentacao: 'Alimentação', refeicao: 'Refeição' } as const;
export function dataMensal(mes: string, dia: number) {
  const ano = Number(mes.slice(0, 4));
  const numeroMes = Number(mes.slice(5, 7));
  const ultimo = new Date(ano, numeroMes, 0).getDate();
  return `${mes.slice(0, 7)}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`;
}
export function ocorrenciasFixas(fixa: Pick<ContaFixa, 'inicio' | 'fim' | 'dia' | 'ativa'>, ate: string) {
  if (!fixa.ativa) return [];
  const limite = fixa.fim && fixa.fim < ate ? fixa.fim : ate;
  const datas: string[] = [];
  let mes = fixa.inicio.slice(0, 7);
  while (mes <= limite.slice(0, 7)) {
    const data = dataMensal(mes, fixa.dia);
    if (data >= fixa.inicio && data <= limite) datas.push(data);
    const ano = Number(mes.slice(0, 4));
    const numeroMes = Number(mes.slice(5, 7));
    mes = numeroMes === 12 ? `${ano + 1}-01` : `${ano}-${String(numeroMes + 1).padStart(2, '0')}`;
  }
  return datas;
}
export function validarFixa(fixa: Omit<ContaFixa, 'id' | 'grupo_id'>) {
  if (!fixa.descricao.trim()) return 'Informe a descrição.';
  if (!Number.isFinite(fixa.valor) || fixa.valor <= 0) return 'Informe um valor maior que zero.';
  if (!Number.isInteger(fixa.dia) || fixa.dia < 1 || fixa.dia > 31) return 'Escolha um dia entre 1 e 31.';
  if (!fixa.inicio || fixa.inicio < '2000-01-01') return 'Informe uma data inicial a partir de 2000.';
  if (fixa.fim !== null && (!fixa.fim || fixa.fim < fixa.inicio)) return 'A data final deve ser igual ou posterior ao início.';
  if (fixa.modalidade === 'gasolina' && fixa.conta !== 'dinheiro') return 'O aporte da Moto deve usar Dinheiro.';
  return '';
}