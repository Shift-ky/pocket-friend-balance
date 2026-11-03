import { describe, expect, it } from 'vitest';
import { descendingValues, historyEditPayload, telegramWalletOptions } from '@/lib/finance-history-edit';
import type { Carteira } from '@/lib/carteiras';

const values = { descricao: ' Cupom corrigido ', valor: 38.97, data: '2026-10-31', conta: 'dinheiro' as const, categoria: 'Mercado' };
const wallet: Carteira = { id: 'beneficio', grupo_id: 'grupo', nome: 'Alimentação', tipo: 'beneficio', moeda: 'BRL', cor: 'credit', icone: 'wallet', legado: 'alimentacao', na_feira: true, nas_fixas: true, no_painel: true };

describe('Edição de importações do Telegram', () => {
  it('troca a carteira paga e a conta compatível sem duplicar o débito', () => {
    expect(historyEditPayload({ tipo: 'debito', conta: 'dinheiro', carteira_id: 'original' }, values, false, wallet)).toEqual({ descricao: 'Cupom corrigido', valor: 38.97, data: '2026-10-31', conta: 'alimentacao', carteira_id: 'beneficio', categoria: 'Mercado' });
  });
  it('mantém benefícios disponíveis para corrigir pagamentos', () => {
    expect(telegramWalletOptions([wallet], [], 'original', true).map(w => w.id)).toEqual(['beneficio']);
  });
  it('não oferece carteiras internacionais para importações', () => {
    expect(telegramWalletOptions([{ ...wallet, moeda: 'USD' }], [], 'original')).toEqual([]);
  });
  it('não oferece carteiras ligadas a metas para importações', () => {
    expect(telegramWalletOptions([wallet], [{ id: 'meta', grupo_id: 'grupo', carteira_id: wallet.id, nome: 'Reserva', valor_alvo: 100, data_limite: null, ativa: true }], 'original')).toEqual([]);
  });
  it('cupons respeitam a disponibilidade da carteira na Feira', () => {
    expect(telegramWalletOptions([{ ...wallet, na_feira: false }], [], 'original', true)).toEqual([]);
  });
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