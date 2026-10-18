import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGrupo, useTabelaAoVivo } from "@/lib/grupo";
import { entrarNoEstoque } from "@/lib/estoque";
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { StockSortableItem } from '@/components/stock-sortable-item';
import { Button } from '@/components/ui/button';
import { ordenarEstoque } from '@/lib/ordem-estoque';
import { agruparEstoque, moverNaDivisao, type DivisaoEstoque } from '@/lib/divisoes-estoque';
import { StockDivisions } from '@/components/stock-divisions';

export const Route = createFileRoute("/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Minhas Finanças" },
      { name: "description", content: "Controle o estoque de casa e reponha o que falta na lista da feira." },
      { property: "og:title", content: "Estoque de casa" },
      { property: "og:description", content: "Controle o que tem em casa e gere a lista da feira com o que falta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Estoque,
});

type Prod = { id: string; nome: string; qtd: number; padrao: number; ordem: number | null; divisao_id: string | null };
const input = "rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring";
const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;

function Estoque() {
  const { grupo } = useGrupo();
  const { linhas, recarregar } = useTabelaAoVivo<Prod>("estoque", grupo.id);
  const { linhas: divisoes, recarregar: recarregarDivisoes } = useTabelaAoVivo<DivisaoEstoque>('estoque_divisoes', grupo.id);
  const [ordemLocal, setOrdemLocal] = useState<string[] | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroOrdem, setErroOrdem] = useState('');
  const ordenados = ordenarEstoque(linhas.map((p) => ({ ...p, qtd: Number(p.qtd), padrao: Number(p.padrao) })));
  const prods = ordemLocal ? [...ordenados].sort((a, b) => ordemLocal.indexOf(a.id) - ordemLocal.indexOf(b.id)) : ordenados;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const [nome, setNome] = useState("");
  const [qtd, setQtd] = useState("1");
  const faltando = prods.filter((p) => p.qtd < p.padrao).length;
  const secoes = agruparEstoque(prods, divisoes);
  async function atualizarDivisoes() { await recarregarDivisoes(); await recarregar(); }
  async function mudarDivisao(p: Prod, divisao: string) {
    const { error } = await supabase.from('estoque').update({ divisao_id: divisao || null }).eq('id', p.id).eq('grupo_id', grupo.id);
    if (error) setErroOrdem('Não foi possível mover o produto para essa divisão.');
    else { setErroOrdem(''); await recarregar(); }
  }

  async function reordenar({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id || salvando) return;
    const ids = moverNaDivisao(prods, String(active.id), String(over.id));
    if (ids.every((id, i) => id === prods[i]?.id)) return;
    setOrdemLocal(ids); setSalvando(true); setErroOrdem('');
    try {
      const { error } = await supabase.rpc('ordenar_estoque', { _grupo_id: grupo.id, _ids: ids });
      if (error) throw error;
      await recarregar();
    } catch {
      setErroOrdem('Não foi possível salvar a ordem. Tente novamente.');
      await recarregar();
    } finally {
      setOrdemLocal(null); setSalvando(false);
    }
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    await entrarNoEstoque(grupo.id, [{ nome, qtd: num(qtd) || 1 }]);
    setNome(""); setQtd("1"); recarregar();
  }

  async function mudarQtd(p: Prod, nova: number) {
    nova = Math.max(0, nova);
    await supabase.from("estoque").update({ qtd: nova }).eq("id", p.id);

    recarregar();
  }

  async function mudarPadrao(p: Prod, padrao: number) {
    await supabase.from("estoque").update({ padrao }).eq("id", p.id);

    recarregar();
  }

  async function excluir(p: Prod) {
    if (confirm(`Tirar "${p.nome}" do estoque?`)) { await supabase.from("estoque").delete().eq("id", p.id); recarregar(); }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <h1 className="font-display text-4xl sm:text-5xl">Estoque</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Compras finalizadas na Feira entram aqui sozinhas. Quando um produto fica abaixo do padrão, o que falta vai para a lista da Feira.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Produtos</p><p className="text-xl font-bold">{prods.length}</p></div>
        <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Abaixo do padrão</p><p className="text-xl font-bold text-debit">{faltando}</p></div>
      </div>

      <form onSubmit={adicionar} className="mt-5 grid grid-cols-[minmax(0,1fr)_5rem_auto] gap-2">
        <input className={`${input} min-w-0 w-full`} placeholder="Produto (ex.: Arroz)" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input className={`${input} min-w-0 w-full`} inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} aria-label="Quantidade" />
        <Button type="submit" className="h-auto px-4 font-semibold">Adicionar</Button>
      </form>
      <StockDivisions grupoId={grupo.id} divisoes={divisoes} atualizar={atualizarDivisoes} />

      <p role="status" className="mt-2 text-sm text-muted-foreground">{salvando ? 'Salvando ordem…' : ''}</p>
      {erroOrdem && <p role="alert" className="text-sm text-debit">{erroOrdem}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reordenar}>
      {secoes.filter(s => s.id || s.produtos.length || prods.length === 0).map(secao => <section key={secao.id} className="mt-6" aria-label={`Produtos: ${secao.nome}`}>
      <div className="mb-3 flex items-center justify-between gap-3 border-b pb-2"><h2 className="min-w-0 break-words font-display text-xl">{secao.nome}</h2><span className="text-xs text-muted-foreground">{secao.produtos.length}</span></div>
      <SortableContext items={secao.produtos.map(p => p.id)} strategy={verticalListSortingStrategy}>
      <ul className="space-y-2">
        {secao.produtos.length === 0 && <li className="py-3 text-sm text-muted-foreground">Nenhum produto nesta divisão.</li>}
        {secao.produtos.map((p) => (
          <StockSortableItem key={p.id} id={p.id} nome={p.nome} abaixo={p.qtd < p.padrao} disabled={salvando}>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate font-semibold">{p.nome}</p>
              {p.qtd < p.padrao && <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase text-debit">Repor</span>}
              <Button variant="ghost" size="icon" onClick={() => excluir(p)} aria-label="Excluir" className="text-muted-foreground hover:text-debit">✕</Button>
            </div>
            <label className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">Divisão
              <select aria-label={`Divisão de ${p.nome}`} disabled={salvando} value={p.divisao_id ?? ''} onChange={e => mudarDivisao(p, e.target.value)} className="min-w-0 max-w-full flex-1 rounded-md border bg-background px-2 py-1 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"><option value="">Sem divisão</option>{divisoes.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}</select>
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => mudarQtd(p, p.qtd - 1)} className="rounded-full text-lg font-bold" aria-label="Diminuir">−</Button>
                <span className="w-10 text-center text-lg font-bold">{p.qtd}</span>
                <Button variant="outline" size="icon" onClick={() => mudarQtd(p, p.qtd + 1)} className="rounded-full text-lg font-bold" aria-label="Aumentar">+</Button>
              </div>
              <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                Padrão
                <input key={p.padrao} className={`${input} w-16 py-1`} inputMode="decimal" defaultValue={p.padrao}
                  onBlur={(e) => { const v = num(e.target.value); if (v !== p.padrao) mudarPadrao(p, v); }} />
              </label>
            </div>
          </StockSortableItem>
        ))}
      </ul>
      </SortableContext>
      </section>)}
      </DndContext>
    </main>
  );
}
