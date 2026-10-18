export const TEMAS = [
  { id: 'original', nome: 'Original' },
  { id: 'light', nome: 'Claro' },
  { id: 'dark', nome: 'Noturno' },
  { id: 'rose', nome: 'Rosé' },
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