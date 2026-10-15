import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useGrupo, useTabelaAoVivo } from "@/lib/grupo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — Minhas Finanças" },
      { name: "description", content: "Veja todas as entradas e saídas do seu dinheiro em um só lugar." },
      { property: "og:title", content: "Painel — Minhas Finanças" },
      { property: "og:description", content: "Todas as entradas e saídas em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Painel,
});

type Lanc = { id: string; tipo: string; descricao: string; valor: number; data: string; pago: boolean };
type Desp = { id: string; fornecedor: string; descricao: string; valor: number; data: string };
type Compra = { id: string; total: number; created_at: string };
type Mov = { id: string; data: string; nome: string; origem: string; valor: number; entrada: boolean; pendente?: boolean };

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const nomeMes = (m: string) => new Date(m + "-01T00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

function Painel() {
  const { grupo } = useGrupo();
  const { linhas: lanc } = useTabelaAoVivo<Lanc>("lancamentos", grupo.id);
  const { linhas: desp } = useTabelaAoVivo<Desp>("despesas", grupo.id);
  const { linhas: feira } = useTabelaAoVivo<Compra>("feira_historico", grupo.id);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const todos = useMemo<Mov[]>(() => {
    const rotulo: Record<string, string> = { credito: "Crédito", debito: "Débito", aplicacao: "Aplicação", resgate: "Resgate" };
    return [
      ...lanc.map((l) => ({ id: l.id, data: l.data, nome: l.descricao, origem: rotulo[l.tipo] ?? l.tipo, valor: Number(l.valor), entrada: l.tipo === "credito" || l.tipo === "resgate", pendente: l.tipo === "debito" && !l.pago })),
      ...desp.map((d) => ({ id: d.id, data: d.data, nome: d.fornecedor || d.descricao, origem: "Recibo", valor: Number(d.valor), entrada: false })),
      ...feira.filter(() => false).map((f) => ({ id: f.id, data: f.created_at.slice(0, 10), nome: "Compra da feira", origem: "Feira", valor: Number(f.total), entrada: false })),
    ].sort((a, b) => b.data.localeCompare(a.data));
  }, [lanc, desp, feira]);

  const meses = useMemo(() => [...new Set(todos.map((m) => m.data.slice(0, 7)))].sort().reverse(), [todos]);
  const lista = todos.filter((m) => (!de || m.data >= de) && (!ate || m.data <= ate));
  const entradas = lista.filter((m) => m.entrada).reduce((s, m) => s + m.valor, 0);
  const saidas = lista.filter((m) => !m.entrada && !m.pendente).reduce((s, m) => s + m.valor, 0);
  const pendentes = lista.filter((m) => m.pendente);

  const grafico = [...meses].slice(0, 6).reverse().map((m) => {
    const doMes = todos.filter((x) => x.data.startsWith(m));
    return { m, e: doMes.filter((x) => x.entrada).reduce((s, x) => s + x.valor, 0), s: doMes.filter((x) => !x.entrada && !x.pendente).reduce((s, x) => s + x.valor, 0) };
  });
  const maior = Math.max(1, ...grafico.flatMap((g) => [g.e, g.s]));

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Visão geral</p>
          <h1 className="font-display text-5xl">Painel</h1>
        </div>
        <div className="flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col text-muted-foreground">De
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-foreground" />
          </label>
          <label className="flex flex-col text-muted-foreground">Até
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-foreground" />
          </label>
          {(de || ate) && <button onClick={() => { setDe(""); setAte(""); }} className="rounded-lg border px-3 py-2">Todo o período</button>}
        </div>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <section className="rounded-xl bg-credit p-5 text-primary-foreground">
          <p className="text-sm opacity-80">Entradas</p>
          <p className="font-display text-3xl">{brl(entradas)}</p>
        </section>
        <section className="rounded-xl bg-debit p-5 text-primary-foreground">
          <p className="text-sm opacity-80">Saídas pagas</p>
          <p className="font-display text-3xl">{brl(saidas)}</p>
        </section>
        <section className="rounded-xl bg-primary p-5 text-primary-foreground">
          <p className="text-sm opacity-80">Resultado</p>
          <p className="font-display text-3xl">{brl(entradas - saidas)}</p>
        </section>
      </div>

      {grafico.length > 0 && (
        <section className="mb-8 rounded-xl border bg-card p-5">
          <p className="mb-4 font-semibold">Últimos meses</p>
          <div className="flex h-40 items-end gap-4">
            {grafico.map((g) => (
              <div key={g.m} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-32 w-full items-end justify-center gap-1">
                  <div className="w-1/3 rounded-t bg-credit" style={{ height: `${(g.e / maior) * 100}%` }} title={`Entradas ${brl(g.e)}`} />
                  <div className="w-1/3 rounded-t bg-debit" style={{ height: `${(g.s / maior) * 100}%` }} title={`Saídas ${brl(g.s)}`} />
                </div>
                <span className="text-xs text-muted-foreground">{nomeMes(g.m)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-credit" />Entradas</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-debit" />Saídas</span>
          </p>
        </section>
      )}

      <h2 className="mb-3 font-display text-3xl">Contas pendentes</h2>
      <ul className="mb-8 space-y-2">
        {pendentes.length === 0 && <li className="py-6 text-center text-muted-foreground">Nenhuma conta a pagar neste período.</li>}
        {pendentes.map((m) => (
          <li key={"p" + m.id} className="flex items-center gap-3 rounded-lg border border-debit bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{m.nome}</p>
              <p className="text-xs text-muted-foreground">Vence {new Date(m.data + "T00:00").toLocaleDateString("pt-BR")}</p>
            </div>
            <span className="font-semibold text-debit">{brl(m.valor)}</span>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 font-display text-3xl">Todas as movimentações</h2>
      <ul className="space-y-2">
        {lista.filter((m) => !m.pendente).length === 0 && (
          <li className="py-10 text-center text-muted-foreground">
            Nada por aqui ainda. Comece em <Link to="/financas" className="underline">Finanças</Link>.
          </li>
        )}
        {lista.filter((m) => !m.pendente).map((m) => (
          <li key={m.origem + m.id} className="flex items-center gap-3 rounded-lg border bg-card p-4">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full font-bold ${m.entrada ? "bg-credit-soft text-credit" : "bg-debit-soft text-debit"}`}>
              {m.entrada ? "+" : "−"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{m.nome}</p>
              <p className="text-xs text-muted-foreground">{m.origem}{m.pendente ? " · A pagar" : ""} · {new Date(m.data + "T00:00").toLocaleDateString("pt-BR")}</p>
            </div>
            <span className={`font-semibold ${m.entrada ? "text-credit" : "text-debit"}`}>{m.entrada ? "+" : "−"} {brl(m.valor)}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
