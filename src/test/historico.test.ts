import { describe, expect, it } from 'vitest';
import { dataLancamento, historicoPorMes } from '@/lib/painel';

describe('Histórico por data de lançamento', () => {
  const itens = [
    { id: 'antigo', data: '2026-12-01', created_at: '2026-10-29T12:00:00Z' },
    { id: 'recente', data: '2026-09-01', created_at: '2026-10-29T14:00:00Z' },
    { id: 'outro-mes', data: '2026-10-01', created_at: '2026-11-01T12:00:00Z' },
  ];
  it('ordena por cadastro mais recente, inclusive no mesmo dia, sem mudar os dados originais', () => {
    expect(historicoPorMes(itens).map(i => i.id)).toEqual(['outro-mes', 'recente', 'antigo']);
    expect(itens.map(i => i.id)).toEqual(['antigo', 'recente', 'outro-mes']);
  });
  it('filtra o mês e ano de lançamento, e não o vencimento', () => {
    expect(historicoPorMes(itens, '2026-10').map(i => i.id)).toEqual(['recente', 'antigo']);
    expect(historicoPorMes(itens, '2025-10')).toEqual([]);
  });
  it('considera o calendário brasileiro ao mudar de mês', () => {
    const item = { created_at: '2026-11-01T01:30:00Z' };
    expect(dataLancamento(item)).toBe('2026-10-31');
    expect(historicoPorMes([item], '2026-10')).toEqual([item]);
    expect(historicoPorMes([item], '2026-11')).toEqual([]);
  });
  it('usa a data informada nos registros antigos sem horário de cadastro', () => {
    expect(historicoPorMes([{ data: '2026-09-15' }, { data: '2026-10-20' }], '2026-10')).toEqual([{ data: '2026-10-20' }]);
  });
});