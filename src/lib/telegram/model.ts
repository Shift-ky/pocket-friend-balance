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
  produtos: z.array(z.object({ nome: z.string().nullable(), qtd: z.number().nullable(), preco: z.number().nullable() }).strict()),
}).strict();
export const produtoInput = z.object({ nome: z.string().trim().min(1).max(200), qtd: z.number().positive().max(1000000).nullable() }).strict();
export const produtosInput = z.object({ id: z.string().uuid(), action: z.enum(['salvar', 'feira', 'estoque']), produtos: z.array(produtoInput).max(200) }).superRefine((x, ctx) => {
  if (x.action !== 'salvar' && (!x.produtos.length || x.produtos.some(p => p.qtd === null))) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe a quantidade de todos os produtos selecionados.' });
});
export function produtosExtraidos(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 200).flatMap(p => {
    if (!p || typeof p.nome !== 'string' || !p.nome.trim()) return [];
    return [{ nome: p.nome.trim().slice(0, 200), qtd: typeof p.qtd === 'number' && Number.isFinite(p.qtd) && p.qtd > 0 && p.qtd <= 1000000 ? p.qtd : null,
      ...('preco' in p ? { preco: typeof p.preco === 'number' && Number.isFinite(p.preco) && p.preco >= 0 ? p.preco : null } : {}),
      ...('estoque_id' in p ? { estoque_id: typeof p.estoque_id === 'string' ? p.estoque_id : null } : {}),
      ...('novo' in p ? { novo: p.novo === true } : {}),
      ...('nome_estoque' in p ? { nome_estoque: typeof p.nome_estoque === 'string' ? p.nome_estoque : '' } : {}),
    }];
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
export const receiptProduct = z.object({ nome: z.string().trim().min(1).max(200), qtd: z.number().positive().max(1000000).nullable(), preco: z.number().min(0).max(9999999999.99).nullable(), estoque_id: z.string().uuid().nullable(), novo: z.boolean(), nome_estoque: z.string().trim().max(200) }).strict();
export const receiptInput = z.object({ id: z.string().uuid(), action: z.enum(['salvar','aprovar']), valor: z.number().positive().max(9999999999.99), data: z.string().refine(x => validDate(x) !== null, 'Data inválida'), descricao: z.string().trim().min(1).max(200), local: z.string().trim().max(200), conta: z.enum(['dinheiro','alimentacao','refeicao']), categoria: z.string().max(100), produtos: z.array(receiptProduct).min(1).max(200) }).superRefine((x,ctx) => {
  if (x.produtos.some(p => p.novo && p.estoque_id)) ctx.addIssue({ code:'custom', message:'Escolha produto existente ou novo produto.' });
  if (x.action === 'aprovar' && x.produtos.some(p => p.qtd === null || p.preco === null || (p.novo && !p.nome_estoque))) ctx.addIssue({ code:'custom', message:'Confira quantidade, preço e nome de cada produto.' });
});
export function telegramActions(row: { id: string; documento: string; produtos: unknown; valor: number | null; data: string | null; descricao: string }, moto = false, today = new Date().toLocaleDateString('en-CA', { timeZone:'America/Fortaleza' })) {
  const open = { text:'Abrir no MAR IA', url:'https://pocket-friend-balance.lovable.app/conferencia' };
  const discard = { text:'Descartar', callback_data:`descartar:${row.id}` };
  if (row.documento === 'cupom' || (Array.isArray(row.produtos) && row.produtos.length)) return [[open,discard]];
  if (!row.valor || !validDate(row.data) || !row.descricao.trim()) return [[open,discard]];
  if (row.documento === 'boleto' && row.data && row.data > today) return [[{text:'Salvar Pendência',callback_data:`pendencia:${row.id}`}],[open,discard]];
  return [[{text:'Dinheiro',callback_data:`dinheiro:${row.id}`},{text:'Alimentação',callback_data:`alimentacao:${row.id}`}],[{text:'Refeição',callback_data:`refeicao:${row.id}`},...(moto ? [{text:'Moto',callback_data:`moto:${row.id}`}] : [])],[open,discard]];
}