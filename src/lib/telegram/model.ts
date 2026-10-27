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
}).strict();
export const validDate = (s: string | null) => s && /^\d{4}-\d{2}-\d{2}$/.test(s) && s >= '2000-01-01' && s <= '2100-12-31' && new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s ? s : null;
export function normalizeExtracted(x: z.infer<typeof extractedSchema>) {
  return { valor: x.valor !== null && Number.isFinite(x.valor) && x.valor > 0 && x.valor <= 9999999999.99 ? Math.round(x.valor * 100) / 100 : null,
    data: validDate(x.data), emissao: validDate(x.emissao), beneficiario: (x.beneficiario ?? '').slice(0, 200),
    descricao: (x.descricao ?? x.beneficiario ?? '').slice(0, 200), documento: x.documento, codigo: x.codigo?.replace(/\D/g, '').slice(0, 48) ?? null };
}