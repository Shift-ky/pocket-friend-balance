import { describe, expect, it } from 'vitest';
import { kpisPainel, fluxoMensal } from '@/lib/painel';
const hoje = new Date(2026, 9, 26);
const movs = [
  { data: '2026-10-05', valor: 1000, entrada: true, pendente: false },
  { data: '2026-10-10', valor: 200, entrada: false, pendente: false },
  { data: '2026-10-28', valor: 150, entrada: false, pendente: true },
  { data: '2026-11-02', valor: 80, entrada: false, pendente: true },
  { data: '2026-11-10', valor: 999, entrada: false, pendente: true },
  { data: '2026-09-10', valor: 300, entrada: true, pendente: false },
];
describe('KPIs do painel', () => {
  it('entradas do mês contam só o mês vigente', () => expect(kpisPainel(movs, hoje).entradasMes).toBe(1000));
  it('saídas pagas excluem pendentes', () => expect(kpisPainel(movs, hoje).saidasPagasMes).toBe(200));
  it('contas a vencer somam só os próximos 7 dias', () => { const k = kpisPainel(movs, hoje); expect(k.aVencer7).toBe(230); expect(k.qtdAVencer7).toBe(2); });
  it('fluxo mensal separa entradas e saídas pagas', () => expect(fluxoMensal(movs)[1]).toEqual({ mes: '2026-10', entradas: 1000, saidas: 200 }));
});
