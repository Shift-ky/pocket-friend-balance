export const TEMAS = [
  { id: 'original', nome: 'Original' },
  { id: 'light', nome: 'Claro' },
  { id: 'dark', nome: 'Noturno' },
  { id: 'rose', nome: 'Rosé' },
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