import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGrupo, useTabelaAoVivo } from "@/lib/grupo";
import { useSouAdmin } from "@/lib/use-admin";
import { entrarNoEstoque } from "@/lib/estoque";
import { buscarPrecosFeira, ultimoPrecoFeira } from "@/lib/precos-feira";

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
type Compra = { id: string; total: number; created_at: string; pagamento?: string; lancamento_id?: string | null; itens: { nome: string; qtd: number; preco: number }[] };
type Pagamento = "nenhum" | "dinheiro" | "alimentacao" | "refeicao";
const PAGAMENTOS = [["nenhum", "Não lançar"], ["dinheiro", "Dinheiro"], ["alimentacao", "Alimentação"], ["refeicao", "Refeição"]] as const;
const nomePag = (p?: string) => PAGAMENTOS.find(([k]) => k === p)?.[1] ?? "Não lançar";
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
    let precoItem = parseFloat(preco.replace(",", ".")) || 0;
    if (!preco.trim()) {
      try { precoItem = await ultimoPrecoFeira(grupo.id, nome); }
      catch { return alert("Não foi possível consultar o último preço. Tente novamente."); }
    }
    await supabase.from("feira_itens").insert({
      grupo_id: grupo.id, nome: nome.trim(),
      qtd: parseFloat(qtd.replace(",", ".")) || 1,
      preco: precoItem,
    });
    setNome(""); setQtd("1"); setPreco("");
    recarregar();
  }

  const atualizar = async (id: string, d: Partial<Item>) => { await supabase.from("feira_itens").update(d).eq("id", id); recarregar(); };
  const excluir = async (ids: string[]) => { if (ids.length) await supabase.from("feira_itens").delete().in("id", ids); recarregar(); };

  const { linhas: historico, recarregar: recarregarHist } = useTabelaAoVivo<Compra>("feira_historico", grupo.id);
  const isAdmin = useSouAdmin();
  const [aberto, setAberto] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ id: string; pagamento: Pagamento; itens: { nome: string; qtd: string; preco: string }[] } | null>(null);

  const [pagamento, setPagamento] = useState<Pagamento>("nenhum");
  async function finalizar() {
    if (!confirm(pagamento === "nenhum" ? "Salvar esta compra no histórico (não finalizada) e limpar a lista?" : "Finalizar esta compra, somar os itens ao estoque e limpar a lista?")) return;
    const copia = itens.map(({ nome, qtd, preco, pego }) => ({ nome, qtd, preco, pego }));
    let lancamento_id: string | null = null;
    if (pagamento !== "nenhum" && total > 0) {
      const { data } = await supabase.from("lancamentos").insert({ grupo_id: grupo.id, tipo: "debito", descricao: "Compra da feira", valor: total, conta: pagamento, pago: true, data: new Date().toISOString().slice(0, 10) }).select("id").single();
      lancamento_id = data?.id ?? null;
    }
    const { error } = await supabase.from("feira_historico").insert({ grupo_id: grupo.id, total, itens: copia, pagamento, lancamento_id });
    if (error) return alert("Não foi possível salvar.");
    if (pagamento !== "nenhum") await entrarNoEstoque(grupo.id, copia);
    await excluir(itens.map((i) => i.id));
    recarregarHist();
  }
  async function recuperar(h: Compra) {
    let precos: Map<string, number>;
    try { precos = await buscarPrecosFeira(grupo.id); }
    catch { return alert("Não foi possível consultar os últimos preços. Tente novamente."); }
    await supabase.from("feira_itens").insert(h.itens.map((i) => ({ grupo_id: grupo.id, nome: i.nome, qtd: i.qtd, preco: precos.get(i.nome.trim().toLowerCase()) ?? i.preco })));
    recarregar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const apagarHist = async (id: string) => { if (confirm("Apagar esta compra do histórico?")) { await supabase.from("feira_historico").delete().eq("id", id); recarregarHist(); } };

  function editar(h: Compra) {
    setAberto(h.id);
    setEditando({ id: h.id, pagamento: (h.pagamento ?? "nenhum") as Pagamento, itens: h.itens.map((i) => ({ nome: i.nome, qtd: String(i.qtd), preco: String(i.preco) })) });
  }
  async function salvarEdicao(h: Compra) {
    if (!editando) return;
    const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
    const novos = editando.itens.filter((i) => i.nome.trim()).map((i) => ({ nome: i.nome.trim(), qtd: num(i.qtd), preco: num(i.preco) }));
    const novoTotal = novos.reduce((s, i) => s + i.qtd * i.preco, 0);
    let lancamento_id = h.lancamento_id ?? null;
    if (editando.pagamento !== "nenhum" && novoTotal > 0) {
      if (lancamento_id) {
        await supabase.from("lancamentos").update({ valor: novoTotal, conta: editando.pagamento }).eq("id", lancamento_id);
      } else {
        const { data } = await supabase.from("lancamentos").insert({ grupo_id: grupo.id, tipo: "debito", descricao: "Compra da feira", valor: novoTotal, conta: editando.pagamento, pago: true, data: h.created_at.slice(0, 10) }).select("id").single();
        lancamento_id = data?.id ?? null;
      }
    } else if (lancamento_id) {
      const { error, count } = await supabase.from("lancamentos").delete({ count: "exact" }).eq("id", lancamento_id);
      if (error || !count) return alert("Só o administrador pode tirar o lançamento desta compra das Finanças.");
      lancamento_id = null;
    }
    const { error } = await supabase.from("feira_historico").update({ itens: novos, total: novoTotal, pagamento: editando.pagamento, lancamento_id }).eq("id", h.id);
    if (error) return alert("Não foi possível salvar.");
    const eraFinalizada = !!h.pagamento && h.pagamento !== "nenhum";
    if (!eraFinalizada && editando.pagamento !== "nenhum") await entrarNoEstoque(grupo.id, novos);
    setEditando(null);
    recarregarHist();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5 sm:py-10">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Compras</p>
        <h1 className="font-display text-4xl sm:text-5xl">Lista da Feira</h1>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:gap-3">
        <section className="rounded-xl bg-primary p-3 text-primary-foreground">
          <p className="text-xs opacity-80">Total previsto</p>
          <p className="font-display truncate text-lg sm:text-xl">{brl(total)}</p>
          <p className="mt-1 text-xs opacity-70">{itens.length} itens na lista</p>
        </section>
        <section className="rounded-xl bg-credit p-3 text-primary-foreground">
          <p className="text-xs opacity-80">No carrinho</p>
          <p className="font-display truncate text-lg sm:text-xl">{brl(noCarrinho)}</p>
          <p className="mt-1 text-xs opacity-70">{itens.filter((i) => i.pego).length} itens pegos</p>
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
        <div className="mt-6 space-y-3 rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Como pagou esta compra?</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([["nenhum", "Não lançar"], ["dinheiro", "Dinheiro"], ["alimentacao", "Alimentação"], ["refeicao", "Refeição"]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setPagamento(k)}
                className={`rounded-lg border py-2 text-sm font-semibold ${pagamento === k ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                {l}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {pagamento === "nenhum" ? "Só salva no histórico, sem mexer nas finanças." : "Também lança o total como débito pago nas Finanças."}
          </p>
          <button onClick={finalizar} className="w-full rounded-lg bg-credit py-3 font-semibold text-primary-foreground hover:opacity-90">
            ✔ Finalizar compra e salvar no histórico
          </button>
        </div>
      )}

      <h2 className="mb-3 mt-12 font-display text-3xl">Histórico de compras</h2>
      <ul className="space-y-2">
        {historico.length === 0 && <li className="py-6 text-center text-muted-foreground">Nenhuma compra salva ainda.</li>}
        {[...historico].reverse().map((h) => (
          <li key={h.id} className={`rounded-lg border bg-card p-4 border-l-4 ${h.pagamento && h.pagamento !== "nenhum" ? "border-l-primary" : "border-l-muted-foreground/40 border-dashed"}`}>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => setAberto(aberto === h.id ? null : h.id)} className="min-w-0 flex-1 text-left">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {new Date(h.created_at).toLocaleDateString("pt-BR")} · {h.itens.length} itens
                  {h.pagamento && h.pagamento !== "nenhum"
                    ? <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Finalizada</span>
                    : <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">Não finalizada</span>}
                </p>
                <p className="text-xs text-muted-foreground">{h.pagamento && h.pagamento !== "nenhum" ? `Pago com ${nomePag(h.pagamento)}` : "Sem pagamento lançado"} · {aberto === h.id ? "Esconder itens" : "Ver itens"}</p>
              </button>
              <span className="shrink-0 font-semibold">{brl(Number(h.total))}</span>
              <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
                {(isAdmin || !h.pagamento || h.pagamento === "nenhum") && <button onClick={() => editar(h)} aria-label="Editar" className="rounded-full border px-3 py-1 text-xs font-semibold">✎ Editar</button>}
                <button onClick={() => recuperar(h)} className="rounded-full border px-3 py-1 text-xs font-semibold">Copiar para a lista</button>
                {(isAdmin || !h.pagamento || h.pagamento === "nenhum") && <button onClick={() => apagarHist(h.id)} aria-label="Excluir" className="text-muted-foreground hover:text-debit">✕</button>}
              </div>
            </div>
            {editando?.id === h.id ? (
              <div className="mt-3 space-y-3 border-t pt-3">
                {editando.itens.map((i, n) => {
                  const muda = (campo: "nome" | "qtd" | "preco", v: string) =>
                    setEditando({ ...editando, itens: editando.itens.map((x, k) => (k === n ? { ...x, [campo]: v } : x)) });
                  return (
                    <div key={n} className="grid grid-cols-[1fr_3.5rem_5rem_auto] items-center gap-2">
                      <input value={i.nome} onChange={(e) => muda("nome", e.target.value)} className="min-w-0 rounded-md border bg-background px-2 py-1 text-sm" aria-label="Item" />
                      <input value={i.qtd} onChange={(e) => muda("qtd", e.target.value)} inputMode="decimal" className="min-w-0 rounded-md border bg-background px-2 py-1 text-center text-sm" aria-label="Quantidade" />
                      <input value={i.preco} onChange={(e) => muda("preco", e.target.value)} inputMode="decimal" className="min-w-0 rounded-md border bg-background px-2 py-1 text-right text-sm" aria-label="Preço" />
                      <button onClick={() => setEditando({ ...editando, itens: editando.itens.filter((_, k) => k !== n) })} aria-label="Remover item" className="text-muted-foreground hover:text-debit">✕</button>
                    </div>
                  );
                })}
                <button onClick={() => setEditando({ ...editando, itens: [...editando.itens, { nome: "", qtd: "1", preco: "" }] })} className="text-sm underline text-muted-foreground">+ Adicionar item</button>
                <p className="text-sm text-muted-foreground">Tipo de pagamento</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PAGAMENTOS.map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setEditando({ ...editando, pagamento: k })}
                      className={`rounded-lg border py-2 text-sm font-semibold ${editando.pagamento === k ? "bg-foreground text-background" : "text-muted-foreground"}`}>{l}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => salvarEdicao(h)} className="flex-1 rounded-lg bg-primary py-2 font-semibold text-primary-foreground">Salvar</button>
                  <button onClick={() => setEditando(null)} className="flex-1 rounded-lg border py-2 font-semibold">Cancelar</button>
                </div>
              </div>
            ) : aberto === h.id && (
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
