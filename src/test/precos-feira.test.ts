import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { precosDasCompras } from '@/lib/precos-feira';

describe('Preço do produto comprado', () => {
  it('usa o último preço unitário da compra finalizada, sem diferenciar maiúsculas ou espaços', () => {
    const precos = precosDasCompras([
      { created_at: '2026-10-01', pagamento: 'dinheiro', itens: [{ nome: 'Arroz', qtd: 3, preco: 5.5 }] },
      { created_at: '2026-10-16', pagamento: 'alimentacao', itens: [{ nome: ' ARROZ ', qtd: 2, preco: 7.25 }] },
    ]);
    expect(precos.get('arroz')).toBe(7.25);
  });
  it('não usa preços de compras não finalizadas', () => {
    expect(precosDasCompras([
      { created_at: '2026-10-16', pagamento: 'nenhum', itens: [{ nome: 'Arroz', preco: 9 }] },
      { created_at: '2026-10-01', pagamento: 'refeicao', itens: [{ nome: 'Arroz', preco: 5.5 }] },
    ]).get('arroz')).toBe(5.5);
  });
  it('não inventa um preço para produto nunca comprado', () => {
    expect(precosDasCompras([]).get('arroz')).toBeUndefined();
  });
});