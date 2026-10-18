export const TEMAS = [
  { id: 'original', nome: 'Original', cores: ['oklch(0.97 0.012 85)', 'oklch(0.3 0.04 160)'] },
  { id: 'light', nome: 'Claro', cores: ['oklch(0.985 0.004 250)', 'oklch(0.42 0.13 250)'] },
  { id: 'dark', nome: 'Noturno', cores: ['oklch(0.19 0.018 250)', 'oklch(0.78 0.12 175)'] },
  { id: 'rose', nome: 'Rosé', cores: ['oklch(0.965 0.018 20)', 'oklch(0.43 0.13 15)'] },
] as const;
export type Tema = (typeof TEMAS)[number]['id'];
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