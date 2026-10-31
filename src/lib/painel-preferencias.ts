import { ORDEM_PADRAO_PAINEL, type CartaoPainelId } from "@/lib/ordem-painel";

export const ORDEM_PADRAO_BLOCOS = ["saldos", "termometro", "meta", "categorias", "fluxo"] as const;
export type PainelBlocoId = (typeof ORDEM_PADRAO_BLOCOS)[number];
export type LarguraCartaoPainel = 1 | 2 | 3 | 4;
export type AlturaCartaoPainel = "compacta" | "media" | "alta";
export type TipoGraficoCategorias = "pizza" | "rosca" | "barras";
export type TipoGraficoFluxo = "barras" | "linhas" | "area";

export type PreferenciasPainel = {
  blocosVisiveis: Record<PainelBlocoId, boolean>;
  caixasVisiveis: Record<CartaoPainelId, boolean>;
  ordemBlocos: PainelBlocoId[];
  largurasCaixas: Record<CartaoPainelId, LarguraCartaoPainel>;
  alturasCaixas: Record<CartaoPainelId, AlturaCartaoPainel>;
  colunasGraficos: 1 | 2;
  graficoCategorias: TipoGraficoCategorias;
  graficoFluxo: TipoGraficoFluxo;
};

export const PREFERENCIAS_PADRAO_PAINEL: PreferenciasPainel = {
  blocosVisiveis: { saldos: true, termometro: true, meta: true, categorias: true, fluxo: true },
  caixasVisiveis: { patrimonio: true, financeiro: true, beneficios: true, poupanca: true },
  ordemBlocos: [...ORDEM_PADRAO_BLOCOS],
  largurasCaixas: { patrimonio: 2, financeiro: 1, beneficios: 1, poupanca: 1 },
  alturasCaixas: { patrimonio: "media", financeiro: "compacta", beneficios: "compacta", poupanca: "compacta" },
  colunasGraficos: 2,
  graficoCategorias: "rosca",
  graficoFluxo: "barras",
};

function larguraValida(value: unknown): value is LarguraCartaoPainel {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

export function normalizarPreferenciasPainel(value: unknown): PreferenciasPainel {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const visibleRaw = raw.blocosVisiveis && typeof raw.blocosVisiveis === "object" ? raw.blocosVisiveis as Record<string, unknown> : {};
  const cardsRaw = raw.caixasVisiveis && typeof raw.caixasVisiveis === "object" ? raw.caixasVisiveis as Record<string, unknown> : {};
  const widthsRaw = raw.largurasCaixas && typeof raw.largurasCaixas === "object" ? raw.largurasCaixas as Record<string, unknown> : {};
  const heightsRaw = raw.alturasCaixas && typeof raw.alturasCaixas === "object" ? raw.alturasCaixas as Record<string, unknown> : {};
  const oldSizesRaw = raw.tamanhosCaixas && typeof raw.tamanhosCaixas === "object" ? raw.tamanhosCaixas as Record<string, unknown> : {};
  const visible = { ...PREFERENCIAS_PADRAO_PAINEL.blocosVisiveis };
  const cards = { ...PREFERENCIAS_PADRAO_PAINEL.caixasVisiveis };
  const widths = { ...PREFERENCIAS_PADRAO_PAINEL.largurasCaixas };
  const heights = { ...PREFERENCIAS_PADRAO_PAINEL.alturasCaixas };
  for (const id of ORDEM_PADRAO_BLOCOS) if (typeof visibleRaw[id] === "boolean") visible[id] = visibleRaw[id] as boolean;
  for (const id of ORDEM_PADRAO_PAINEL) {
    if (typeof cardsRaw[id] === "boolean") cards[id] = cardsRaw[id] as boolean;
    if (larguraValida(widthsRaw[id])) widths[id] = widthsRaw[id];
    else if (oldSizesRaw[id] === "compacto") widths[id] = 1;
    else if (oldSizesRaw[id] === "medio") widths[id] = 2;
    else if (oldSizesRaw[id] === "grande") widths[id] = 4;
    if (heightsRaw[id] === "compacta" || heightsRaw[id] === "media" || heightsRaw[id] === "alta") heights[id] = heightsRaw[id];
  }
  const ordemInput = Array.isArray(raw.ordemBlocos) ? raw.ordemBlocos.filter((id): id is PainelBlocoId => typeof id === "string" && ORDEM_PADRAO_BLOCOS.includes(id as PainelBlocoId)) : [];
  const ordemBlocos = [...new Set(ordemInput), ...ORDEM_PADRAO_BLOCOS.filter(id => !ordemInput.includes(id))];
  return {
    blocosVisiveis: visible,
    caixasVisiveis: cards,
    ordemBlocos,
    largurasCaixas: widths,
    alturasCaixas: heights,
    colunasGraficos: raw.colunasGraficos === 1 ? 1 : 2,
    graficoCategorias: raw.graficoCategorias === "pizza" || raw.graficoCategorias === "barras" ? raw.graficoCategorias : "rosca",
    graficoFluxo: raw.graficoFluxo === "linhas" || raw.graficoFluxo === "area" ? raw.graficoFluxo : "barras",
  };
}
