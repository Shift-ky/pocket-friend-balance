import { FinanceHistory } from '@/components/finance-history';
import { useCarteiras } from '@/hooks/use-carteiras';
import { aceitaTransferencia,contaLegada } from '@/lib/carteiras';
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/offline-client";
import { useGrupo } from "@/lib/grupo";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/lib/access-context";
import { CheckCircle2, Clock, ArrowRightLeft, ChevronDown, ChevronUp } from "lucide-react";
import { parcelarLancamento } from "@/lib/parcelamento";

export const Route = createFileRoute("/financas")({
  head: () => ({
    meta: [
      { title: "MarIA — Créditos e Débitos" },
      { name: "description", content: "Controle o que você recebe e o que precisa pagar." },
      { property: "og:title", content: "MarIA — Créditos e Débitos" },
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
  const {carteiras,metas}=useCarteiras();
  const [formAberto,setFormAberto]=useState(false);
  const [transferencia,setTransferencia]=useState(false);
  const [walletId,setWalletId]=useState('');
  const [destinoId,setDestinoId]=useState('');
  const [categoria,setCategoria]=useState('Outros');
  const elegiveis=carteiras.filter(w=>aceitaTransferencia(w,metas));
  const [tipo, setTipo] = useState<Tipo>("credito");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [conta, setConta] = useState<Conta>("dinheiro");
  const wallet=carteiras.find(w=>w.id===walletId)??carteiras.find(w=>w.legado===conta);
  const [parcelas, setParcelas] = useState("1");
  const [pago, setPago] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  useEffect(() => {
    if (!sucesso) return;
    const t = setTimeout(() => setSucesso(""), 4000);
    return () => clearTimeout(t);
  }, [sucesso]);
  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!access.financas) return setErro("Você não tem acesso a este lançamento.");
    const v = parseFloat(valor.replace(",", "."));
    if (!descricao.trim() || !Number.isFinite(v) || v <= 0) return;
    if (salvando) return;
    if (!confirmando) { setErro(""); setSucesso(""); setConfirmando(true); return; }
    setConfirmando(false);
    setSalvando(true); setErro(""); setSucesso("");
    const dest=carteiras.find(w=>w.id===destinoId);
    if(transferencia && (!wallet||!dest||wallet.id===dest.id||!aceitaTransferencia(wallet,metas)||!aceitaTransferencia(dest,metas))){setSalvando(false);return setErro('Escolha duas carteiras elegíveis diferentes.');}
    const c = wallet ? contaLegada(wallet) : conta;
    const pagamento = tipo === "debito" ? pago : tipo === "credito";
    let registros: import("@/integrations/supabase/types").TablesInsert<"lancamentos">[];
    try {
      if(transferencia && wallet && dest){const tid=crypto.randomUUID();registros=[{grupo_id:grupo.id,tipo:'debito' as const,descricao:descricao.trim(),valor:v,data,conta:contaLegada(wallet),pago:true,carteira_id:wallet.id,transferencia_id:tid,categoria:'Transferência interna'},{grupo_id:grupo.id,tipo:'credito' as const,descricao:descricao.trim(),valor:v,data,conta:contaLegada(dest),pago:true,carteira_id:dest.id,transferencia_id:tid,categoria:'Transferência interna'}];}
      else registros = parcelarLancamento({ grupo_id: grupo.id, tipo, descricao: descricao.trim(), valor: v, data, conta: c, pago: pagamento, carteira_id:wallet?.id??null,categoria }, wallet?.moeda!=='BRL'?1:Number(parcelas));
    } catch (error) {
      setSalvando(false);
      setErro(error instanceof Error ? error.message : "Verifique as parcelas.");
      return;
    }
    const { error } = await supabase.from("lancamentos").insert(registros);
    setSalvando(false);
    if (error) return setErro(error.message);
    setDescricao(""); setValor(""); setParcelas("1");
    setSucesso(transferencia ? "Transferência conciliada salva." : registros.length > 1 ? `${registros.length} parcelas salvas.` : "Lançamento salvo.");
  }
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-10">
      {sucesso && (
        <div role="status" className="fixed inset-x-0 top-4 z-50 mx-auto w-fit max-w-[90vw] rounded-lg bg-credit px-4 py-2 text-center text-sm font-semibold text-primary-foreground shadow-lg">
          {sucesso}
        </div>
      )}
      <header className="mb-8">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Meu caixa</p>
        <h1 className="font-display text-3xl sm:text-5xl">Finanças</h1>
      </header>

      <Button variant="outline" className="mb-4 w-full justify-between" aria-expanded={formAberto} onClick={()=>setFormAberto(v=>!v)}>Novo lançamento{formAberto?<ChevronUp/>:<ChevronDown/>}</Button>
      {formAberto && <form onSubmit={adicionar} className="mb-8 space-y-4 border-y py-6">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1 sm:grid-cols-4">
          {(Object.keys(INFO) as Tipo[]).map((t) => (
            <Button key={t} variant="ghost" aria-pressed={tipo === t} type="button" onClick={() => { setTipo(t);setTransferencia(false); }}
              className={`rounded-md py-2 text-sm font-semibold transition ${tipo === t ? INFO[t].ativo : "text-muted-foreground"}`}>
              {INFO[t].sinal} {INFO[t].label}
            </Button>
          ))}
        </div>
        <Button type="button" variant={transferencia?'default':'outline'} className="w-full" aria-pressed={transferencia} onClick={()=>{setTransferencia(true);setConfirmando(false);setWalletId(elegiveis[0]?.id??'');setDestinoId(elegiveis[1]?.id??'');}}><ArrowRightLeft/>Transferência</Button>
        <label className="block text-sm">{transferencia?'Carteira de origem':'Carteira'}<select required aria-label={transferencia?'Carteira de origem':'Carteira do lançamento'} value={wallet?.id??''} onChange={e=>{setWalletId(e.target.value);const w=carteiras.find(w=>w.id===e.target.value);if(w)setConta(contaLegada(w));setConfirmando(false);}} className="mt-1 w-full min-w-0 rounded-md border bg-background px-3 py-2">{(transferencia?elegiveis:carteiras.filter(w=>w.legado!=='gasolina')).map(w=><option key={w.id} value={w.id}>{w.nome} · {w.moeda}</option>)}</select></label>
        {transferencia&&<label className="block text-sm">Carteira de destino<select required aria-label="Carteira de destino" value={destinoId} onChange={e=>{setDestinoId(e.target.value);setConfirmando(false);}} className="mt-1 w-full rounded-md border bg-background px-3 py-2"><option value="">Selecionar</option>{elegiveis.filter(w=>w.id!==wallet?.id).map(w=><option key={w.id} value={w.id}>{w.nome}</option>)}</select></label>}
        {!transferencia && tipo === "debito" && <fieldset>
          <legend className="mb-2 text-sm text-muted-foreground">Situação da conta</legend>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={pago ? "outline" : "default"} aria-pressed={!pago} onClick={() => setPago(false)}><Clock className="h-4 w-4" />Pendente</Button>
            <Button type="button" variant={pago ? "default" : "outline"} aria-pressed={pago} onClick={() => setPago(true)}><CheckCircle2 className="h-4 w-4" />Já pago</Button>
          </div>
        </fieldset>}
        {!transferencia&&<label className="block text-sm">Categoria<input aria-label="Categoria" value={categoria} onChange={e=>setCategoria(e.target.value)} maxLength={100} className="mt-1 w-full rounded-md border bg-background px-3 py-2"/></label>}
        <input aria-label="Descrição do lançamento" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (ex: Salário, Aluguel)"
          className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
        <div className="grid grid-cols-2 gap-3">
          <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" aria-label="Valor do lançamento" placeholder={`Valor (${transferencia?'BRL':wallet?.moeda??'BRL'})`}
            className="min-w-0 w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
          <input type="date" value={data} onChange={(e) => setData(e.target.value)}
            className="min-w-0 w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
        </div>
        {!transferencia && tipo === "debito" && conta === "dinheiro" && <label className="block text-sm text-muted-foreground">Quantidade de parcelas
          <input aria-label="Quantidade de parcelas" type="number" min="1" step="1" required value={parcelas} onChange={e => setParcelas(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring" />
        </label>}
        {confirmando && (
          <div className="space-y-2 rounded-lg border-2 border-primary bg-card p-3">
            <p className="text-sm font-semibold">Confirmar lançamento?</p>
            <p className="text-sm text-muted-foreground">
              {transferencia?"Transferência":INFO[tipo].label} de {wallet?.moeda??"BRL"} {valor.replace(".", ",")} — {descricao.trim()}
            </p>
            <div className="flex gap-2">
              <Button type="submit" disabled={salvando} className="flex-1">{salvando ? "Salvando…" : "Confirmar"}</Button>
              <Button type="button" variant="outline" onClick={() => setConfirmando(false)} className="flex-1">Cancelar</Button>
            </div>
          </div>
        )}
        {!confirmando && <Button type="submit" disabled={salvando} className="w-full">{salvando ? "Salvando…" : "Adicionar"}</Button>}
        {erro && <p role="alert" className="text-sm text-debit">{erro}</p>}
      </form>}
      <FinanceHistory/>

    </main>
  );
}

