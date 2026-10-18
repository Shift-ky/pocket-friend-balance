import { describe, expect, it } from 'vitest';
import { parcelarLancamento } from '@/lib/parcelamento';

const base = { tipo: 'debito', conta: 'dinheiro', descricao: 'Conta', valor: 100, data: '2026-10-16', pago: false };
describe('Parcelamento em dinheiro', () => {
  it('distribui o total por meses consecutivos e mantém as parcelas pendentes', () => {
    const parcelas = parcelarLancamento(base, 3);
    expect(parcelas.map(p => p.data)).toEqual(['2026-10-16', '2026-11-16', '2026-12-16']);
    expect(parcelas.map(p => p.valor)).toEqual([33.34, 33.33, 33.33]);
    expect(parcelas.map(p => p.pago)).toEqual([false, false, false]);
    expect(parcelas.map(p => p.descricao)).toEqual(['Conta (1/3)', 'Conta (2/3)', 'Conta (3/3)']);
  });
  it('ajusta o dia para meses curtos sem alterar as datas seguintes', () => {
    expect(parcelarLancamento({ ...base, data: '2027-01-31' }, 3).map(p => p.data)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31']);
  });
  it('mantém uma conta já paga ao lançar sem parcelamento', () => {
    expect(parcelarLancamento({ ...base, pago: true }, 1)[0]?.pago).toBe(true);
  });
  it('aplica a escolha já pago a todas as parcelas', () => {
    expect(parcelarLancamento({ ...base, pago: true }, 3).map(p => p.pago)).toEqual([true, true, true]);
  });
  it('mantém contas pendentes de alimentação e refeição', () => {
    for (const conta of ['alimentacao', 'refeicao']) {
      expect(parcelarLancamento({ ...base, conta, pago: false }, 1)[0]?.pago).toBe(false);
    }
  });
  it('mantém vales, créditos e aportes para gasolina em lançamento único', () => {
    for (const dados of [{ ...base, conta: 'alimentacao' }, { ...base, conta: 'refeicao' }, { ...base, tipo: 'credito' }, { ...base, destino: 'gasolina', pago: true }]) {
      expect(parcelarLancamento(dados, 3)).toEqual([dados]);
    }
  });
  it('recusa quantidades inválidas ou parcelas menores que um centavo', () => {
    for (const qtd of [0, -1, 1.5, NaN, 10001]) expect(() => parcelarLancamento(base, qtd)).toThrow();
  });
});