import { describe, expect, it } from "vitest";
import { movimentacaoGasolina, totaisMoto } from "@/lib/moto";

describe("Gasolina da moto", () => {
  it("destina dinheiro das Finanças à gasolina, já reservado", () => {
    expect(movimentacaoGasolina(100)).toEqual({ tipo: "debito", destino: "gasolina", conta: "dinheiro", pago: true, valor: 100 });
  });
  it("desconta o abastecimento apenas do saldo reservado", () => {
    expect(totaisMoto([{ destino: "gasolina", conta: "dinheiro", pago: true, valor: 100 }], [{ valor: 35 }])).toEqual({ reservado: 100, gasto: 35, saldo: 65 });
  });
  it("não usa alimentação ou refeição como dinheiro para gasolina", () => {
    expect(totaisMoto(["alimentacao", "refeicao"].map((conta) => ({ destino: "gasolina", conta, pago: true, valor: 100 })), []).saldo).toBe(0);
  });
});