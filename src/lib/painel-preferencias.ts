import { ORDEM_PADRAO_PAINEL, type CartaoPainelId } from "@/lib/ordem-painel";

export const ORDEM_PADRAO_BLOCOS = ["saldos", "termometro", "meta", "categorias", "fluxo"] as const;
export type PainelBlocoId = (typeof ORDEM_PADRAO_BLOCOS)[number];
export type TamanhoCartaoPainel = "compacto" | "medio" | "grande";
export type TipoGraficoCategorias = "pizza" | "rosca" | "barras";
export type TipoGraficoFluxo = "barras" | "linhas" | "area";

export type PreferenciasPainel = {
  blocosVisiveis: Record<PainelBlocoId, boolean>;
  caixasVisiveis: Record<CartaoPainelId, boolean>;
  ordemBlocos: PainelBlocoId[];
  tamanhosCaixas: Record<CartaoPainelId, TamanhoCartaoPainel>;
  colunasGraficos: 1 | 2;
  graficoCategorias: TipoGraficoCategorias;
  graficoFluxo: TipoGraficoFluxo;
};

export const PREFERENCIAS_PADRAO_PAINEL: PreferenciasPainel = {
  blocosVisiveis: { saldos: true, termometro: true, meta: true, categorias: true, fluxo: true },
  caixasVisiveis: { patrimonio: true, financeiro: true, beneficios: true, poupanca: true },
  ordemBlocos: [...ORDEM_PADRAO_BLOCOS],
  tamanhosCaixas: { patrimonio: "medio", financeiro: "compacto", beneficios: "compacto", poupanca: "compacto" },
  colunasGraficos: 2,
  graficoCategorias: "rosca",
  graficoFluxo: "barras",
};

export function normalizarPreferenciasPainel(value: unknown): PreferenciasPainel {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const visibleRaw = raw.blocosVisiveis && typeof raw.blocosVisiveis === "object" ? raw.blocosVisiveis as Record<string, unknown> : {};
  const cardsRaw = raw.caixasVisiveis && typeof raw.caixasVisiveis === "object" ? raw.caixasVisiveis as Record<string, unknown> : {};
  const sizesRaw = raw.tamanhosCaixas && typeof raw.tamanhosCaixas === "object" ? raw.tamanhosCaixas as Record<string, unknown> : {};
  const visible = { ...PREFERENCIAS_PADRAO_PAINEL.blocosVisiveis };
  const cards = { ...PREFERENCIAS_PADRAO_PAINEL.caixasVisiveis };
  const sizes = { ...PREFERENCIAS_PADRAO_PAINEL.tamanhosCaixas };
  for (const id of ORDEM_PADRAO_BLOCOS) if (typeof visibleRaw[id] === "boolean") visible[id] = visibleRaw[id] as boolean;
  for (const id of ORDEM_PADRAO_PAINEL) {
    if (typeof cardsRaw[id] === "boolean") cards[id] = cardsRaw[id] as boolean;
    if (sizesRaw[id] === "compacto" || sizesRaw[id] === "medio" || sizesRaw[id] === "grande") sizes[id] = sizesRaw[id];
  }
  const ordemInput = Array.isArray(raw.ordemBlocos) ? raw.ordemBlocos.filter((id): id is PainelBlocoId => typeof id === "string" && ORDEM_PADRAO_BLOCOS.includes(id as PainelBlocoId)) : [];
  const ordemBlocos = [...new Set(ordemInput), ...ORDEM_PADRAO_BLOCOS.filter(id => !ordemInput.includes(id))];
  return {
    blocosVisiveis: visible,
    caixasVisiveis: cards,
    ordemBlocos,
    tamanhosCaixas: sizes,
    colunasGraficos: raw.colunasGraficos === 1 ? 1 : 2,
    graficoCategorias: raw.graficoCategorias === "pizza" || raw.graficoCategorias === "barras" ? raw.graficoCategorias : "rosca",
    graficoFluxo: raw.graficoFluxo === "linhas" || raw.graficoFluxo === "area" ? raw.graficoFluxo : "barras",
  };
}
