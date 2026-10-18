import { describe, expect, it } from 'vitest';
import { ALL_ACCESS, visibleEntries } from '@/lib/access';
import { saldosPainel, type LancamentoPainel } from '@/lib/painel';
const rows: LancamentoPainel[] = [
  { id:'1', tipo:'credito', descricao:'Salário', valor:100, data:'2026-10-18', pago:true, conta:'dinheiro' },
  { id:'2', tipo:'debito', descricao:'Gasolina', valor:20, data:'2026-10-18', pago:true, conta:'dinheiro', destino:'gasolina' },
  { id:'3', tipo:'debito', descricao:'Compra', valor:10, data:'2026-10-18', pago:true, conta:'dinheiro', origem_modulo:'feira' },
];
describe('Visualização por módulo', () => {
  it('exclui aportes de Moto dos lançamentos e do dinheiro disponível quando Moto está oculta', () => {
    const visible = visibleEntries(rows, { ...ALL_ACCESS, moto:false });
    expect(visible.map(r => r.id)).toEqual(['1','3']);
    expect(saldosPainel(visible).disponivel).toBe(90);
    expect(saldosPainel(rows).disponivel).toBe(70);
  });
  it('oculta compras também nas movimentações e nos totais quando Feira está oculta', () => {
    const visible = visibleEntries(rows, { ...ALL_ACCESS, feira:false });
    expect(visible.map(r => r.id)).toEqual(['1','2']);
    expect(saldosPainel(visible).disponivel).toBe(80);
  });
  it('sem Finanças preserva somente os aportes autorizados de Moto', () => {
    expect(visibleEntries(rows, { ...ALL_ACCESS, financas:false }).map(r => r.id)).toEqual(['2']);
  });
});