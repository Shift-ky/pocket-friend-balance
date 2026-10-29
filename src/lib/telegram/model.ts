import { z } from 'zod';

export const reviewInput = z.object({
  id: z.string().uuid(), action: z.enum(['salvar', 'aprovar', 'descartar']),
  valor: z.number().positive().max(9999999999.99).nullable(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  descricao: z.string().trim().max(200), conta: z.enum(['dinheiro', 'alimentacao', 'refeicao']),
  categoria: z.string().trim().max(100), pago: z.boolean(),
});
export const extractedSchema = z.object({
  valor: z.number().nullable(), data: z.string().nullable(), emissao: z.string().nullable(),
  beneficiario: z.string().nullable(), descricao: z.string().nullable(),
  documento: z.enum(['boleto', 'cupom', 'comprovante', 'texto', 'outro']), codigo: z.string().nullable(),
  produtos: z.array(z.object({ nome: z.string().nullable(), qtd: z.number().nullable() }).strict()),
}).strict();
export const produtoInput = z.object({ nome: z.string().trim().min(1).max(200), qtd: z.number().positive().max(1000000).nullable() }).strict();
export const produtosInput = z.object({ id: z.string().uuid(), action: z.enum(['salvar', 'feira', 'estoque']), produtos: z.array(produtoInput).max(200) }).superRefine((x, ctx) => {
  if (x.action !== 'salvar' && (!x.produtos.length || x.produtos.some(p => p.qtd === null))) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe a quantidade de todos os produtos selecionados.' });
});
export function produtosExtraidos(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 200).flatMap(p => {
    if (!p || typeof p.nome !== 'string' || !p.nome.trim()) return [];
    return [{ nome: p.nome.trim().slice(0, 200), qtd: typeof p.qtd === 'number' && Number.isFinite(p.qtd) && p.qtd > 0 && p.qtd <= 1000000 ? p.qtd : null }];
  });
}
export function validDate(s: string | null) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s) || s < '2000-01-01' || s > '2100-12-31') return null;
  const date = new Date(`${s}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === s ? s : null;
}
export function normalizeExtracted(x: z.infer<typeof extractedSchema>) {
  return { valor: x.valor !== null && Number.isFinite(x.valor) && x.valor > 0 && x.valor <= 9999999999.99 ? Math.round(x.valor * 100) / 100 : null,
    data: validDate(x.data), emissao: validDate(x.emissao), beneficiario: (x.beneficiario ?? '').slice(0, 200),
    descricao: (x.descricao ?? x.beneficiario ?? '').slice(0, 200), documento: x.documento, codigo: x.codigo?.replace(/\D/g, '').slice(0, 48) ?? null, produtos: produtosExtraidos(x.produtos) };
}