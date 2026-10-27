import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { reviewInput } from './telegram/model';

export const linkTelegram = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(z.object({ grupo: z.string().uuid() })).handler(async ({ data, context }) => {
  const { randomBytes, createHash } = await import('node:crypto');
  const code = randomBytes(24).toString('hex');
  const { error } = await context.supabase.from('telegram_links').upsert({ user_id: context.userId, grupo_id: data.grupo, telegram_user_id: null, chat_id: null,
    code_hash: createHash('sha256').update(code).digest('hex'), code_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
  if (error) throw new Error(error.message);
  return { url: `https://t.me/Nosborx_bot?start=${code}` };
});
export const listTelegramReviews = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(z.object({ grupo: z.string().uuid() })).handler(async ({ data, context }) => {
  const { data: rows, error } = await context.supabase.from('telegram_reviews').select('*').eq('grupo_id', data.grupo).order('created_at', { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  const { data: link } = await context.supabase.from('telegram_links').select('telegram_user_id').eq('user_id', context.userId).eq('grupo_id', data.grupo).maybeSingle();
  return { rows: rows ?? [], linked: Boolean(link?.telegram_user_id) };
});
export const reviewTelegram = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(reviewInput).handler(async ({ data, context }) => {
  const { data: id, error } = await context.supabase.rpc('telegram_review_action', { _id: data.id, _action: data.action, _valor: data.valor ?? undefined, _data: data.data ?? undefined,
    _descricao: data.descricao, _conta: data.conta, _categoria: data.categoria, _pago: data.pago });
  if (error) throw new Error(error.message);
  return { id };
});
export const telegramFile = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => {
  const { data: row, error } = await context.supabase.from('telegram_reviews').select('file_path').eq('id', data.id).single();
  if (error || !row.file_path) throw new Error('Arquivo indisponível.');
  const { data: signed, error: signError } = await context.supabase.storage.from('telegram-documents').createSignedUrl(row.file_path, 300);
  if (signError) throw new Error(signError.message); return { url: signed.signedUrl };
});