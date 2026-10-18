import { describe, expect, it } from 'vitest';
import { temaValido, validarImagemFundo } from '@/lib/aparencia';

describe('personalização', () => {
  it('aceita imagem de até 5 MB', () => expect(validarImagemFundo({ type: 'image/webp', size: 5 * 1024 * 1024 })).toEqual({ extensao: 'webp' }));
  it('recusa imagem acima de 5 MB', () => expect(validarImagemFundo({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toHaveProperty('erro'));
  it('volta ao tema original quando o tema é desconhecido', () => expect(temaValido('outro')).toBe('original'));
});