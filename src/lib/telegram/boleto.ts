import { Boleto } from 'validation-br/boleto';

// The date factor restarted in 2025; never choose a cycle without document context.
export function parseBankBoleto(input: string) {
  const digits = input.replace(/[\s.-]/g, '');
  if (!/^\d{44}$|^\d{47}$/.test(digits) || digits.startsWith('8')) return null;
  try {
    const boleto = new Boleto(digits); const barcode = boleto.toBarcode();
    if (barcode[3] !== '9') return null;
    const factor = Number(barcode.slice(5, 9));
    const dates = factor ? [new Date(Date.UTC(1997, 9, 7) + factor * 86400000).toISOString().slice(0, 10),
      ...(factor >= 1000 ? [new Date(Date.UTC(2025, 1, 22) + (factor - 1000) * 86400000).toISOString().slice(0, 10)] : [])] : [];
    return { valor: boleto.amount > 0 ? boleto.amount : null, dates, codigo: digits };
  } catch { return null; }
}