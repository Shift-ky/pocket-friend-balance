import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGrupo } from "@/lib/grupo";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/lib/access-context";
import { CheckCircle2, Clock, Fuel } from "lucide-react";
import { movimentacaoGasolina } from "@/lib/moto";
import { parcelarLancamento } from "@/lib/parcelamento";

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
const CONTAS: Record<Conta, string> = { dinheiro: "Dinheiro", alimentacao: "Alimentação", refeicao: "Refeição" };

const INFO: Record<Tipo, { label: string; sinal: string; ativo: string; icone: string; texto: string }> = {
  credito: { label: "Crédito", sinal: "+", ativo: "bg-credit text-primary-foreground", icone: "bg-credit-soft text-credit", texto: "text-credit" },
  debito: { label: "Débito", sinal: "−", ativo: "bg-debit text-primary-foreground", icone: "bg-debit-soft text-debit", texto: "text-debit" },
  aplicacao: { label: "Aplicação", sinal: "↑", ativo: "bg-saved text-primary-foreground", icone: "bg-saved-soft text-saved", texto: "text-saved" },
  resgate: { label: "Resgate", sinal: "↓", ativo: "bg-saved text-primary-foreground", icone: "bg-saved-soft text-saved", texto: "text-saved" },
};

function Index() {
  const access = useAccess();
  const { grupo } = useGrupo();
  const [tipo, setTipo] = useState<Tipo>("credito");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [conta, setConta] = useState<Conta>("dinheiro");
  const [destinarGasolina, setGasolina] = useState(false);
  const gasolina = access.moto && destinarGasolina;
  const [parcelas, setParcelas] = useState("1");
  const [pago, setPago] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!access.financas || (gasolina && !access.moto)) return setErro("Você não tem acesso a este lançamento.");
    const v = parseFloat(valor.replace(",", "."));
    if (!descricao.trim() || !v || v <= 0) return;
    if (salvando) return;
    setSalvando(true); setErro(""); setSucesso("");
    const c = gasolina ? "dinheiro" : tipo === "credito" || tipo === "debito" ? conta : "dinheiro";
    const pagamento = gasolina ? true : tipo === "debito" ? pago : tipo === "credito";
    let registros;
    try {
      registros = parcelarLancamento({ grupo_id: grupo.id, tipo, descricao: descricao.trim(), valor: v, data, conta: c, pago: pagamento, ...(gasolina ? movimentacaoGasolina(v) : {}) }, Number(parcelas));
    } catch (error) {
      setSalvando(false);
      setErro(error instanceof Error ? error.message : "Verifique as parcelas.");
      return;
    }
    const { error } = await supabase.from("lancamentos").insert(registros);
    setSalvando(false);
    if (error) return setErro("Não foi possível adicionar. Tente novamente.");
    setDescricao(""); setValor(""); setParcelas("1");
    setSucesso(registros.length > 1 ? `${registros.length} parcelas salvas.` : "Lançamento salvo.");
  }
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-10">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Meu caixa</p>
        <h1 className="font-display text-3xl sm:text-5xl">Finanças</h1>
      </header>

      <form onSubmit={adicionar} className="mb-8 space-y-4 border-y py-6">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1 sm:grid-cols-4">
          {(Object.keys(INFO) as Tipo[]).map((t) => (
            <Button key={t} variant="ghost" aria-pressed={!gasolina && tipo === t} type="button" onClick={() => { setTipo(t); setGasolina(false); }}
              className={`rounded-md py-2 text-sm font-semibold transition ${!gasolina && tipo === t ? INFO[t].ativo : "text-muted-foreground"}`}>
              {INFO[t].sinal} {INFO[t].label}
            </Button>
          ))}
        </div>
        {access.moto && <Button type="button" variant={gasolina ? "default" : "outline"} className="w-full" aria-pressed={gasolina} onClick={() => { setGasolina(true); setTipo("debito"); setConta("dinheiro"); }}><Fuel />Destinar para gasolina</Button>}
        {gasolina && <p className="text-sm text-muted-foreground">Dinheiro → Gasolina da moto</p>}
        {!gasolina && (tipo === "credito" || tipo === "debito") && (
          <div>
            <p className="mb-2 text-sm text-muted-foreground">{tipo === "debito" ? "Pagou com:" : "Entrou em:"}</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(CONTAS) as Conta[]).map((c) => (
                <Button key={c} variant="ghost" aria-pressed={conta === c} type="button" onClick={() => setConta(c)}
                  className={`rounded-lg border py-2 text-sm font-semibold ${conta === c ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                  {CONTAS[c]}
                </Button>
              ))}
            </div>
          </div>
        )}
        {!gasolina && tipo === "debito" && <fieldset>
          <legend className="mb-2 text-sm text-muted-foreground">Situação da conta</legend>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={pago ? "outline" : "default"} aria-pressed={!pago} onClick={() => setPago(false)}><Clock className="h-4 w-4" />Pendente</Button>
            <Button type="button" variant={pago ? "default" : "outline"} aria-pressed={pago} onClick={() => setPago(true)}><CheckCircle2 className="h-4 w-4" />Já pago</Button>
          </div>
        </fieldset>}
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (ex: Salário, Aluguel)"
          className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
        <div className="grid grid-cols-2 gap-3">
          <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="Valor (R$)"
            className="min-w-0 w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
          <input type="date" value={data} onChange={(e) => setData(e.target.value)}
            className="min-w-0 w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
        </div>
        {!gasolina && tipo === "debito" && conta === "dinheiro" && <label className="block text-sm text-muted-foreground">Quantidade de parcelas
          <input aria-label="Quantidade de parcelas" type="number" min="1" step="1" required value={parcelas} onChange={e => setParcelas(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring" />
        </label>}
        <Button disabled={salvando} className="w-full">{salvando ? "Salvando…" : gasolina ? "Adicionar dinheiro para gasolina" : "Adicionar"}</Button>
        {sucesso && <p role="status" className="text-sm text-credit">{sucesso}</p>}
        {erro && <p role="alert" className="text-sm text-debit">{erro}</p>}
      </form>

    </main>
  );
}

