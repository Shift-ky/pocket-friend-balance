import { describe, expect, it } from 'vitest';
import { descendingValues, historyEditPayload } from '@/lib/finance-history-edit';

const values = { descricao: ' Cupom corrigido ', valor: 38.97, data: '2026-10-31', conta: 'dinheiro' as const, categoria: 'Mercado' };

describe('Edição de importações do Telegram', () => {
  it('inclui a categoria escolhida na edição do débito importado', () => {
    const edited = historyEditPayload({ tipo: 'debito', conta: 'dinheiro' }, { ...values, categoria: 'Internet e telefone' });
    expect(edited).toHaveProperty('categoria', 'Internet e telefone');
  });
  it('preserva a conta Alimentação vinculada à carteira ao editar o lançamento', () => {
    expect(historyEditPayload({ tipo: 'debito', conta: 'alimentacao', carteira_id: 'wallet' }, values)).toEqual({ descricao: 'Cupom corrigido', valor: 38.97, data: '2026-10-31', conta: 'alimentacao', categoria: 'Mercado' });
  });
  it('edita uma despesa Moto sem escrever campos financeiros ou recriar o lançamento', () => {
    expect(historyEditPayload({ tipo: 'debito', conta: 'dinheiro' }, values, true)).toEqual({ descricao: 'Cupom corrigido', valor: 38.97, data: '2026-10-31', categoria: 'Mercado' });
  });
});

it('ordena a análise do maior valor ao menor sem alterar os dados originais', () => {
  const items = [{ valor: 38.97 }, { valor: 100 }, { valor: 12 }];
  expect(descendingValues(items).map(item => item.valor)).toEqual([100, 38.97, 12]);
  expect(items.map(item => item.valor)).toEqual([38.97, 100, 12]);
});