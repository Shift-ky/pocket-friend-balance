import { describe, expect, it } from "vitest";
import { alternarPego, definirComprada, itensComprados, valorCarrinho, valorPrevisto } from "@/lib/feira";

const item = (over: Partial<{ qtd: number; qtd_comprada: number; preco: number; pego: boolean; nome: string }> = {}) => ({
  nome: "Arroz", qtd: 2, qtd_comprada: 0, preco: 10, pego: false, ...over,
});

describe("quantidade comprada da feira", () => {
  it("marcar o checkbox adiciona a quantidade prevista em comprados", () => {
    expect(alternarPego(item())).toEqual({ pego: true, qtd_comprada: 2 });
  });

  it("desmarcar o checkbox zera a quantidade comprada", () => {
    expect(alternarPego(item({ pego: true, qtd_comprada: 2 }))).toEqual({ pego: false, qtd_comprada: 0 });
  });

  it("comprada maior ou igual à previsão marca o checkbox", () => {
    expect(definirComprada(item({ qtd: 5 }), 5)).toEqual({ qtd_comprada: 5, pego: true });
    expect(definirComprada(item({ qtd: 5 }), 7)).toEqual({ qtd_comprada: 7, pego: true });
  });

  it("comprada menor que a previsão não marca o checkbox", () => {
    expect(definirComprada(item({ qtd: 5 }), 3)).toEqual({ qtd_comprada: 3, pego: false });
  });

  it("o carrinho soma somente a quantidade comprada", () => {
    const itens = [item({ qtd: 10, qtd_comprada: 3 }), item({ qtd: 4, qtd_comprada: 4, preco: 5 })];
    expect(valorCarrinho(itens)).toBe(3 * 10 + 4 * 5);
    expect(valorPrevisto(itens)).toBe(10 * 10 + 4 * 5);
  });

  it("o histórico recebe apenas os produtos comprados, com a quantidade comprada", () => {
    const itens = [
      item({ nome: "Arroz", qtd: 5, qtd_comprada: 3 }),
      item({ nome: "Feijão", qtd: 2, qtd_comprada: 0 }),
      item({ nome: "Café", qtd: 1, qtd_comprada: 1, preco: 20 }),
    ];
    expect(itensComprados(itens)).toEqual([
      { nome: "Arroz", qtd: 3, preco: 10, pego: true },
      { nome: "Café", qtd: 1, preco: 20, pego: true },
    ]);
  });
});
