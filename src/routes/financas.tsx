import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGrupo } from "@/lib/grupo";
import { Button } from "@/components/ui/button";
import { Fuel } from "lucide-react";
import { movimentacaoGasolina } from "@/lib/moto";

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
  const { grupo } = useGrupo();
  const [tipo, setTipo] = useState<Tipo>("credito");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [conta, setConta] = useState<Conta>("dinheiro");
  const [gasolina, setGasolina] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const v = parseFloat(valor.replace(",", "."));
    if (!descricao.trim() || !v || v <= 0) return;
    if (salvando) return;
    setSalvando(true); setErro(""); setSucesso("");
    const c = gasolina ? "dinheiro" : tipo === "credito" || tipo === "debito" ? conta : "dinheiro";
    const pago = tipo === "credito" || c !== "dinheiro";
    const { error } = await supabase.from("lancamentos").insert({ grupo_id: grupo.id, tipo, descricao: descricao.trim(), valor: v, data, conta: c, pago, ...(gasolina ? movimentacaoGasolina(v) : {}) });
    setSalvando(false);
    if (error) return setErro("Não foi possível adicionar. Tente novamente.");
    setDescricao(""); setValor("");
    setSucesso("Lançamento salvo.");
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
        <Button type="button" variant={gasolina ? "default" : "outline"} className="w-full" aria-pressed={gasolina} onClick={() => { setGasolina(true); setTipo("debito"); setConta("dinheiro"); }}><Fuel />Destinar para gasolina</Button>
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
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (ex: Salário, Aluguel)"
          className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
        <div className="grid grid-cols-2 gap-3">
          <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="Valor (R$)"
            className="min-w-0 w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
          <input type="date" value={data} onChange={(e) => setData(e.target.value)}
            className="min-w-0 w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <Button disabled={salvando} className="w-full">{salvando ? "Salvando…" : gasolina ? "Adicionar dinheiro para gasolina" : "Adicionar"}</Button>
        {sucesso && <p role="status" className="text-sm text-credit">{sucesso}</p>}
        {erro && <p role="alert" className="text-sm text-debit">{erro}</p>}
      </form>

    </main>
  );
}

