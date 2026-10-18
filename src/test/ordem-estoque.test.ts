import { describe, expect, it } from 'vitest';
import { moverProduto, ordenarEstoque } from '@/lib/ordem-estoque';

describe('Organização manual do estoque', () => {
  it('mantém a ordem escolhida em vez da alfabética', () => {
    expect(ordenarEstoque([
      { id: 'arroz', nome: 'Arroz', ordem: 2 },
      { id: 'leite', nome: 'Leite', ordem: 1 },
    ]).map(p => p.id)).toEqual(['leite', 'arroz']);
  });
  it('arrasta um produto para a posição desejada preservando todos os itens', () => {
    expect(moverProduto(['arroz', 'feijao', 'leite'], 'leite', 'arroz')).toEqual(['leite', 'arroz', 'feijao']);
  });
  it('coloca novos produtos depois dos produtos organizados', () => {
    expect(ordenarEstoque([
      { id: 'arroz', nome: 'Arroz', ordem: null },
      { id: 'leite', nome: 'Leite', ordem: 1 },
    ]).map(p => p.id)).toEqual(['leite', 'arroz']);
  });
  it('não move um produto inexistente', () => {
    expect(moverProduto(['arroz', 'leite'], 'feijao', 'arroz')).toEqual(['arroz', 'leite']);
  });
});