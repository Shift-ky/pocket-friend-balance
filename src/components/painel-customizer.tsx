import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FONTES_WIDGET, novoIdPainel, PREFERENCIAS_PADRAO_PAINEL, type AlturaCartaoPainel, type DashboardPainel, type FonteWidgetPainel, type LarguraCartaoPainel, type PreferenciasPainel, type SecaoPainel, type WidgetPainel } from "@/lib/painel-preferencias";

const field = "w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm";
const classesGradePrevia: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };
const classesLarguraPrevia: Record<number, string> = { 1: "col-span-1", 2: "col-span-2", 3: "col-span-3", 4: "col-span-4" };
const alturas: { value: AlturaCartaoPainel; label: string }[] = [
  { value: "compacta", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

function move<T>(items: T[], index: number, delta: -1 | 1) {
  const destination = Math.max(0, Math.min(items.length - 1, index + delta));
  if (destination === index) return items;
  const next = [...items];
  return next.map((item, position) => position === index ? items[destination] ?? item : position === destination ? items[index] ?? item : item);

}

function fontePadrao(fonte: FonteWidgetPainel): WidgetPainel["grafico"] {
  if (fonte === "gastos_categoria") return "rosca";
  if (fonte === "fluxo_mensal") return "barras";
  return undefined;
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
  const dashboard = value.dashboards.find(item => item.id === value.dashboardAtualId) ?? value.dashboards[0] ?? PREFERENCIAS_PADRAO_PAINEL.dashboards[0];
  if (!dashboard) return null;

  function updateDashboard(updater: (current: DashboardPainel) => DashboardPainel) {
    onChange({ ...value, dashboards: value.dashboards.map(item => item.id === dashboard?.id ? updater(item) : item) });
  }
  function updateSection(sectionId: string, updater: (section: SecaoPainel) => SecaoPainel) {
    updateDashboard(current => ({ ...current, secoes: current.secoes.map(section => section.id === sectionId ? updater(section) : section) }));
  }
  function updateWidget(sectionId: string, widgetId: string, updater: (widget: WidgetPainel) => WidgetPainel) {
    updateSection(sectionId, section => ({ ...section, widgets: section.widgets.map(widget => widget.id === widgetId ? updater(widget) : widget) }));
  }
  function addDashboard() {
    const id = novoIdPainel("dashboard");
    const sectionId = novoIdPainel("secao");
    onChange({
      ...value,
      dashboardAtualId: id,
      dashboards: [...value.dashboards, { id, nome: `Dashboard ${value.dashboards.length + 1}`, secoes: [{ id: sectionId, nome: "Resumo", colunas: 2, widgets: [] }] }],
    });
  }
  function addSection() {
    const index = (dashboard?.secoes.length ?? 0) + 1;
    updateDashboard(current => ({ ...current, secoes: [...current.secoes, { id: novoIdPainel("secao"), nome: `Seção ${index}`, colunas: 2, widgets: [] }] }));
  }
  function addWidget(section: SecaoPainel) {
    const fonte: FonteWidgetPainel = "financeiro";
    const name = FONTES_WIDGET.find(item => item.id === fonte)?.nome ?? "Saldo financeiro";
    updateSection(section.id, current => ({ ...current, widgets: [...current.widgets, { id: novoIdPainel("caixa"), fonte, titulo: name, largura: 1, altura: "media" }] }));
  }
  function deleteDashboard() {
    if (value.dashboards.length <= 1) return;
    const dashboards = value.dashboards.filter(item => item.id !== dashboard?.id);
    onChange({ ...value, dashboards, dashboardAtualId: dashboards[0]?.id ?? value.dashboardAtualId });
  }

  return <section className="mb-8 space-y-6 rounded-xl border bg-card p-4 sm:p-6" aria-labelledby="painel-custom-title">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 id="painel-custom-title" className="font-display text-2xl">Montar dashboard</h2><p className="mt-1 text-sm text-muted-foreground">Crie dashboards, seções e caixas com os indicadores e gráficos do aplicativo.</p></div>
      <Button type="button" variant="outline" size="sm" disabled={saving} onClick={addDashboard}><Plus />Novo dashboard</Button>
    </header>

    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <label className="text-sm">Nome deste dashboard<input aria-label="Nome do dashboard" maxLength={60} value={dashboard.nome} onChange={event => updateDashboard(current => ({ ...current, nome: event.target.value }))} className={`${field} mt-1`} /></label>
      <Button type="button" variant="ghost" size="sm" disabled={saving || value.dashboards.length <= 1} onClick={deleteDashboard}><Trash2 />Excluir dashboard</Button>
    </div>

    <div className="space-y-4">
      {dashboard.secoes.map((section, sectionIndex) => <section key={section.id} className="space-y-4 rounded-lg border p-3 sm:p-4" aria-label={section.nome}>
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <label className="text-sm">Nome da seção<input aria-label="Nome da seção" maxLength={60} value={section.nome} onChange={event => updateSection(section.id, current => ({ ...current, nome: event.target.value }))} className={`${field} mt-1`} /></label>
          <label className="text-sm">Colunas no computador<select aria-label="Colunas da seção" value={section.colunas} onChange={event => {
            const colunas = Number(event.target.value) as LarguraCartaoPainel;
            updateSection(section.id, current => ({ ...current, colunas, widgets: current.widgets.map(widget => ({ ...widget, largura: Math.min(widget.largura, colunas) as LarguraCartaoPainel })) }));
          }} className={`${field} mt-1`}>{[1, 2, 3, 4].map(value => <option key={value} value={value}>{value} {value === 1 ? "coluna" : "colunas"}</option>)}</select></label>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="icon" aria-label="Mover seção para cima" disabled={saving || sectionIndex === 0} onClick={() => updateDashboard(current => ({ ...current, secoes: move(current.secoes, sectionIndex, -1) }))}><ChevronUp /></Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Mover seção para baixo" disabled={saving || sectionIndex === dashboard.secoes.length - 1} onClick={() => updateDashboard(current => ({ ...current, secoes: move(current.secoes, sectionIndex, 1) }))}><ChevronDown /></Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Excluir seção" disabled={saving} onClick={() => updateDashboard(current => ({ ...current, secoes: current.secoes.filter(item => item.id !== section.id) }))}><Trash2 /></Button>
          </div>
        </div>

        {!section.widgets.length && <p className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">Esta seção está vazia. Adicione uma caixa para escolher o que mostrar.</p>}
        <div className="space-y-3">
          {section.widgets.map((widget, widgetIndex) => <div key={widget.id} className="space-y-2"><div className="grid gap-3 rounded-md bg-muted/30 p-3 lg:grid-cols-[1.4fr_1fr_1fr_130px_130px_120px_auto] lg:items-end">
            <label className="text-xs text-muted-foreground">O que esta caixa mostra<select aria-label="Indicador da caixa" value={widget.fonte} onChange={event => {
              const fonte = event.target.value as FonteWidgetPainel;
              const source = FONTES_WIDGET.find(item => item.id === fonte);
              if (!source) return;
              updateWidget(section.id, widget.id, current => ({ ...current, fonte, titulo: source.nome, grafico: fontePadrao(fonte) }));
            }} className={`${field} mt-1`}>{["Saldos", "Finanças", "Metas", "Gráficos"].map(group => <optgroup key={group} label={group}>{FONTES_WIDGET.filter(source => source.grupo === group).map(source => <option key={source.id} value={source.id}>{source.nome}</option>)}</optgroup>)}</select><span className="mt-1 block">{FONTES_WIDGET.find(source => source.id === widget.fonte)?.descricao}</span></label>
            <label className="text-xs text-muted-foreground">Título da caixa<input aria-label="Título da caixa" maxLength={60} value={widget.titulo} onChange={event => updateWidget(section.id, widget.id, current => ({ ...current, titulo: event.target.value }))} className={`${field} mt-1`} /></label>
            <label className="text-xs text-muted-foreground">Largura da caixa<select aria-label="Largura da caixa" value={widget.largura} onChange={event => { const largura = Number(event.target.value) as LarguraCartaoPainel; updateSection(section.id, current => ({ ...current, colunas: Math.max(current.colunas, largura) as LarguraCartaoPainel, widgets: current.widgets.map(item => item.id === widget.id ? { ...item, largura } : item) })); }} className={`${field} mt-1`}>{[1, 2, 3, 4].map(value => <option key={value} value={value}>{value} {value === 1 ? "coluna" : "colunas"}</option>)}</select><span className="mt-1 block">A seção se expande quando necessário; no celular, a caixa se ajusta à tela.</span></label>
            <label className="text-xs text-muted-foreground">Altura mínima<select aria-label="Altura da caixa" value={widget.altura} onChange={event => updateWidget(section.id, widget.id, current => ({ ...current, altura: event.target.value as AlturaCartaoPainel }))} className={`${field} mt-1`}>{alturas.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <div className="text-xs text-muted-foreground">
              <label className="block">Cor da caixa<input type="color" aria-label="Cor da caixa" value={widget.cor ?? "#93c5fd"} onChange={event => updateWidget(section.id, widget.id, current => ({ ...current, cor: event.target.value }))} className="mt-1 block h-10 w-14 cursor-pointer rounded border bg-background p-1" /></label>
              <div className="mt-1 flex items-center gap-2"><span>{widget.cor ? widget.cor.toUpperCase() : "Padrão do tema"}</span>{widget.cor && <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => updateWidget(section.id, widget.id, current => ({ ...current, cor: undefined }))}>Limpar</Button>}</div>
            </div>
            <label className="text-xs text-muted-foreground">Gráfico<select aria-label="Tipo de gráfico" value={widget.grafico ?? fontePadrao(widget.fonte) ?? ""} disabled={widget.fonte !== "gastos_categoria" && widget.fonte !== "fluxo_mensal"} onChange={event => updateWidget(section.id, widget.id, current => ({ ...current, grafico: event.target.value as WidgetPainel["grafico"] }))} className={`${field} mt-1`}>
              {widget.fonte === "gastos_categoria" ? <><option value="rosca">Rosca</option><option value="pizza">Pizza</option><option value="barras">Barras</option></> : <><option value="barras">Barras</option><option value="linhas">Linhas</option><option value="area">Área</option></>}
            </select></label>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" aria-label="Mover caixa para cima" disabled={saving || widgetIndex === 0} onClick={() => updateSection(section.id, current => ({ ...current, widgets: move(current.widgets, widgetIndex, -1) }))}><ChevronUp /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Mover caixa para baixo" disabled={saving || widgetIndex === section.widgets.length - 1} onClick={() => updateSection(section.id, current => ({ ...current, widgets: move(current.widgets, widgetIndex, 1) }))}><ChevronDown /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Excluir caixa" disabled={saving} onClick={() => updateSection(section.id, current => ({ ...current, widgets: current.widgets.filter(item => item.id !== widget.id) }))}><Trash2 /></Button>
            </div>
          </div>
          <div className="rounded-md border border-dashed p-3" aria-label="Prévia da largura da caixa">
            <div className="flex flex-wrap justify-between gap-1 text-xs text-muted-foreground"><span>Prévia da largura da caixa</span><span>{widget.largura} {widget.largura === 1 ? "coluna" : "colunas"}</span></div>
            <div className={`mt-2 grid gap-2 ${classesGradePrevia[section.colunas] ?? classesGradePrevia[2]}`}>
              <div className={`h-8 rounded-md border-2 border-primary/70 bg-primary/10 transition-all ${classesLarguraPrevia[widget.largura] ?? classesLarguraPrevia[1]}`} />
            </div>
          </div>
        </div>)}
        </div>
        <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => addWidget(section)}><Plus />Adicionar caixa</Button>
      </section>)}
    </div>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" disabled={saving} onClick={addSection}><Plus />Adicionar seção</Button>
      <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => {
        const padrao = PREFERENCIAS_PADRAO_PAINEL.dashboards[0];
        if (padrao) updateDashboard(current => ({ ...padrao, id: current.id, nome: current.nome }));
      }}>Restaurar padrão desta visão</Button>
    </div>
    {error && <p role="alert" className="text-sm text-debit">{error}</p>}
    {status && <p role="status" className="text-sm text-primary">{status}</p>}
    <div className="flex flex-wrap gap-2"><Button type="button" disabled={saving} onClick={onSave}>{saving ? "Salvando…" : "Salvar dashboard"}</Button><Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>Fechar sem salvar</Button></div>
  </section>;
}
