import { describe, it, expect } from "vitest";
import { dividirParcelas } from "@/lib/parcelas";

describe("dividirParcelas", () => {
  it("divide 100 em 3 parcelas somando exatamente 100", () => {
    const p = dividirParcelas(100, 3, "2026-01-31");
    expect(p.map((x) => x.valor)).toEqual([33.34, 33.33, 33.33]);
  });
  it("uma parcela por mês, ajustando fim de mês", () => {
    const p = dividirParcelas(100, 3, "2026-01-31");
    expect(p.map((x) => x.data)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });
});
