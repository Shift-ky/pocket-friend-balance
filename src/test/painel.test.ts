import { describe, expect, it } from 'vitest';
import { saldosPainel, type LancamentoPainel } from '@/lib/painel';

const item = (values: Partial<LancamentoPainel>): LancamentoPainel => ({ id: '1', tipo: 'credito', descricao: 'Teste', valor: 100, data: '2026-10-17', pago: true, conta: 'dinheiro', ...values });
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