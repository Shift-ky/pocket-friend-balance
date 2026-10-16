import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGrupo, useTabelaAoVivo } from "@/lib/grupo";
import { entrarNoEstoque, reporNaFeira } from "@/lib/estoque";

export const Route = createFileRoute("/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Minhas Finanças" },
      { name: "description", content: "Controle o estoque de casa e reponha o que falta na lista da feira." },
      { property: "og:title", content: "Estoque de casa" },
      { property: "og:description", content: "Controle o que tem em casa e gere a lista da feira com o que falta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Estoque,
});

type Prod = { id: string; nome: string; qtd: number; padrao: number };
const input = "rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring";
const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;

function Estoque() {
  const { grupo } = useGrupo();
  const { linhas, recarregar } = useTabelaAoVivo<Prod>("estoque", grupo.id);
  const prods = linhas.map((p) => ({ ...p, qtd: Number(p.qtd), padrao: Number(p.padrao) })).sort((a, b) => a.nome.localeCompare(b.nome));
  const [nome, setNome] = useState("");
  const [qtd, setQtd] = useState("1");
  const faltando = prods.filter((p) => p.qtd < p.padrao).length;

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    await entrarNoEstoque(grupo.id, [{ nome, qtd: num(qtd) || 1 }]);
    setNome(""); setQtd("1"); recarregar();
  }

  async function mudarQtd(p: Prod, nova: number) {
    nova = Math.max(0, nova);
    await supabase.from("estoque").update({ qtd: nova }).eq("id", p.id);
    if (nova < p.padrao) await reporNaFeira(grupo.id, p.nome, nova, p.padrao);
    recarregar();
  }

  async function mudarPadrao(p: Prod, padrao: number) {
    await supabase.from("estoque").update({ padrao }).eq("id", p.id);
    if (p.qtd < padrao) await reporNaFeira(grupo.id, p.nome, p.qtd, padrao);
    recarregar();
  }

  async function excluir(p: Prod) {
    if (confirm(`Tirar "${p.nome}" do estoque?`)) { await supabase.from("estoque").delete().eq("id", p.id); recarregar(); }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <h1 className="font-display text-4xl sm:text-5xl">Estoque</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Compras finalizadas na Feira entram aqui sozinhas. Quando um produto fica abaixo do padrão, o que falta vai para a lista da Feira.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Produtos</p><p className="text-xl font-bold">{prods.length}</p></div>
        <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Abaixo do padrão</p><p className="text-xl font-bold text-debit">{faltando}</p></div>
      </div>

      <form onSubmit={adicionar} className="mt-5 grid grid-cols-[1fr_5rem_auto] gap-2">
        <input className={input} placeholder="Produto (ex.: Arroz)" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input className={input} inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} aria-label="Quantidade" />
        <button className="rounded-lg bg-primary px-4 font-semibold text-primary-foreground">Adicionar</button>
      </form>

      <ul className="mt-5 space-y-2">
        {prods.length === 0 && <li className="py-6 text-center text-muted-foreground">Nenhum produto no estoque ainda.</li>}
        {prods.map((p) => (
          <li key={p.id} className={`rounded-lg border bg-card p-3 ${p.qtd < p.padrao ? "border-l-4 border-l-debit" : ""}`}>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate font-semibold">{p.nome}</p>
              {p.qtd < p.padrao && <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase text-debit">Repor</span>}
              <button onClick={() => excluir(p)} aria-label="Excluir" className="text-muted-foreground hover:text-debit">✕</button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => mudarQtd(p, p.qtd - 1)} className="h-9 w-9 rounded-full border text-lg font-bold" aria-label="Diminuir">−</button>
                <span className="w-10 text-center text-lg font-bold">{p.qtd}</span>
                <button onClick={() => mudarQtd(p, p.qtd + 1)} className="h-9 w-9 rounded-full border text-lg font-bold" aria-label="Aumentar">+</button>
              </div>
              <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                Padrão
                <input key={p.padrao} className={`${input} w-16 py-1`} inputMode="decimal" defaultValue={p.padrao}
                  onBlur={(e) => { const v = num(e.target.value); if (v !== p.padrao) mudarPadrao(p, v); }} />
              </label>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
