import { supabase } from "@/lib/offline-client";
import { ultimoPrecoFeira } from "@/lib/precos-feira";

const chave = (s: string) => s.trim().toLowerCase();

/** Soma itens comprados ao estoque; cadastra os que ainda não existem. */
export async function entrarNoEstoque(grupoId: string, itens: { nome: string; qtd: number; divisao_id?: string | undefined }[]) {
  const { data: atuais, error: erroLeitura } = await supabase.from("estoque").select("id,nome,qtd").eq("grupo_id", grupoId);
  if (erroLeitura) throw erroLeitura;
  const mapa = new Map((atuais ?? []).map((e) => [chave(e.nome), e]));
  for (const i of itens) {
    if (!i.nome.trim() || !(i.qtd > 0)) continue;
    const e = mapa.get(chave(i.nome));
    if (e) {
      const nova = Number(e.qtd) + i.qtd;
      const { error } = await supabase.from("estoque").update({ qtd: nova, ...(i.divisao_id ? { divisao_id: i.divisao_id } : {}) }).eq("id", e.id).eq("grupo_id", grupoId);
      if (error) throw error;
      e.qtd = nova;
    } else {
      const { data, error } = await supabase.from("estoque").insert({ grupo_id: grupoId, nome: i.nome.trim(), qtd: i.qtd, padrao: i.qtd, divisao_id: i.divisao_id || null }).select("id,nome,qtd").single();
      if (error) throw error;
      if (data) mapa.set(chave(data.nome), data);
    }
  }
}

/** Mantém na lista da feira exatamente o que falta para o padrão (tira se nada falta). */
export async function reporNaFeira(grupoId: string, nome: string, qtd: number, padrao: number) {
  const falta = padrao - qtd;
  const { data: lista } = await supabase.from("feira_itens").select("id,nome,qtd").eq("grupo_id", grupoId);
  const ja = (lista ?? []).find((l) => chave(l.nome) === chave(nome));
  if (falta <= 0) {
    if (ja) await supabase.from("feira_itens").delete().eq("id", ja.id);
    return;
  }
  if (ja) {
    if (Number(ja.qtd) !== falta) await supabase.from("feira_itens").update({ qtd: falta }).eq("id", ja.id);
  } else {
    const preco = await ultimoPrecoFeira(grupoId, nome);
    await supabase.from("feira_itens").insert({ grupo_id: grupoId, nome, qtd: falta, preco });
  }
}
