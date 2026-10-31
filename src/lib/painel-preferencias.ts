import { ORDEM_PADRAO_PAINEL, type CartaoPainelId } from "@/lib/ordem-painel";

export const ORDEM_PADRAO_BLOCOS = ["saldos", "termometro", "meta", "categorias", "fluxo"] as const;
export type PainelBlocoId = (typeof ORDEM_PADRAO_BLOCOS)[number];
export type LarguraCartaoPainel = 1 | 2 | 3 | 4;
export type AlturaCartaoPainel = "compacta" | "media" | "alta";
export type TipoGraficoCategorias = "pizza" | "rosca" | "barras";
export type TipoGraficoFluxo = "barras" | "linhas" | "area";
export type FonteWidgetPainel =
  | "patrimonio" | "financeiro" | "beneficios" | "poupanca"
  | "entradas_mes" | "saidas_pagas_mes" | "contas_pendentes_mes" | "previsao_sobra" | "sobra_financeira"
  | "meta_ativa" | "gastos_categoria" | "fluxo_mensal" | "saldo_carteiras";

export type WidgetPainel = {
  id: string;
  fonte: FonteWidgetPainel;
  titulo: string;
  largura: LarguraCartaoPainel;
  altura: AlturaCartaoPainel;
  grafico?: TipoGraficoCategorias | TipoGraficoFluxo;
};
export type SecaoPainel = {
  id: string;
  nome: string;
  colunas: LarguraCartaoPainel;
  widgets: WidgetPainel[];
};
export type DashboardPainel = {
  id: string;
  nome: string;
  secoes: SecaoPainel[];
};
export type PreferenciasPainel = {
  dashboards: DashboardPainel[];
  dashboardAtualId: string;
};

export const FONTES_WIDGET: { id: FonteWidgetPainel; nome: string; descricao: string; grupo: string }[] = [
  { id: "patrimonio", nome: "Patrimônio consolidado", descricao: "Saldo de todas as carteiras visíveis convertido para reais.", grupo: "Saldos" },
  { id: "financeiro", nome: "Saldo financeiro", descricao: "Saldo das carteiras financeiras visíveis.", grupo: "Saldos" },
  { id: "beneficios", nome: "Saldo de benefícios", descricao: "Saldo das carteiras de benefícios.", grupo: "Saldos" },
  { id: "poupanca", nome: "Saldo de poupança", descricao: "Saldo das carteiras de poupança.", grupo: "Saldos" },
  { id: "entradas_mes", nome: "Entradas do mês", descricao: "Créditos lançados no mês selecionado.", grupo: "Finanças" },
  { id: "saidas_pagas_mes", nome: "Saídas pagas", descricao: "Débitos pagos no mês selecionado.", grupo: "Finanças" },
  { id: "contas_pendentes_mes", nome: "Contas pendentes", descricao: "Débitos ainda não pagos no mês selecionado.", grupo: "Finanças" },
  { id: "previsao_sobra", nome: "Previsão de sobra", descricao: "Entradas menos saídas pagas e contas pendentes do mês.", grupo: "Finanças" },
  { id: "sobra_financeira", nome: "Saldo financeiro do mês", descricao: "Variação das carteiras financeiras no mês selecionado.", grupo: "Finanças" },
  { id: "meta_ativa", nome: "Progresso da meta ativa", descricao: "Progresso e aporte sugerido da meta nas carteiras visíveis.", grupo: "Metas" },
  { id: "gastos_categoria", nome: "Gastos por categoria", descricao: "Saídas pagas agrupadas por categoria no mês.", grupo: "Gráficos" },
  { id: "fluxo_mensal", nome: "Entradas e saídas por mês", descricao: "Evolução mensal de entradas e saídas pagas.", grupo: "Gráficos" },
  { id: "saldo_carteiras", nome: "Saldo por carteira", descricao: "Saldo das carteiras visíveis, convertido para reais.", grupo: "Gráficos" },
];

