import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGrupo, useTabelaAoVivo } from "@/lib/grupo";

export const Route = createFileRoute("/feira")({
  head: () => ({
    meta: [
      { title: "Lista da Feira — Minhas Finanças" },
      { name: "description", content: "Anote os itens da sua feira e acompanhe o total." },
      { property: "og:title", content: "Lista da Feira" },
      { property: "og:description", content: "Anote os itens da sua feira e acompanhe o total." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Feira,
});

type Item = { id: string; nome: string; qtd: number; preco: number; pego: boolean };
type Compra = { id: string; total: number; created_at: string; itens: { nome: string; qtd: number; preco: number }[] };
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const input = "rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring";

function Feira() {
  const { grupo } = useGrupo();
  const { linhas, recarregar } = useTabelaAoVivo<Item>("feira_itens", grupo.id);
  const itens = linhas.map((i) => ({ ...i, qtd: Number(i.qtd), preco: Number(i.preco) }));
  const [nome, setNome] = useState("");
  const [qtd, setQtd] = useState("1");
  const [preco, setPreco] = useState("");

  const total = itens.reduce((s, i) => s + i.qtd * i.preco, 0);
  const noCarrinho = itens.filter((i) => i.pego).reduce((s, i) => s + i.qtd * i.preco, 0);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    await supabase.from("feira_itens").insert({
      grupo_id: grupo.id, nome: nome.trim(),
      qtd: parseFloat(qtd.replace(",", ".")) || 1,
      preco: parseFloat(preco.replace(",", ".")) || 0,
    });
    setNome(""); setQtd("1"); setPreco("");
    recarregar();
  }

  const atualizar = async (id: string, d: Partial<Item>) => { await supabase.from("feira_itens").update(d).eq("id", id); recarregar(); };
  const excluir = async (ids: string[]) => { if (ids.length) await supabase.from("feira_itens").delete().in("id", ids); recarregar(); };

  const { linhas: historico, recarregar: recarregarHist } = useTabelaAoVivo<Compra>("feira_historico", grupo.id);
  const [aberto, setAberto] = useState<string | null>(null);

  async function finalizar() {
    if (!confirm("Salvar esta compra no histórico e limpar a lista?")) return;
    const copia = itens.map(({ nome, qtd, preco, pego }) => ({ nome, qtd, preco, pego }));
    const { error } = await supabase.from("feira_historico").insert({ grupo_id: grupo.id, total, itens: copia });
    if (error) return alert("Não foi possível salvar.");
    await excluir(itens.map((i) => i.id));
    recarregarHist();
  }
  async function recuperar(h: Compra) {
    await supabase.from("feira_itens").insert(h.itens.map((i) => ({ grupo_id: grupo.id, nome: i.nome, qtd: i.qtd, preco: i.preco })));
    recarregar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const apagarHist = async (id: string) => { if (confirm("Apagar esta compra do histórico?")) { await supabase.from("feira_historico").delete().eq("id", id); recarregarHist(); } };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5 sm:py-10">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Compras</p>
        <h1 className="font-display text-4xl sm:text-5xl">Lista da Feira</h1>
      </header>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl bg-primary p-6 text-primary-foreground">
          <p className="text-sm opacity-80">Total previsto</p>
          <p className="font-display text-4xl">{brl(total)}</p>
          <p className="mt-2 text-sm opacity-80">{itens.length} itens na lista</p>
        </section>
        <section className="rounded-xl bg-credit p-6 text-primary-foreground">
          <p className="text-sm opacity-80">No carrinho</p>
          <p className="font-display text-4xl">{brl(noCarrinho)}</p>
          <p className="mt-2 text-sm opacity-80">{itens.filter((i) => i.pego).length} itens pegos</p>
        </section>
      </div>

      <form onSubmit={adicionar} className="mb-6 grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_5rem_7rem] sm:p-5">
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Item (ex: Arroz)" className={`${input} col-span-2 min-w-0 sm:col-span-1`} />
        <input value={qtd} onChange={(e) => setQtd(e.target.value)} inputMode="decimal" placeholder="Qtd" className={`${input} min-w-0`} />
        <input value={preco} onChange={(e) => setPreco(e.target.value)} inputMode="decimal" placeholder="Preço R$" className={`${input} min-w-0`} />
        <button className="col-span-2 rounded-lg bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 sm:col-span-3">Adicionar item</button>
      </form>

      {itens.some((i) => i.pego) && (
        <button onClick={() => excluir(itens.filter((i) => i.pego).map((i) => i.id))} className="mb-3 text-sm text-muted-foreground underline">
          Remover itens pegos
        </button>
      )}

      <ul className="space-y-2">
        {itens.length === 0 && <li className="py-10 text-center text-muted-foreground">Sua lista está vazia.</li>}
        {itens.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 sm:gap-3">
            <input type="checkbox" checked={i.pego} onChange={() => atualizar(i.id, { pego: !i.pego })} className="h-5 w-5 shrink-0 accent-credit" />
            <p className={`min-w-0 flex-1 break-words font-semibold ${i.pego ? "line-through opacity-50" : ""}`}>{i.nome}</p>
            <button onClick={() => excluir([i.id])} aria-label="Excluir" className="shrink-0 text-muted-foreground hover:text-debit sm:order-last">✕</button>
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              <input key={`q${i.qtd}`} defaultValue={i.qtd} onBlur={(e) => atualizar(i.id, { qtd: parseFloat(e.target.value.replace(",", ".")) || 0 })} inputMode="decimal"
                className="w-14 rounded-md border bg-background px-2 py-1 text-center text-sm" aria-label="Quantidade" />
              <span className="text-sm text-muted-foreground">×</span>
              <input key={`p${i.preco}`} defaultValue={i.preco} onBlur={(e) => atualizar(i.id, { preco: parseFloat(e.target.value.replace(",", ".")) || 0 })} inputMode="decimal"
                className="w-20 rounded-md border bg-background px-2 py-1 text-right text-sm" aria-label="Preço" />
              <span className="w-24 text-right font-semibold">{brl(i.qtd * i.preco)}</span>
            </div>
          </li>
        ))}
      </ul>

      {itens.length > 0 && (
        <button onClick={finalizar} className="mt-6 w-full rounded-lg bg-credit py-3 font-semibold text-primary-foreground hover:opacity-90">
          ✔ Finalizar compra e salvar no histórico
        </button>
      )}

      <h2 className="mb-3 mt-12 font-display text-3xl">Histórico de compras</h2>
      <ul className="space-y-2">
        {historico.length === 0 && <li className="py-6 text-center text-muted-foreground">Nenhuma compra salva ainda.</li>}
        {[...historico].reverse().map((h) => (
          <li key={h.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => setAberto(aberto === h.id ? null : h.id)} className="min-w-0 flex-1 text-left">
                <p className="font-semibold">{new Date(h.created_at).toLocaleDateString("pt-BR")} · {h.itens.length} itens</p>
                <p className="text-xs text-muted-foreground">{aberto === h.id ? "Esconder itens" : "Ver itens"}</p>
              </button>
              <span className="shrink-0 font-semibold">{brl(Number(h.total))}</span>
              <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
                <button onClick={() => recuperar(h)} className="rounded-full border px-3 py-1 text-xs font-semibold">Copiar para a lista</button>
                <button onClick={() => apagarHist(h.id)} aria-label="Excluir" className="text-muted-foreground hover:text-debit">✕</button>
              </div>
            </div>
            {aberto === h.id && (
              <ul className="mt-3 space-y-1 border-t pt-3 text-sm">
                {h.itens.map((i, n) => (
                  <li key={n} className="flex justify-between"><span>{i.qtd} × {i.nome}</span><span>{brl(i.qtd * i.preco)}</span></li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
