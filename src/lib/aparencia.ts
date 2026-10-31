export const TEMAS = [
  { id: 'original', nome: 'Original', descricao: 'Clássico e marcante' },
  { id: 'light', nome: 'Claro', descricao: 'Leve e minimalista' },
  { id: 'dark', nome: 'Noturno', descricao: 'Escuro e confortável' },
  { id: 'rose', nome: 'Rosé', descricao: 'Delicado e acolhedor' },
  { id: 'elegante', nome: 'Elegante', descricao: 'Neutros com toque dourado' },
  { id: 'lavanda', nome: 'Lavanda', descricao: 'Suave e criativo' },
  { id: 'sage', nome: 'Sálvia', descricao: 'Natural e sereno' },
  { id: 'praia', nome: 'Praia', descricao: 'Fresco e descontraído' },
  { id: 'alegre', nome: 'Alegre', descricao: 'Colorido e vibrante' },
] as const;
export type Tema = (typeof TEMAS)[number]['id'];
export const CORES_CORINGA = [
  { id: 'background', nome: 'Fundo da página' },
  { id: 'card', nome: 'Fundo dos quadros' },
  { id: 'foreground', nome: 'Textos' },
  { id: 'primary', nome: 'Botões e aba selecionada' },
  { id: 'muted', nome: 'Fundos secundários' },
  { id: 'muted-foreground', nome: 'Textos secundários' },
  { id: 'border', nome: 'Bordas' },
  { id: 'credit', nome: 'Entradas' },
  { id: 'debit', nome: 'Saídas e pendências' },
  { id: 'saved', nome: 'Reservas e aplicações' },
] as const;
export type CoresCoringa = Partial<Record<(typeof CORES_CORINGA)[number]['id'], string>>;

function matizDaCor(hex: string) {
  const values = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  const r = values[0] ?? 0;
  const g = values[1] ?? 0;
  const b = values[2] ?? 0;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0.55 : delta / (1 - Math.abs(2 * lightness - 1));
  return { hue: (hue + 360) % 360, saturation };
}

function hslParaHex(hue: number, saturation: number, lightness: number) {
  const h = ((hue % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  const [r, g, b] = h < 60 ? [chroma, x, 0] : h < 120 ? [x, chroma, 0] : h < 180 ? [0, chroma, x] : h < 240 ? [0, x, chroma] : h < 300 ? [x, 0, chroma] : [chroma, 0, x];
  const toHex = (channel: number) => Math.round((channel + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r ?? 0)}${toHex(g ?? 0)}${toHex(b ?? 0)}`;
}

export function gerarPaletaCoringa(corBase: string): CoresCoringa {
  const base = /^#[0-9a-f]{6}$/i.test(corBase) ? corBase.toLowerCase() : '#22e1ff';
  const { hue, saturation } = matizDaCor(base);
  const deslocar = (graus: number) => (hue + graus + 360) % 360;
  return {
    background: hslParaHex(hue, 0.16, 0.975),
    card: hslParaHex(hue, 0.1, 0.997),
    foreground: hslParaHex(deslocar(220), 0.2, 0.14),
    primary: hslParaHex(hue, Math.max(0.55, Math.min(saturation, 0.82)), 0.47),
    muted: hslParaHex(hue, 0.17, 0.935),
    'muted-foreground': hslParaHex(deslocar(220), 0.1, 0.42),
    border: hslParaHex(hue, 0.2, 0.84),
    credit: hslParaHex(deslocar(122), 0.56, 0.4),
    debit: hslParaHex(deslocar(350), 0.64, 0.47),
    saved: hslParaHex(deslocar(205), 0.5, 0.45),
  };
}
export function coresValidas(valor: unknown): CoresCoringa {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {};
  const resultado: CoresCoringa = {};
  for (const { id } of CORES_CORINGA) {
    const cor = (valor as Record<string, unknown>)[id];
    if (typeof cor === 'string' && /^#[0-9a-f]{6}$/i.test(cor)) resultado[id] = cor;
  }
  return resultado;
}
export function visibilidadeValida(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? Math.max(0, Math.min(100, Math.round(valor))) : 10;
}
export function textoDoBotao(cor: string): string {
  const canais = [1, 3, 5].map(i => parseInt(cor.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const luminancia = (canais[0] ?? 0) * 0.2126 + (canais[1] ?? 0) * 0.7152 + (canais[2] ?? 0) * 0.0722;
  return luminancia > 0.179 ? '#182235' : '#ffffff';
}
export const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;
const TIPOS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export function temaValido(valor: unknown): Tema {
  return TEMAS.some(t => t.id === valor) ? valor as Tema : 'original';
}

export function validarImagemFundo(arquivo: { type: string; size: number }) {
  const extensao = TIPOS[arquivo.type];
  if (!extensao) return { erro: 'Escolha uma imagem JPG, PNG ou WebP.' } as const;
  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) return { erro: 'A imagem precisa ter no máximo 5 MB.' } as const;
  return { extensao } as const;
}