export function novoIdPainel(prefixo = "item") {
  return `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function widget(id: string, fonte: FonteWidgetPainel, titulo: string, largura: LarguraCartaoPainel, altura: AlturaCartaoPainel, grafico?: WidgetPainel["grafico"]): WidgetPainel {
  return { id, fonte, titulo, largura, altura, ...(grafico ? { grafico } : {}) };
}

function dashboardPadrao(): DashboardPainel {
  return {
    id: "principal",
    nome: "Visão geral",
    secoes: [
      { id: "resumo", nome: "Saldos", colunas: 4, widgets: [
        widget("saldo-patrimonio", "patrimonio", "Patrimônio consolidado", 1, "media"),
        widget("saldo-financeiro", "financeiro", "Financeiro / Dinheiro", 1, "media"),
        widget("saldo-beneficios", "beneficios", "Benefícios", 1, "media"),
        widget("saldo-poupanca", "poupanca", "Poupança", 1, "media"),
      ] },
      { id: "mes", nome: "Mês selecionado", colunas: 3, widgets: [
        widget("mes-entradas", "entradas_mes", "Entradas", 1, "compacta"),
        widget("mes-saidas", "saidas_pagas_mes", "Saídas pagas", 1, "compacta"),
        widget("mes-sobra", "previsao_sobra", "Previsão de sobra", 1, "compacta"),
      ] },
      { id: "analise", nome: "Análise financeira", colunas: 2, widgets: [
        widget("grafico-categorias", "gastos_categoria", "Gastos por categoria", 1, "alta", "rosca"),
        widget("grafico-fluxo", "fluxo_mensal", "Entradas vs. saídas", 1, "alta", "barras"),
      ] },
      { id: "objetivo", nome: "Meta", colunas: 2, widgets: [
        widget("meta-ativa", "meta_ativa", "Meta ativa", 2, "media"),
      ] },
    ],
  };
}

export const PREFERENCIAS_PADRAO_PAINEL: PreferenciasPainel = {
  dashboards: [dashboardPadrao()],
  dashboardAtualId: "principal",
};

const validWidths = [1, 2, 3, 4] as const;
const isWidth = (value: unknown): value is LarguraCartaoPainel => typeof value === "number" && validWidths.includes(value as LarguraCartaoPainel);
const fonteValida = (value: unknown): value is FonteWidgetPainel => typeof value === "string" && FONTES_WIDGET.some(source => source.id === value);

function normalizarWidget(value: unknown, index: number): WidgetPainel | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (!fonteValida(raw.fonte)) return null;
  const fonte = raw.fonte;
  const source = FONTES_WIDGET.find(item => item.id === fonte)!;
  const titulo = typeof raw.titulo === "string" ? raw.titulo.slice(0, 60) : source.nome;
  const altura = raw.altura === "media" || raw.altura === "alta" ? raw.altura : "compacta";
  let grafico: WidgetPainel["grafico"];
  if (fonte === "gastos_categoria") grafico = raw.grafico === "pizza" || raw.grafico === "barras" ? raw.grafico : "rosca";
  if (fonte === "fluxo_mensal") grafico = raw.grafico === "linhas" || raw.grafico === "area" ? raw.grafico : "barras";
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id.slice(0, 80) : `widget-${index}`,
    fonte,
    titulo,
    largura: isWidth(raw.largura) ? raw.largura : 1,
    altura,
    ...(grafico ? { grafico } : {}),
  };
}

function normalizarDashboard(value: unknown, index: number): DashboardPainel | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const sections = Array.isArray(raw.secoes) ? raw.secoes : [];
  const secoes = sections.flatMap((section, sectionIndex) => {
    if (!section || typeof section !== "object") return [];
    const sectionRaw = section as Record<string, unknown>;
    const widgets = Array.isArray(sectionRaw.widgets) ? sectionRaw.widgets : [];
    return [{
      id: typeof sectionRaw.id === "string" && sectionRaw.id ? sectionRaw.id.slice(0, 80) : `secao-${index}-${sectionIndex}`,
      nome: (typeof sectionRaw.nome === "string" && sectionRaw.nome.trim() ? sectionRaw.nome : `Seção ${sectionIndex + 1}`).slice(0, 60),
      colunas: isWidth(sectionRaw.colunas) ? sectionRaw.colunas : 2,
      widgets: widgets.map((item, itemIndex) => normalizarWidget(item, itemIndex)).filter((item): item is WidgetPainel => item !== null),
    }];
  });
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id.slice(0, 80) : `dashboard-${index}`,
    nome: (typeof raw.nome === "string" && raw.nome.trim() ? raw.nome : `Dashboard ${index + 1}`).slice(0, 60),
    secoes,
  };
}

function migrarFormatoAntigo(raw: Record<string, unknown>): DashboardPainel {
  const visible = raw.blocosVisiveis && typeof raw.blocosVisiveis === "object" ? raw.blocosVisiveis as Record<string, unknown> : {};
  const visibleCards = raw.caixasVisiveis && typeof raw.caixasVisiveis === "object" ? raw.caixasVisiveis as Record<string, unknown> : {};
  const widths = raw.largurasCaixas && typeof raw.largurasCaixas === "object" ? raw.largurasCaixas as Record<string, unknown> : {};
  const heights = raw.alturasCaixas && typeof raw.alturasCaixas === "object" ? raw.alturasCaixas as Record<string, unknown> : {};
  const oldSizes = raw.tamanhosCaixas && typeof raw.tamanhosCaixas === "object" ? raw.tamanhosCaixas as Record<string, unknown> : {};
  const defaultBlocks = ["saldos", "termometro", "meta", "categorias", "fluxo"] as const;
  const inputOrder = Array.isArray(raw.ordemBlocos) ? raw.ordemBlocos.filter((id): id is PainelBlocoId => typeof id === "string" && defaultBlocks.includes(id as PainelBlocoId)) : [];
  const order = [...new Set(inputOrder), ...defaultBlocks.filter(id => !inputOrder.includes(id))];
  const walletWidgets = ORDEM_PADRAO_PAINEL.flatMap(id => {
    if (visibleCards[id] === false) return [];
    const oldWidth = widths[id];
    const width: LarguraCartaoPainel = isWidth(oldWidth) ? oldWidth : oldSizes[id] === "grande" ? 4 : oldSizes[id] === "medio" ? 2 : 1;
    const height: AlturaCartaoPainel = heights[id] === "media" || heights[id] === "alta" ? heights[id] : "compacta";
    const name = id === "patrimonio" ? "Patrimônio consolidado" : id === "financeiro" ? "Financeiro / Dinheiro" : id === "beneficios" ? "Benefícios" : "Poupança";
    return [widget(`saldo-${id}`, id, name, width, height)];
  });
  const mapping: Record<PainelBlocoId, SecaoPainel | null> = {
    saldos: visible.saldos === false ? null : { id: "resumo", nome: "Saldos", colunas: 4, widgets: walletWidgets },
    termometro: visible.termometro === false ? null : { id: "mes", nome: "Mês selecionado", colunas: 3, widgets: [
      widget("mes-entradas", "entradas_mes", "Entradas", 1, "compacta"),
      widget("mes-saidas", "saidas_pagas_mes", "Saídas pagas", 1, "compacta"),
      widget("mes-sobra", "previsao_sobra", "Previsão de sobra", 1, "compacta"),
    ] },
    meta: visible.meta === false ? null : { id: "objetivo", nome: "Meta", colunas: 2, widgets: [widget("meta-ativa", "meta_ativa", "Meta ativa", 2, "media")] },
    categorias: visible.categorias === false ? null : { id: "categorias", nome: "Análise por categoria", colunas: 2, widgets: [widget("grafico-categorias", "gastos_categoria", "Gastos por categoria", 1, "alta", raw.graficoCategorias === "pizza" || raw.graficoCategorias === "barras" ? raw.graficoCategorias : "rosca")] },
    fluxo: visible.fluxo === false ? null : { id: "fluxo", nome: "Fluxo mensal", colunas: 2, widgets: [widget("grafico-fluxo", "fluxo_mensal", "Entradas vs. saídas", 1, "alta", raw.graficoFluxo === "linhas" || raw.graficoFluxo === "area" ? raw.graficoFluxo : "barras")] },
  };
  return { id: "principal", nome: "Visão geral", secoes: order.flatMap(id => mapping[id] ? [mapping[id]!] : []) };
}

export function normalizarPreferenciasPainel(value: unknown): PreferenciasPainel {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const dashboardsRaw = Array.isArray(raw.dashboards) ? raw.dashboards : [migrarFormatoAntigo(raw)];
  const dashboards = dashboardsRaw.map((item, index) => normalizarDashboard(item, index)).filter((item): item is DashboardPainel => item !== null);
  const valid = dashboards.length ? dashboards : [dashboardPadrao()];
  const dashboardAtualId = typeof raw.dashboardAtualId === "string" && valid.some(dash => dash.id === raw.dashboardAtualId) ? raw.dashboardAtualId : valid[0].id;
  return { dashboards: valid, dashboardAtualId };
}
