import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useSouAdmin } from "@/lib/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { useGrupo, useTabelaAoVivo } from "@/lib/grupo";
import { CATEGORIAS, lerRecibo } from "@/lib/recibos.functions";

export const Route = createFileRoute("/despesas")({
  head: () => ({
    meta: [
      { title: "Notas e Recibos — Minhas Finanças" },
      { name: "description", content: "Envie notas e recibos; a IA lê, categoriza e organiza suas despesas." },
      { property: "og:title", content: "Notas e Recibos" },
      { property: "og:description", content: "A IA lê suas notas e organiza as despesas para exportar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Despesas,
});

type Despesa = { id: string; data: string; fornecedor: string; categoria: string; descricao: string; valor: number };
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const lerArquivo = (f: File) => new Promise<string>((ok, erro) => { const r = new FileReader(); r.onload = () => ok(r.result as string); r.onerror = erro; r.readAsDataURL(f); });

function Despesas() {
  const { grupo } = useGrupo();
  const { linhas, recarregar } = useTabelaAoVivo<Despesa>("despesas", grupo.id);
  const itens = linhas.map((d) => ({ ...d, valor: Number(d.valor) })).sort((a, b) => b.data.localeCompare(a.data));
  const ler = useServerFn(lerRecibo);
  const [status, setStatus] = useState("");
  const [lendo, setLendo] = useState(false);

  async function enviar(files: FileList | null) {
    if (!files?.length) return;
    setLendo(true);
    const erros: string[] = [];
    for (const [n, f] of Array.from(files).entries()) {
      setStatus(`Lendo ${n + 1} de ${files.length}: ${f.name}…`);
      try { await ler({ data: { grupoId: grupo.id, nome: f.name, dataUrl: await lerArquivo(f) } }); }
      catch (e) { erros.push(`${f.name}: ${e instanceof Error ? e.message : "erro"}`); }
    }
    setLendo(false);
    setStatus(erros.length ? erros.join(" · ") : "Pronto! Despesas adicionadas.");
    recarregar();
  }

  const mudar = async (id: string, d: Partial<Despesa>) => { await supabase.from("despesas").update(d).eq("id", id); recarregar(); };
  const admin = useSouAdmin();
  const excluir = async (id: string) => { await supabase.from("despesas").delete().eq("id", id); recarregar(); };

  function exportar() {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = ["Data;Fornecedor;Categoria;Descrição;Valor",
      ...itens.map((d) => [d.data, esc(d.fornecedor), esc(d.categoria), esc(d.descricao), d.valor.toFixed(2).replace(".", ",")].join(";"))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "despesas.csv"; a.click();
  }

  const total = itens.reduce((s, d) => s + d.valor, 0);
  const porCat = CATEGORIAS.map((c) => ({ c, v: itens.filter((d) => d.categoria === c).reduce((s, d) => s + d.valor, 0) })).filter((x) => x.v > 0);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Comprovantes</p>
        <h1 className="font-display text-5xl">Notas e Recibos</h1>
      </header>

      <section className="mb-6 rounded-xl bg-primary p-3 text-primary-foreground">
        <p className="text-xs opacity-80">Total de despesas</p>
        <p className="font-display truncate text-lg sm:text-xl">{brl(total)}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {porCat.map((x) => <span key={x.c} className="rounded-full bg-background/20 px-3 py-1">{x.c}: {brl(x.v)}</span>)}
        </div>
      </section>

      <label className={`mb-3 block cursor-pointer rounded-xl border-2 border-dashed bg-card p-8 text-center ${lendo ? "opacity-60" : "hover:border-primary"}`}>
        <input type="file" multiple accept="image/*,application/pdf" capture="environment" className="hidden" disabled={lendo}
          onChange={(e) => { enviar(e.target.files); e.target.value = ""; }} />
        <p className="font-semibold">📷 Tirar foto ou enviar notas e recibos</p>
        <p className="text-sm text-muted-foreground">Fotos ou PDF. A IA lê e categoriza cada um.</p>
      </label>
      {status && <p className="mb-4 text-sm text-muted-foreground">{status}</p>}

      <div className="mb-3 flex justify-end">
        <button onClick={exportar} disabled={!itens.length} className="rounded-full border px-4 py-1 text-sm font-semibold disabled:opacity-50">⬇ Exportar planilha (CSV)</button>
      </div>

      <ul className="space-y-2">
        {itens.length === 0 && <li className="py-10 text-center text-muted-foreground">Nenhuma despesa ainda.</li>}
        {itens.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{d.fornecedor || "Sem nome"}</p>
              <p className="truncate text-xs text-muted-foreground">{new Date(d.data + "T00:00").toLocaleDateString("pt-BR")} · {d.descricao}</p>
            </div>
            <select value={d.categoria} onChange={(e) => mudar(d.id, { categoria: e.target.value })} className="rounded-md border bg-background px-2 py-1 text-sm">
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
            <span className="w-24 text-right font-semibold text-debit">{brl(d.valor)}</span>
            {admin && <button onClick={() => excluir(d.id)} aria-label="Excluir" className="text-muted-foreground hover:text-debit">✕</button>}
          </li>
        ))}
      </ul>
    </main>
  );
}
