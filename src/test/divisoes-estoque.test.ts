import { describe, expect, it } from 'vitest';
import { agruparEstoque, moverNaDivisao } from '@/lib/divisoes-estoque';

describe('divisões do estoque', () => {
  it('agrupa os produtos sem modificar quantidades', () => {
    const produto = { id: 'arroz', divisao_id: 'alimentos', qtd: 4, padrao: 5 };
    const grupos = agruparEstoque([produto], [{ id: 'alimentos', nome: 'Alimentos' }]);
    expect(grupos[0]?.produtos).toEqual([produto]);
    expect(produto.qtd).toBe(4);
  });
  it('mantém produtos sem divisão em um grupo separado', () => {
    expect(agruparEstoque([{ id: 'a', divisao_id: null }], [])[0]?.produtos).toEqual([{ id: 'a', divisao_id: null }]);
  });
  it('reordena apenas os produtos da mesma divisão preservando todas as posições restantes', () => {
    expect(moverNaDivisao([{ id: 'a', divisao_id: '1' }, { id: 'b', divisao_id: '2' }, { id: 'c', divisao_id: '1' }], 'a', 'c')).toEqual(['c', 'b', 'a']);
  });
  it('não mistura divisões durante o arraste', () => {
    expect(moverNaDivisao([{ id: 'a', divisao_id: '1' }, { id: 'b', divisao_id: '2' }], 'a', 'b')).toEqual(['a', 'b']);
  });
});