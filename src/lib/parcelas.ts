/** Divide um valor em n parcelas mensais (centavos exatos; a 1ª absorve a sobra). */
export function dividirParcelas(total: number, n: number, dataInicial: string) {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const [y, m, d] = dataInicial.split("-").map(Number);
  return Array.from({ length: n }, (_, k) => {
    const ultimoDia = new Date(Date.UTC(y, m - 1 + k + 1, 0)).getUTCDate();
    const dt = new Date(Date.UTC(y, m - 1 + k, Math.min(d, ultimoDia)));
    return { valor: (k === 0 ? cents - base * (n - 1) : base) / 100, data: dt.toISOString().slice(0, 10) };
  });
}
