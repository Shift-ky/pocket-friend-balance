import { describe, expect, it } from 'vitest';
import { dataMensal, ocorrenciasFixas, validarFixa } from '@/lib/contas-fixas';
const fixa = { descricao: 'Salário', modalidade: 'credito' as const, conta: 'dinheiro' as const, valor: 1500, dia: 5, inicio: '2026-10-01', fim: null, ativa: true };
describe('Contas e entradas mensais', () => {
  it('gera no dia informado em cada mês, nunca no futuro', () => {
    expect(ocorrenciasFixas(fixa, '2026-12-04')).toEqual(['2026-10-05', '2026-11-05']);
  });
  it('respeita início e fim inclusivos', () => {
    expect(ocorrenciasFixas({ ...fixa, inicio: '2026-10-06', fim: '2026-12-05' }, '2027-02-01')).toEqual(['2026-11-05', '2026-12-05']);
  });
  it('continua mensalmente quando o fim é indefinido', () => {
    expect(ocorrenciasFixas(fixa, '2027-01-05')).toEqual(['2026-10-05', '2026-11-05', '2026-12-05', '2027-01-05']);
  });
  it('não gera enquanto está pausada', () => { expect(ocorrenciasFixas({ ...fixa, ativa: false }, '2027-01-05')).toEqual([]); });
  it('usa o último dia nos meses sem o dia 31', () => { expect(dataMensal('2026-02', 31)).toBe('2026-02-28'); expect(dataMensal('2028-02', 31)).toBe('2028-02-29'); });
  it('impede gasolina em carteiras de vales', () => { expect(validarFixa({ ...fixa, modalidade: 'gasolina', conta: 'alimentacao' })).toBe('O aporte da Moto deve usar Dinheiro.'); });
  it('rejeita fim anterior ao início', () => { expect(validarFixa({ ...fixa, fim: '2026-09-30' })).toBe('A data final deve ser igual ou posterior ao início.'); });
});