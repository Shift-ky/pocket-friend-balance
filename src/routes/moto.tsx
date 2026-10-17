import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Fuel, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useGrupo, useTabelaAoVivo } from "@/lib/grupo";
import { useSouAdmin } from "@/lib/use-admin";
import { totaisMoto, type AporteGasolina, type DespesaMoto } from "@/lib/moto";

export const Route = createFileRoute("/moto")({
  head: () => ({ meta: [
    { title: "Moto — Gasolina e abastecimentos" },
    { name: "description", content: "Saldo de gasolina e histórico de despesas da sua moto em dinheiro." },
    { property: "og:title", content: "Moto — Gasolina e abastecimentos" },
    { property: "og:description", content: "Acompanhe o dinheiro reservado e os abastecimentos da moto." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Moto,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const campo = "min-w-0 w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring";

function Moto() {
  const { grupo } = useGrupo();
  const { linhas: aportes } = useTabelaAoVivo<AporteGasolina>("lancamentos", grupo.id);
  const { linhas: despesas, recarregar } = useTabelaAoVivo<DespesaMoto>("moto_despesas", grupo.id);
  const admin = useSouAdmin();
  const totais = totaisMoto(aportes, despesas);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const historico = despesas.filter((d) => (!de || d.data >= de) && (!ate || d.data <= ate)).sort((a, b) => b.data.localeCompare(a.data));

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(valor.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return setErro("Informe um valor maior que zero.");
    setSalvando(true); setErro("");
    try {
      const { error } = await supabase.from("moto_despesas").insert({ grupo_id: grupo.id, descricao: descricao.trim(), valor: v, data, conta: "dinheiro" });
      if (error) throw error;
      setDescricao(""); setValor(""); await recarregar();
    } catch { setErro("Não foi possível registrar o abastecimento. Tente novamente."); }
    finally { setSalvando(false); }
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este abastecimento?")) return;
    const { error, count } = await supabase.from("moto_despesas").delete({ count: "exact" }).eq("id", id).eq("grupo_id", grupo.id);
    if (error || !count) return setErro("Não foi possível excluir. Somente o administrador pode excluir despesas.");
    await recarregar();
  }

  return <main className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-10">
    <header className="mb-6 flex items-center gap-3">
      <Fuel className="h-9 w-9 text-primary" aria-hidden="true" />
      <div><p className="text-sm text-muted-foreground">Gasolina</p><h1 className="font-display text-4xl sm:text-5xl">Moto</h1></div>
    </header>
    <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-3 sm:gap-3">
      <section className="col-span-2 rounded-xl bg-saved p-3 text-primary-foreground md:col-span-1"><p className="text-xs opacity-80">Disponível para gasolina</p><p className="break-words font-display text-lg sm:text-xl">{brl(totais.saldo)}</p></section>
      <section className="rounded-xl bg-credit p-3 text-primary-foreground"><p className="text-xs opacity-80">Dinheiro destinado</p><p className="break-words font-display text-lg sm:text-xl">{brl(totais.reservado)}</p></section>
      <section className="rounded-xl bg-debit p-3 text-primary-foreground"><p className="text-xs opacity-80">Gasto com gasolina</p><p className="break-words font-display text-lg sm:text-xl">{brl(totais.gasto)}</p></section>
    </div>
    <div className="mb-6 flex justify-end"><Button asChild variant="outline"><Link to="/financas">Destinar dinheiro nas Finanças</Link></Button></div>
    <section className="mb-8 border-y py-5">
      <h2 className="mb-4 font-display text-2xl">Registrar abastecimento</h2>
      <form onSubmit={registrar} className="space-y-3">
        <label className="block text-sm">Posto ou descrição<input required value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Abastecimento no posto" className={`${campo} mt-1`} /></label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">Valor (R$)<input required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className={`${campo} mt-1`} /></label>
          <label className="block text-sm">Data<input required type="date" value={data} onChange={(e) => setData(e.target.value)} className={`${campo} mt-1`} /></label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Pagamento: Dinheiro · Pago</span><Button disabled={salvando} type="submit"><Plus />{salvando ? "Salvando…" : "Registrar abastecimento"}</Button></div>
      </form>
      {erro && <p role="alert" className="mt-3 text-sm text-debit">{erro}</p>}
    </section>
    <section>
      <h2 className="mb-3 font-display text-2xl">Histórico de abastecimentos</h2>
      <div className="mb-4 grid grid-cols-2 gap-2"><label className="text-sm">De<input type="date" value={de} onChange={(e) => setDe(e.target.value)} className={`${campo} mt-1`} /></label><label className="text-sm">Até<input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className={`${campo} mt-1`} /></label></div>
      {(de || ate) && <Button variant="outline" size="sm" className="mb-3" onClick={() => { setDe(""); setAte(""); }}>Todo o período</Button>}
      <p className="mb-3 text-sm text-muted-foreground">Total no período: <strong className="text-foreground">{brl(historico.reduce((s, d) => s + Number(d.valor), 0))}</strong></p>
      <ul className="space-y-2">
        {!historico.length && <li className="py-6 text-center text-muted-foreground">Nenhum abastecimento neste período.</li>}
        {historico.map((d) => <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
          <Fuel className="h-5 w-5 shrink-0 text-debit" />
          <div className="min-w-0 flex-1"><p className="break-words font-semibold">{d.descricao}</p><p className="text-xs text-muted-foreground">{new Date(d.data + "T00:00").toLocaleDateString("pt-BR")} · Dinheiro · Pago</p></div>
          <span className="font-semibold text-debit">− {brl(Number(d.valor))}</span>
          {admin && <Button size="icon" variant="ghost" aria-label="Excluir abastecimento" title="Excluir abastecimento" onClick={() => excluir(d.id)}><Trash2 /></Button>}
        </li>)}
      </ul>
    </section>
  </main>;
}