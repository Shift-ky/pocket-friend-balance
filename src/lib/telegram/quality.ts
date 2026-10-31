export type ReceiptQualityProduct = {
  qtd: number | null;
  preco: number | null;
};

export function receiptQualityWarnings(input: {
  valor: number | null;
  data: string;
  produtos: ReceiptQualityProduct[];
}) {
  const warnings: string[] = [];
  const total = input.valor !== null && Number.isFinite(input.valor) && input.valor > 0
    ? Math.round(input.valor * 100)
    : null;

  if (total === null) warnings.push('Confira o total do cupom; nenhum valor válido foi identificado.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.data)) warnings.push('Confira a data da compra.');
  if (!input.produtos.length) warnings.push('Nenhum produto foi identificado; confira as linhas do cupom.');

  const missingQuantity = input.produtos.filter(product => product.qtd === null || !Number.isFinite(product.qtd) || product.qtd <= 0).length;
  const missingPrice = input.produtos.filter(product => product.preco === null || !Number.isFinite(product.preco) || product.preco < 0).length;
  if (missingQuantity) warnings.push(`${missingQuantity} produto(s) estão sem quantidade conferida.`);
  if (missingPrice) warnings.push(`${missingPrice} produto(s) estão sem preço unitário conferido.`);

  if (total !== null && input.produtos.length && !missingQuantity && !missingPrice) {
    const itemsTotal = input.produtos.reduce((sum, product) =>
      sum + Math.round((product.qtd! * product.preco!) * 100), 0);
    if (Math.abs(itemsTotal - total) > 10) {
      const format = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      warnings.push(`A soma estimada dos produtos (${format(itemsTotal)}) difere do total (${format(total)}). Confira descontos, taxas e quantidades.`);
    }
  }

  return warnings;
}
