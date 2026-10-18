import { addMonths, format, parseISO } from 'date-fns';

type Base = { tipo: string; conta: string; destino?: string; descricao: string; valor: number; data: string; pago: boolean };

export function parcelarLancamento<T extends Base>(base: T, quantidade: number): T[] {
  if (base.tipo !== 'debito' || base.conta !== 'dinheiro' || base.destino === 'gasolina') return [base];
  const centavos = Math.round(base.valor * 100);
  if (!Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > centavos) {
    throw new Error('Informe uma quantidade inteira de parcelas, com pelo menos R$ 0,01 por parcela.');
  }
  const inicio = parseISO(base.data);
  if (Number.isNaN(inicio.getTime())) throw new Error('Informe uma data válida.');
  const valorBase = Math.floor(centavos / quantidade);
  const resto = centavos % quantidade;
  return Array.from({ length: quantidade }, (_, i) => ({
    ...base,
    descricao: quantidade > 1 ? `${base.descricao} (${i + 1}/${quantidade})` : base.descricao,
    valor: (valorBase + (i < resto ? 1 : 0)) / 100,
    data: format(addMonths(inicio, i), 'yyyy-MM-dd'),
    pago: base.pago,
  }));
}