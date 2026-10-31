import { WalletsPage } from "@/components/wallets-page";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Fuel, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/offline-client";
import { useGrupo } from "@/lib/grupo";

export const Route = createFileRoute("/moto")({
  head: () => ({ meta: [
    { title: "MarIA — Carteiras · Moto" },
    { name: "description", content: "Registre as despesas de gasolina da sua moto em dinheiro." },
    { property: "og:title", content: "MarIA — Carteiras · Moto" },
    { property: "og:description", content: "Registre abastecimentos pagos em dinheiro." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: WalletsPage,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const campo = "min-w-0 w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring";

function Moto() {
  const { grupo } = useGrupo();
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);
  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(valor.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return setErro("Informe um valor maior que zero.");
    setSalvando(true); setErro(""); setSucesso("");
    try {
      const { error } = await supabase.from("moto_despesas").insert({ grupo_id: grupo.id, descricao: descricao.trim(), valor: v, data, conta: "dinheiro" });
      if (error) throw error;
      setDescricao(""); setValor(""); setSucesso("Abastecimento registrado.");
    } catch { setErro("Não foi possível registrar o abastecimento. Tente novamente."); }
    finally { setSalvando(false); }
  }

  return <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-10">
    <header className="mb-6 flex items-center gap-3">
      <Fuel className="h-9 w-9 text-primary" aria-hidden="true" />
      <div><p className="text-sm text-muted-foreground">Gasolina</p><h1 className="font-display text-4xl sm:text-5xl">Moto</h1></div>
    </header>
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
      {sucesso && <p role="status" className="mt-3 text-sm text-credit">{sucesso}</p>}
      {erro && <p role="alert" className="mt-3 text-sm text-debit">{erro}</p>}
    </section>
  </main>;
}