import { describe, expect, it } from 'vitest';
import { saldosPainel, pendenciasDoMes, type LancamentoPainel } from '@/lib/painel';

const item = (values: Partial<LancamentoPainel>): LancamentoPainel => ({ id: '1', tipo: 'credito', descricao: 'Teste', valor: 100, data: '2026-10-17', pago: true, conta: 'dinheiro', ...values });
describe('Pendências do mês vigente', () => {
  it('soma apenas débitos não pagos dentro do mês atual, incluindo seus limites', () => {
    const itens = [
      item({ tipo: 'debito', pago: false, data: '2026-10-01', valor: 20 }),
      item({ tipo: 'debito', pago: false, data: '2026-10-31', valor: 30 }),
      item({ tipo: 'debito', pago: false, data: '2026-09-30', valor: 40 }),
      item({ tipo: 'debito', pago: false, data: '2026-11-01', valor: 50 }),
      item({ tipo: 'debito', pago: true, valor: 60 }),
      item({ tipo: 'credito', pago: false, valor: 70 }),
    ];
    expect(pendenciasDoMes(itens, new Date(2026, 9, 17))).toBe(50);
  });
  it('não inclui pendências do mesmo mês de outro ano', () => {
    expect(pendenciasDoMes([item({ tipo: 'debito', pago: false, data: '2025-10-17' })], new Date(2026, 9, 17))).toBe(0);
  });
});
describe('Saldos do Painel', () => {
  it('mantém contas não pagas fora do desconto no dinheiro', () => {
    expect(saldosPainel([item({}), item({ tipo: 'debito', valor: 30, pago: false })]).disponivel).toBe(100);
  });
  it('reserva o aporte de gasolina uma única vez', () => {
    expect(saldosPainel([item({}), item({ tipo: 'debito', destino: 'gasolina', valor: 30 })]).disponivel).toBe(70);
  });
  it('mantém guardado e vales separados do dinheiro', () => {
    expect(saldosPainel([item({}), item({ tipo: 'aplicacao', valor: 20 }), item({ conta: 'alimentacao', valor: 50 }), item({ conta: 'refeicao', valor: 40 })])).toEqual({ disponivel: 80, guardado: 20, alimentacao: 50, refeicao: 40 });
  });
});