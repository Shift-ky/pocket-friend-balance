import { supabase } from "@/integrations/supabase/client";

const chave = (s: string) => s.trim().toLowerCase();

/** Soma itens comprados ao estoque; cadastra os que ainda não existem. */
export async function entrarNoEstoque(grupoId: string, itens: { nome: string; qtd: number }[]) {
  const { data: atuais } = await supabase.from("estoque").select("id,nome,qtd").eq("grupo_id", grupoId);
  const mapa = new Map((atuais ?? []).map((e) => [chave(e.nome), e]));
  for (const i of itens) {
    if (!i.nome.trim() || !(i.qtd > 0)) continue;
    const e = mapa.get(chave(i.nome));
    if (e) {
      const nova = Number(e.qtd) + i.qtd;
      await supabase.from("estoque").update({ qtd: nova }).eq("id", e.id);
      e.qtd = nova;
    } else {
      const { data } = await supabase.from("estoque").insert({ grupo_id: grupoId, nome: i.nome.trim(), qtd: i.qtd, padrao: i.qtd }).select("id,nome,qtd").single();
      if (data) mapa.set(chave(data.nome), data);
    }
  }
}

/** Se o item ficou abaixo do padrão, garante que o que falta esteja na lista da feira. */
export async function reporNaFeira(grupoId: string, nome: string, qtd: number, padrao: number) {
  const falta = padrao - qtd;
  const { data: lista } = await supabase.from("feira_itens").select("id,nome,qtd").eq("grupo_id", grupoId);
  const ja = (lista ?? []).find((l) => chave(l.nome) === chave(nome));
  if (falta <= 0) return;
  if (ja) {
    if (Number(ja.qtd) < falta) await supabase.from("feira_itens").update({ qtd: falta }).eq("id", ja.id);
  } else {
    await supabase.from("feira_itens").insert({ grupo_id: grupoId, nome, qtd: falta, preco: 0 });
  }
}
