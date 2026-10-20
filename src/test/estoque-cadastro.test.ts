import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), update: vi.fn(), atuais: [] as { id: string; nome: string; qtd: number }[] }));
vi.mock('@/lib/offline-client', () => ({ supabase: { from: mocks.from } }));
import { entrarNoEstoque } from '@/lib/estoque';

beforeEach(() => {
  vi.clearAllMocks(); mocks.atuais = [];
  const resultado = { data: null, error: null };
  const filtro = { eq: vi.fn(() => filtro), then: (resolve: (value: typeof resultado) => void) => resolve(resultado) };
  mocks.update.mockReturnValue(filtro);
  mocks.insert.mockReturnValue({ select: () => ({ single: async () => resultado }) });
  mocks.from.mockReturnValue({ select: () => ({ eq: async () => ({ data: mocks.atuais, error: null }) }), insert: mocks.insert, update: mocks.update });
});

describe('divisão no cadastro do estoque', () => {
  it('cadastra o novo produto na divisão escolhida', async () => {
    await entrarNoEstoque('grupo', [{ nome: 'Arroz', qtd: 2, divisao_id: 'alimentos' }]);
    expect(mocks.insert).toHaveBeenCalledWith({ grupo_id: 'grupo', nome: 'Arroz', qtd: 2, padrao: 2, divisao_id: 'alimentos' });
  });
  it('cadastra sem divisão quando nenhuma foi escolhida', async () => {
    await entrarNoEstoque('grupo', [{ nome: 'Arroz', qtd: 2 }]);
    expect(mocks.insert.mock.calls[0]?.[0].divisao_id).toBeNull();
  });
  it('soma a quantidade e aplica a divisão escolhida ao produto existente', async () => {
    mocks.atuais = [{ id: 'arroz', nome: 'Arroz', qtd: 3 }];
    await entrarNoEstoque('grupo', [{ nome: 'Arroz', qtd: 2, divisao_id: 'alimentos' }]);
    expect(mocks.update).toHaveBeenCalledWith({ qtd: 5, divisao_id: 'alimentos' });
  });
  it('preserva a divisão existente se nenhuma divisão foi escolhida', async () => {
    mocks.atuais = [{ id: 'arroz', nome: 'Arroz', qtd: 3 }];
    await entrarNoEstoque('grupo', [{ nome: 'Arroz', qtd: 2 }]);
    expect(mocks.update).toHaveBeenCalledWith({ qtd: 5 });
  });
});