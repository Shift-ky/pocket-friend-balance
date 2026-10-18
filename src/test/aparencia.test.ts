import { describe, expect, it } from 'vitest';
import { temaValido, validarImagemFundo, coresValidas, visibilidadeValida } from '@/lib/aparencia';

describe('personalização', () => {
  it('preserva a porcentagem escolhida para a foto', () => expect(visibilidadeValida(75)).toBe(75));
  it('aceita ocultar totalmente a foto', () => expect(visibilidadeValida(0)).toBe(0));
  it('aceita visibilidade completa da foto', () => expect(visibilidadeValida(100)).toBe(100));
  it('limita porcentagens ao intervalo permitido', () => { expect(visibilidadeValida(-1)).toBe(0); expect(visibilidadeValida(101)).toBe(100); });
  it('mantém cores independentes para cada parte', () => expect(coresValidas({ background: '#123456', credit: '#abcdef' })).toEqual({ background: '#123456', credit: '#abcdef' }));
  it('recusa valores arbitrários e partes desconhecidas', () => expect(coresValidas({ primary: 'url(x)', qualquer: '#123456' })).toEqual({}));
  it('aceita imagem de até 5 MB', () => expect(validarImagemFundo({ type: 'image/webp', size: 5 * 1024 * 1024 })).toEqual({ extensao: 'webp' }));
  it('recusa imagem acima de 5 MB', () => expect(validarImagemFundo({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toHaveProperty('erro'));
  it('volta ao tema original quando o tema é desconhecido', () => expect(temaValido('outro')).toBe('original'));
});