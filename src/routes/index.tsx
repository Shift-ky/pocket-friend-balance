import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Minhas Finanças — Créditos e Débitos" },
      { name: "description", content: "Controle o que você recebe e o que precisa pagar." },
      { property: "og:title", content: "Minhas Finanças" },
      { property: "og:description", content: "Controle seus créditos e débitos de forma simples." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Tipo = "credito" | "debito";
type Lancamento = { id: string; tipo: Tipo; descricao: string; valor: number; data: string; pago: boolean };

const KEY = "financas:lancamentos";
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Index() {
  const [itens, setItens] = useState<Lancamento[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tipo, setTipo] = useState<Tipo>("credito");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [filtro, setFiltro] = useState<"todos" | Tipo>("todos");

  useEffect(() => {
    try { setItens(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify(itens)); }, [itens, loaded]);

  const totais = useMemo(() => {
    const c = itens.filter((i) => i.tipo === "credito").reduce((s, i) => s + i.valor, 0);
    const d = itens.filter((i) => i.tipo === "debito").reduce((s, i) => s + i.valor, 0);
    const aPagar = itens.filter((i) => i.tipo === "debito" && !i.pago).reduce((s, i) => s + i.valor, 0);
    return { c, d, saldo: c - d, aPagar };
  }, [itens]);

  const lista = itens
    .filter((i) => filtro === "todos" || i.tipo === filtro)
    .sort((a, b) => b.data.localeCompare(a.data));

  function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const v = parseFloat(valor.replace(",", "."));
    if (!descricao.trim() || !v || v <= 0) return;
    setItens((p) => [...p, { id: crypto.randomUUID(), tipo, descricao: descricao.trim(), valor: v, data, pago: tipo === "credito" }]);
    setDescricao(""); setValor("");
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Meu caixa</p>
        <h1 className="font-display text-5xl">Minhas Finanças</h1>
      </header>

      <section className="mb-8 rounded-xl bg-primary p-6 text-primary-foreground">
        <p className="text-sm opacity-80">Saldo atual</p>
        <p className="font-display text-5xl">{brl(totais.saldo)}</p>
        <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
          <div><p className="opacity-70">Créditos</p><p className="text-lg font-semibold">{brl(totais.c)}</p></div>
          <div><p className="opacity-70">Débitos</p><p className="text-lg font-semibold">{brl(totais.d)}</p></div>
          <div><p className="opacity-70">Falta pagar</p><p className="text-lg font-semibold">{brl(totais.aPagar)}</p></div>
        </div>
      </section>

      <form onSubmit={adicionar} className="mb-8 space-y-4 rounded-xl border bg-card p-5">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
          {(["credito", "debito"] as Tipo[]).map((t) => (
            <button key={t} type="button" onClick={() => setTipo(t)}
              className={`rounded-md py-2 font-semibold transition ${tipo === t ? (t === "credito" ? "bg-credit text-primary-foreground" : "bg-debit text-primary-foreground") : "text-muted-foreground"}`}>
              {t === "credito" ? "+ Crédito (recebo)" : "− Débito (pago)"}
            </button>
          ))}
        </div>
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (ex: Salário, Aluguel)"
          className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
        <div className="grid grid-cols-2 gap-3">
          <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="Valor (R$)"
            className="rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
          <input type="date" value={data} onChange={(e) => setData(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90">Adicionar</button>
      </form>

      <div className="mb-3 flex gap-2">
        {(["todos", "credito", "debito"] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`rounded-full border px-4 py-1 text-sm ${filtro === f ? "bg-foreground text-background" : ""}`}>
            {f === "todos" ? "Todos" : f === "credito" ? "Créditos" : "Débitos"}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {lista.length === 0 && <li className="py-10 text-center text-muted-foreground">Nenhum lançamento ainda.</li>}
        {lista.map((i) => (
          <li key={i.id} className={`flex items-center gap-3 rounded-lg border bg-card p-4 ${i.pago || i.tipo === "credito" ? "" : ""}`}>
            <span className={`flex h-9 w-9 items-center justify-center rounded-full font-bold ${i.tipo === "credito" ? "bg-credit-soft text-credit" : "bg-debit-soft text-debit"}`}>
              {i.tipo === "credito" ? "+" : "−"}
            </span>
            <div className="flex-1">
              <p className={`font-semibold ${i.tipo === "debito" && i.pago ? "line-through opacity-60" : ""}`}>{i.descricao}</p>
              <p className="text-xs text-muted-foreground">{new Date(i.data + "T00:00").toLocaleDateString("pt-BR")}</p>
            </div>
            {i.tipo === "debito" && (
              <button onClick={() => setItens((p) => p.map((x) => x.id === i.id ? { ...x, pago: !x.pago } : x))}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${i.pago ? "bg-credit-soft text-credit" : "bg-debit-soft text-debit"}`}>
                {i.pago ? "Pago" : "A pagar"}
              </button>
            )}
            <span className={`w-28 text-right font-semibold ${i.tipo === "credito" ? "text-credit" : "text-debit"}`}>{brl(i.valor)}</span>
            <button onClick={() => setItens((p) => p.filter((x) => x.id !== i.id))} aria-label="Excluir"
              className="text-muted-foreground hover:text-debit">✕</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
