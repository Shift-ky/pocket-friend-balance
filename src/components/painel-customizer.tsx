import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ORDEM_PADRAO_BLOCOS, PREFERENCIAS_PADRAO_PAINEL, type AlturaCartaoPainel, type LarguraCartaoPainel, type PainelBlocoId, type PreferenciasPainel } from "@/lib/painel-preferencias";
import type { CartaoPainelId } from "@/lib/ordem-painel";

const nomesBlocos: Record<PainelBlocoId, string> = {
  saldos: "Caixas de saldo",
  termometro: "Indicadores do mês",
  meta: "Meta ativa",
  categorias: "Gastos por categoria",
  fluxo: "Entradas e saídas por mês",
};
const nomesCaixas: Record<CartaoPainelId, string> = {
  patrimonio: "Patrimônio consolidado",
  financeiro: "Financeiro / Dinheiro",
  beneficios: "Benefícios",
  poupanca: "Poupança",
};
const blocos = ORDEM_PADRAO_BLOCOS;
const larguras: { valor: LarguraCartaoPainel; rotulo: string }[] = [
  { valor: 1, rotulo: "1 coluna · 25%" },
  { valor: 2, rotulo: "2 colunas · 50%" },
  { valor: 3, rotulo: "3 colunas · 75%" },
  { valor: 4, rotulo: "4 colunas · largura total" },
];
const alturas: { valor: AlturaCartaoPainel; rotulo: string }[] = [
  { valor: "compacta", rotulo: "Baixa" },
  { valor: "media", rotulo: "Média" },
  { valor: "alta", rotulo: "Alta" },
];

function moverBloco(ordem: PainelBlocoId[], id: PainelBlocoId, delta: -1 | 1) {
  const from = ordem.indexOf(id);
  const to = Math.max(0, Math.min(ordem.length - 1, from + delta));
  if (from < 0 || from === to) return ordem;
  const next = [...ordem];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

export function PainelCustomizer({ value, onChange, saving, error, status, onSave, onCancel }: {
  value: PreferenciasPainel;
  onChange: (next: PreferenciasPainel) => void;
  saving: boolean;
  error: string;
  status: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  return <section className="mb-8 space-y-6 rounded-xl border bg-card p-4 sm:p-6" aria-labelledby="painel-custom-title">
    <div><h2 id="painel-custom-title" className="font-display text-2xl">Personalizar painel</h2><p className="mt-1 text-sm text-muted-foreground">Escolha o que aparece, a ordem, o espaço de cada caixa e os gráficos.</p></div>
    <fieldset className="space-y-3"><legend className="mb-2 text-sm font-semibold">Blocos do painel</legend>
      {blocos.map(id => <label key={id} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={value.blocosVisiveis[id]} onChange={e => onChange({ ...value, blocosVisiveis: { ...value.blocosVisiveis, [id]: e.target.checked } })} />{nomesBlocos[id]}</label>)}
    </fieldset>
    <div><h3 className="mb-2 text-sm font-semibold">Ordem dos blocos</h3><ol className="space-y-2">{value.ordemBlocos.map((id, i) => <li key={id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"><span>{i + 1}. {nomesBlocos[id]}</span><span className="flex gap-1"><Button type="button" variant="outline" size="icon" aria-label={`Mover ${nomesBlocos[id]} para cima`} disabled={saving || i === 0} onClick={() => onChange({ ...value, ordemBlocos: moverBloco(value.ordemBlocos, id, -1) })}><ChevronUp /></Button><Button type="button" variant="outline" size="icon" aria-label={`Mover ${nomesBlocos[id]} para baixo`} disabled={saving || i === value.ordemBlocos.length - 1} onClick={() => onChange({ ...value, ordemBlocos: moverBloco(value.ordemBlocos, id, 1) })}><ChevronDown /></Button></span></li>)}</ol></div>
    <fieldset className="space-y-3"><legend className="mb-2 text-sm font-semibold">Caixas de saldo</legend>{Object.keys(nomesCaixas).map(id => {const key=id as CartaoPainelId;return <div key={id} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1.2fr_1fr_1fr] sm:items-center">
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={value.caixasVisiveis[key]} onChange={e=>onChange({...value,caixasVisiveis:{...value.caixasVisiveis,[key]:e.target.checked}})}/>{nomesCaixas[key]}</label>
      <label className="text-xs text-muted-foreground">Largura<select aria-label={`Largura da caixa ${nomesCaixas[key]}`} value={value.largurasCaixas[key]} onChange={e=>onChange({...value,largurasCaixas:{...value.largurasCaixas,[key]:Number(e.target.value) as LarguraCartaoPainel}})} className="mt-1 w-full rounded-md border bg-background px-3 py-2">{larguras.map(op=><option key={op.valor} value={op.valor}>{op.rotulo}</option>)}</select></label>
      <label className="text-xs text-muted-foreground">Altura mínima<select aria-label={`Altura mínima da caixa ${nomesCaixas[key]}`} value={value.alturasCaixas[key]} onChange={e=>onChange({...value,alturasCaixas:{...value.alturasCaixas,[key]:e.target.value as AlturaCartaoPainel}})} className="mt-1 w-full rounded-md border bg-background px-3 py-2">{alturas.map(op=><option key={op.valor} value={op.valor}>{op.rotulo}</option>)}</select></label>
    </div>;})}<p className="text-xs text-muted-foreground">A largura se ajusta ao espaço disponível no celular e no computador. A altura escolhida é mínima e cresce quando o conteúdo precisar.</p></fieldset>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">Colunas para gráficos<select value={value.colunasGraficos} onChange={e=>onChange({...value,colunasGraficos:Number(e.target.value) as 1|2})} className="mt-1 w-full rounded-md border bg-background px-3 py-2"><option value={1}>Uma coluna</option><option value={2}>Duas colunas em telas grandes</option></select></label>
      <label className="text-sm">Gráfico de categorias<select value={value.graficoCategorias} onChange={e=>onChange({...value,graficoCategorias:e.target.value as PreferenciasPainel["graficoCategorias"]})} className="mt-1 w-full rounded-md border bg-background px-3 py-2"><option value="rosca">Rosca</option><option value="pizza">Pizza</option><option value="barras">Barras</option></select></label>
      <label className="text-sm">Gráfico de entradas e saídas<select value={value.graficoFluxo} onChange={e=>onChange({...value,graficoFluxo:e.target.value as PreferenciasPainel["graficoFluxo"]})} className="mt-1 w-full rounded-md border bg-background px-3 py-2"><option value="barras">Barras</option><option value="linhas">Linhas</option><option value="area">Área</option></select></label>
    </div>
    {error && <p role="alert" className="text-sm text-debit">{error}</p>}
    {status && <p role="status" className="text-sm text-primary">{status}</p>}
    <div className="flex flex-wrap gap-2"><Button type="button" disabled={saving} onClick={onSave}>{saving?"Salvando…":"Salvar personalização"}</Button><Button type="button" variant="outline" disabled={saving} onClick={onCancel}>Cancelar</Button><Button type="button" variant="ghost" disabled={saving} onClick={()=>onChange(PREFERENCIAS_PADRAO_PAINEL)}>Restaurar padrão</Button></div>
  </section>;
}
