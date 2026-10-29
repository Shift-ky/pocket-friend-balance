import { describe, it, expect } from 'vitest';
import { normalizeExtracted, reviewInput, validDate, produtosExtraidos, produtosInput } from '@/lib/telegram/model';
import { parseBankBoleto } from '@/lib/telegram/boleto';

describe('Conferência Telegram', () => {
  it('extrai valor do boleto bancário validado', () => {
    expect(parseBankBoleto('00191234546789012345767890123457196360000123400')?.valor).toBe(1234);
  });
  it('rejeita dígito verificador incorreto', () => {
    expect(parseBankBoleto('00191234556789012345767890123457196360000123400')).toBeNull();
  });
  it('não inventa valor ou vencimento ausente', () => {
    const x = normalizeExtracted({ valor: null, data: null, emissao: null, descricao: null, beneficiario: null, codigo: null, documento: 'boleto', produtos: [] });
    expect(x.valor).toBeNull(); expect(x.data).toBeNull();
  });
  it('rejeita data impossível', () => { expect(validDate('2026-02-30')).toBeNull(); });
  it('limita as carteiras às três carteiras financeiras', () => {
    expect(reviewInput.safeParse({ id: '00000000-0000-4000-8000-000000000001', action: 'aprovar', valor: 25, data: '2026-10-27', descricao: 'Cupom', conta: 'moto', categoria: 'Outros', pago: false }).success).toBe(false);
  });
  it('preserva produtos e quantidades fracionárias dos cupons', () => {
    expect(produtosExtraidos([{ nome: ' Arroz ', qtd: 2 }, { nome: 'Banana', qtd: 0.75 }])).toEqual([{ nome: 'Arroz', qtd: 2 }, { nome: 'Banana', qtd: 0.75 }]);
  });
  it('não inventa quantidades ilegíveis', () => {
    expect(produtosExtraidos([{ nome: 'Leite', qtd: null }, { nome: 'Pão', qtd: -1 }])).toEqual([{ nome: 'Leite', qtd: null }, { nome: 'Pão', qtd: null }]);
  });
  it('exige quantidade revisada antes de importar para Feira ou Estoque', () => {
    for (const action of ['feira', 'estoque']) expect(produtosInput.safeParse({ id: '00000000-0000-4000-8000-000000000001', action, produtos: [{ nome: 'Leite', qtd: null }] }).success).toBe(false);
    expect(produtosInput.safeParse({ id: '00000000-0000-4000-8000-000000000001', action: 'salvar', produtos: [{ nome: 'Leite', qtd: null }] }).success).toBe(true);
  });
});