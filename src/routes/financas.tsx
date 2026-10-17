import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGrupo, useTabelaAoVivo } from "@/lib/grupo";
import { useSouAdmin } from "@/lib/use-admin";
import { Button } from "@/components/ui/button";
import { Fuel } from "lucide-react";
import { movimentacaoGasolina, totaisMoto, type DespesaMoto } from "@/lib/moto";

export const Route = createFileRoute("/financas")({
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

type Tipo = "credito" | "debito" | "aplicacao" | "resgate";
type Conta = "dinheiro" | "alimentacao" | "refeicao";
type Lancamento = { id: string; tipo: Tipo; descricao: string; valor: number; data: string; pago: boolean; conta: Conta; destino?: string };
const CONTAS: Record<Conta, string> = { dinheiro: "Dinheiro", alimentacao: "Alimentação", refeicao: "Refeição" };

const INFO: Record<Tipo, { label: string; sinal: string; ativo: string; icone: string; texto: string }> = {
  credito: { label: "Crédito", sinal: "+", ativo: "bg-credit text-primary-foreground", icone: "bg-credit-soft text-credit", texto: "text-credit" },
  debito: { label: "Débito", sinal: "−", ativo: "bg-debit text-primary-foreground", icone: "bg-debit-soft text-debit", texto: "text-debit" },
  aplicacao: { label: "Aplicação", sinal: "↑", ativo: "bg-saved text-primary-foreground", icone: "bg-saved-soft text-saved", texto: "text-saved" },
  resgate: { label: "Resgate", sinal: "↓", ativo: "bg-saved text-primary-foreground", icone: "bg-saved-soft text-saved", texto: "text-saved" },
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Index() {
  const { grupo } = useGrupo();
  const { linhas, recarregar } = useTabelaAoVivo<Lancamento>("lancamentos", grupo.id);
  const itens = useMemo(() => linhas.map((i) => ({ ...i, valor: Number(i.valor) })), [linhas]);
  const [tipo, setTipo] = useState<Tipo>("credito");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [filtro, setFiltro] = useState<"todos" | Tipo>("todos");
  const [conta, setConta] = useState<Conta>("dinheiro");
  const [mostrar, setMostrar] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [gasolina, setGasolina] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const { linhas: despesasMoto } = useTabelaAoVivo<DespesaMoto>("moto_despesas", grupo.id);
  const saldoMoto = totaisMoto(itens, despesasMoto).saldo;
  const admin = useSouAdmin();

  const totais = useMemo(() => {
    const din = itens.filter((i) => (i.conta ?? "dinheiro") === "dinheiro");
    const soma = (arr: typeof itens, t: Tipo) => arr.filter((i) => i.tipo === t && (t !== "debito" || i.pago)).reduce((s, i) => s + i.valor, 0);
    const vale = (c: Conta) => { const a = itens.filter((i) => i.conta === c); return soma(a, "credito") - soma(a, "debito"); };
    const c = soma(din, "credito");
    const d = soma(din, "debito");
    const aPagar = din.filter((i) => i.tipo === "debito" && !i.pago).reduce((s, i) => s + i.valor, 0);
    const guardado = soma(itens, "aplicacao") - soma(itens, "resgate");
    return { c, d, saldo: c - d - guardado, aPagar, guardado, alimentacao: vale("alimentacao"), refeicao: vale("refeicao") };
  }, [itens]);

  const lista = itens
    .filter((i) => filtro === "todos" || i.tipo === filtro || (filtro === "aplicacao" && i.tipo === "resgate"))
    .sort((a, b) => b.data.localeCompare(a.data));

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const v = parseFloat(valor.replace(",", "."));
    if (!descricao.trim() || !v || v <= 0) return;
    if (salvando) return;
    setSalvando(true); setErro("");
    const c = gasolina ? "dinheiro" : tipo === "credito" || tipo === "debito" ? conta : "dinheiro";
    const pago = tipo === "credito" || c !== "dinheiro";
    const { error } = await supabase.from("lancamentos").insert({ grupo_id: grupo.id, tipo, descricao: descricao.trim(), valor: v, data, conta: c, pago, ...(gasolina ? movimentacaoGasolina(v) : {}) });
    setSalvando(false);
    if (error) return setErro("Não foi possível adicionar. Tente novamente.");
    setDescricao(""); setValor("");
    recarregar();
  }
  const alternarPago = async (i: Lancamento) => { await supabase.from("lancamentos").update({ pago: !i.pago }).eq("id", i.id); recarregar(); };
  const excluir = async (id: string) => {
    const { error, count } = await supabase.from("lancamentos").delete({ count: "exact" }).eq("id", id);
    if (error || !count) alert("Só o administrador pode excluir movimentações.");
    recarregar();
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Meu caixa</p>
        <h1 className="font-display text-5xl">Minhas Finanças</h1>
      </header>

      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
        <section className="col-span-3 rounded-xl bg-primary p-3 text-primary-foreground">
          <p className="text-xs opacity-80">Dinheiro disponível</p>
          <p className="font-display truncate text-lg sm:text-xl">{brl(totais.saldo)}</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div><p className="opacity-70">Créditos</p><p className="font-semibold">{brl(totais.c)}</p></div>
            <div><p className="opacity-70">Débitos pagos</p><p className="font-semibold">{brl(totais.d)}</p></div>
            <div><p className="opacity-70">Falta pagar</p><p className="font-semibold">{brl(totais.aPagar)}</p></div>
          </div>
        </section>
        <section className="rounded-xl bg-saved p-3 text-primary-foreground">
          <p className="text-xs opacity-80">Dinheiro guardado</p>
          <p className="font-display truncate text-base sm:text-xl">{brl(totais.guardado)}</p>
          <p className="mt-1 text-xs opacity-70">Aplicações menos resgates. Não entra no disponível.</p>
        </section>
        <section className="rounded-xl bg-credit p-3 text-primary-foreground">
          <p className="text-xs opacity-80">Alimentação</p>
          <p className="font-display truncate text-base sm:text-xl">{brl(totais.alimentacao)}</p>
          <p className="mt-1 text-xs opacity-70">Saldo do vale-alimentação.</p>
        </section>
        <section className="rounded-xl bg-debit p-3 text-primary-foreground">
          <p className="text-xs opacity-80">Refeição</p>
          <p className="font-display truncate text-base sm:text-xl">{brl(totais.refeicao)}</p>
          <p className="mt-1 text-xs opacity-70">Saldo do vale-refeição.</p>
        </section>
        <section className="col-span-3 flex items-center justify-between gap-3 border-b py-3">
          <p className="flex items-center gap-2 text-sm"><Fuel className="h-4 w-4 text-saved" />Gasolina da moto</p>
          <p className="font-display text-lg text-saved">{brl(saldoMoto)}</p>
        </section>
      </div>

      <form onSubmit={adicionar} className="mb-8 space-y-4 rounded-xl border bg-card p-5">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1 sm:grid-cols-4">
          {(Object.keys(INFO) as Tipo[]).map((t) => (
            <button key={t} type="button" onClick={() => { setTipo(t); setGasolina(false); }}
              className={`rounded-md py-2 text-sm font-semibold transition ${!gasolina && tipo === t ? INFO[t].ativo : "text-muted-foreground"}`}>
              {INFO[t].sinal} {INFO[t].label}
            </button>
          ))}
        </div>
        <Button type="button" variant={gasolina ? "default" : "outline"} className="w-full" aria-pressed={gasolina} onClick={() => { setGasolina(true); setTipo("debito"); setConta("dinheiro"); }}><Fuel />Destinar para gasolina</Button>
        {gasolina && <p className="text-sm text-muted-foreground">Dinheiro → Gasolina da moto</p>}
        {!gasolina && (tipo === "credito" || tipo === "debito") && (
          <div>
            <p className="mb-2 text-sm text-muted-foreground">{tipo === "debito" ? "Pagou com:" : "Entrou em:"}</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(CONTAS) as Conta[]).map((c) => (
                <button key={c} type="button" onClick={() => setConta(c)}
                  className={`rounded-lg border py-2 text-sm font-semibold ${conta === c ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                  {CONTAS[c]}
                </button>
              ))}
            </div>
          </div>
        )}
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (ex: Salário, Aluguel)"
          className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
        <div className="grid grid-cols-2 gap-3">
          <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="Valor (R$)"
            className="rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
          <input type="date" value={data} onChange={(e) => setData(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <Button disabled={salvando} className="w-full">{salvando ? "Salvando…" : gasolina ? "Adicionar dinheiro para gasolina" : "Adicionar"}</Button>
        {erro && <p role="alert" className="text-sm text-debit">{erro}</p>}
      </form>

      <div className="mb-3 flex flex-wrap gap-2">
        {(["todos", "credito", "debito", "aplicacao"] as const).map((f) => (
          <button key={f} onClick={() => { setFiltro(f); setMostrar(true); }}
            className={`rounded-full border px-4 py-1 text-sm ${mostrar && filtro === f ? "bg-foreground text-background" : ""}`}>
            {f === "todos" ? "Todos" : f === "credito" ? "Créditos" : f === "debito" ? "Débitos" : "Guardado"}
          </button>
        ))}
        <button onClick={() => setMostrar((m) => !m)}
          className={`rounded-full border px-4 py-1 text-sm ${!mostrar ? "bg-foreground text-background" : ""}`}>
          {mostrar ? "Ocultar lista" : "Lista oculta"}
        </button>
      </div>

      {mostrar && <ul className="space-y-2">
        {lista.length === 0 && <li className="py-10 text-center text-muted-foreground">Nenhum lançamento ainda.</li>}
        {lista.map((i) => editando === i.id ? (
          <EditarLinha key={i.id} item={i} onFechar={() => { setEditando(null); recarregar(); }} />
        ) : (
          <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full font-bold ${INFO[i.tipo].icone}`}>
              {INFO[i.tipo].sinal}
            </span>
            <div className="flex-1">
              <p className={`font-semibold ${i.tipo === "debito" && i.pago ? "line-through opacity-60" : ""}`}>{i.descricao}</p>
              <p className="text-xs text-muted-foreground">{i.destino === "gasolina" ? "Destinado à gasolina" : INFO[i.tipo].label}{(i.tipo === "credito" || i.tipo === "debito") ? ` · ${CONTAS[i.conta ?? "dinheiro"]}` : ""} · {new Date(i.data + "T00:00").toLocaleDateString("pt-BR")}</p>
            </div>
            {i.tipo === "debito" && i.destino !== "gasolina" && (
              <button onClick={() => alternarPago(i)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${i.pago ? "bg-credit-soft text-credit" : "bg-debit-soft text-debit"}`}>
                {i.pago ? "Pago" : "A pagar"}
              </button>
            )}
            <span className={`w-28 text-right font-semibold ${INFO[i.tipo].texto}`}>{brl(i.valor)}</span>
            <button onClick={() => setEditando(i.id)} aria-label="Editar"
              className="text-muted-foreground hover:text-foreground">✎</button>
            {admin && <button onClick={() => excluir(i.id)} aria-label="Excluir"
              className="text-muted-foreground hover:text-debit">✕</button>}
          </li>
        ))}
      </ul>}
    </main>
  );
}

function EditarLinha({ item, onFechar }: { item: Lancamento; onFechar: () => void }) {
  const [descricao, setDescricao] = useState(item.descricao);
  const [valor, setValor] = useState(String(item.valor).replace(".", ","));
  const [data, setData] = useState(item.data);
  const [conta, setConta] = useState<Conta>(item.conta ?? "dinheiro");
  const comConta = item.destino !== "gasolina" && (item.tipo === "credito" || item.tipo === "debito");
  async function salvar() {
    const v = parseFloat(valor.replace(",", "."));
    if (!descricao.trim() || !v || v <= 0) return alert("Preencha descrição e valor.");
    const { error } = await supabase.from("lancamentos").update({ descricao: descricao.trim(), valor: v, data, conta: comConta ? conta : "dinheiro" }).eq("id", item.id);
    if (error) return alert("Não foi possível salvar.");
    onFechar();
  }
  const campo = "rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring";
  return (
    <li className="space-y-3 rounded-lg border-2 border-primary bg-card p-4">
      <p className="text-sm font-semibold">Editar {INFO[item.tipo].label.toLowerCase()}</p>
      <input value={descricao} onChange={(e) => setDescricao(e.target.value)} className={`w-full ${campo}`} />
      <div className="grid grid-cols-2 gap-3">
        <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" className={campo} />
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
      </div>
      {comConta && (
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(CONTAS) as Conta[]).map((c) => (
            <button key={c} type="button" onClick={() => setConta(c)}
              className={`rounded-lg border py-2 text-sm font-semibold ${conta === c ? "bg-foreground text-background" : "text-muted-foreground"}`}>
              {CONTAS[c]}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={salvar} className="flex-1 rounded-lg bg-primary py-2 font-semibold text-primary-foreground">Salvar</button>
        <button onClick={onFechar} className="flex-1 rounded-lg border py-2 font-semibold">Cancelar</button>
      </div>
    </li>
  );
}
