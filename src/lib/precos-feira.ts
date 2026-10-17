import { supabase } from '@/integrations/supabase/client';

type CompraPreco = { created_at: string; pagamento?: string; itens: unknown };
const chave = (nome: string) => nome.trim().toLowerCase();

export function precosDasCompras(compras: CompraPreco[]) {
  const precos = new Map<string, number>();
  for (const compra of [...compras].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    if (!compra.pagamento || compra.pagamento === 'nenhum' || !Array.isArray(compra.itens)) continue;
    for (const item of compra.itens) {
      if (!item || typeof item !== 'object' || typeof item.nome !== 'string') continue;
      const nome = chave(item.nome);
      const preco = Number(item.preco);
      if (nome && !precos.has(nome) && Number.isFinite(preco) && preco >= 0) precos.set(nome, preco);
    }
  }
  return precos;
}

export async function buscarPrecosFeira(grupoId: string) {
  const { data, error } = await supabase.from('feira_historico').select('created_at,pagamento,itens').eq('grupo_id', grupoId).neq('pagamento', 'nenhum').order('created_at', { ascending: false });
  if (error) throw error;
  return precosDasCompras(data ?? []);
}

export async function ultimoPrecoFeira(grupoId: string, nome: string) {
  return (await buscarPrecosFeira(grupoId)).get(chave(nome)) ?? 0;
}