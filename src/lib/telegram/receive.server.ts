import { z } from 'zod';
import { createHash } from 'node:crypto';
import { telegram, validSecret } from './gateway.server';

const person = z.object({ id: z.number().int().safe() });
const file = z.object({ file_id: z.string().max(500), file_size: z.number().optional() });
const message = z.object({ message_id: z.number().int(), from: person, chat: z.object({ id: z.number().int().safe(), type: z.string() }),
  text: z.string().max(10000).optional(), caption: z.string().max(10000).optional(), photo: z.array(file).max(20).optional(),
  document: file.extend({ mime_type: z.string().optional(), file_name: z.string().max(255).optional() }).optional() });
const updateSchema = z.object({ update_id: z.number().int().safe(), message: message.optional(), callback_query: z.object({ id: z.string().max(200), from: person, data: z.string().max(64).optional(), message: z.object({ message_id:z.number().int(), chat: z.object({ id: z.number().int().safe() }) }).optional() }).optional() });

export async function receiveTelegram(request: Request) {
  if (!validSecret(request.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? '')) return new Response('Unauthorized', { status: 401 });
  const raw = await request.text(); if (raw.length > 100000) return new Response('Payload too large', { status: 413 });
  let u: z.infer<typeof updateSchema>; try { u = updateSchema.parse(JSON.parse(raw)); } catch { return new Response('Invalid update', { status: 400 }); }
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const m = u.message; const cb = u.callback_query;
  const uid = m?.from.id ?? cb?.from.id; const chat = m?.chat.id ?? cb?.message?.chat.id;
  if (!uid || !chat || (m && m.chat.type !== 'private')) return Response.json({ ok: true });
  const start = m?.text?.match(/^\/start(?:@\w+)?\s+([a-f0-9]{48})$/);
  if (start?.[1]) {
    const { data, error } = await db.rpc('telegram_binding', { _hash: createHash('sha256').update(start[1]).digest('hex'), _telegram: uid, _chat: chat });
    await telegram('sendMessage', { chat_id: chat, text: !error && data ? 'Conta vinculada à MarIA. Envie seu cupom, comprovante, boleto PDF ou texto para conferência.' : 'Link inválido ou expirado. Gere outro em Conferência na MarIA.' });
    return Response.json({ ok: true });
  }
  const { data: link } = await db.from('telegram_links').select('*').eq('telegram_user_id', uid).eq('chat_id', chat).maybeSingle();
  const allowed = link ? await db.rpc('telegram_sender_allowed', { _user: link.user_id, _grupo: link.grupo_id }) : null;
  if (!link || !allowed?.data) { await telegram('sendMessage', { chat_id: chat, text: 'Vincule sua conta pelo botão Conectar Telegram na aba Conferência da MarIA.' }); return Response.json({ ok: true }); }
  if (m?.text?.match(/^\/start(?:@\w+)?\s*$/)) {
    await telegram('sendMessage',{chat_id:chat,text:'Sua conta está vinculada ao MAR IA. Envie um comprovante, cupom ou boleto.'});
    return Response.json({ok:true});
  }
  if (cb) {
    const match = cb.data?.match(/^(dinheiro|alimentacao|refeicao|moto|pendencia|descartar):([a-f0-9-]{36})$/);
    if (!match?.[1] || !match[2]) { await telegram('answerCallbackQuery',{callback_query_id:cb.id,text:'Revise no MAR IA.'}); return Response.json({ok:true}); }
    const result = await db.rpc('telegram_quick_action',{_id:match[2],_telegram:uid,_chat:chat,_action:match[1]});
    if (result.error) { await telegram('answerCallbackQuery',{callback_query_id:cb.id,text:result.error.message.slice(0,180),show_alert:true}); return Response.json({ok:true}); }
    const outcome = result.data as {status?:string;conta?:string;pago?:boolean};
    const text = outcome.status==='descartado' ? 'Descartado. Nenhum lançamento criado.' : `${outcome.pago ? 'Saída paga aprovada' : 'Conta pendente salva'} · ${outcome.conta ?? 'Dinheiro'}.`;
    await telegram('answerCallbackQuery',{callback_query_id:cb.id,text});
    if (cb.message) {
      try { await telegram('editMessageText',{chat_id:chat,message_id:cb.message.message_id,text,reply_markup:{inline_keyboard:[[{text:'Abrir no MAR IA',url:'https://pocket-friend-balance.lovable.app/conferencia'}]]}}); }
      catch (e) { console.error('Telegram message update failed',e instanceof Error ? e.message : 'Unknown'); }
    }
    return Response.json({ ok: true });
  }
  if (!m) return Response.json({ ok: true });
  const photo = m.photo?.at(-1); const doc = m.document;
  const mime = photo ? 'image/jpeg' : doc?.mime_type;
  if (doc && mime !== 'application/pdf' && !['image/jpeg', 'image/png'].includes(mime ?? '')) { await telegram('sendMessage', { chat_id: chat, text: 'Envie foto, imagem JPG/PNG, PDF ou texto.' }); return Response.json({ ok: true }); }
  if ((doc?.file_size ?? photo?.file_size ?? 0) > 20 * 1024 * 1024) { await telegram('sendMessage', { chat_id: chat, text: 'O arquivo precisa ter até 20 MB.' }); return Response.json({ ok: true }); }
  const { data: item, error } = await db.from('telegram_reviews').insert({ update_id: u.update_id, user_id: link.user_id, grupo_id: link.grupo_id, chat_id: chat,
    source_text: m.text ?? m.caption ?? '', file_id: photo?.file_id ?? doc?.file_id ?? null, file_name: photo ? 'comprovante.jpg' : doc?.file_name ?? null, mime_type: mime ?? null }).select('id').single();
  if (error) { if (error.code === '23505') return Response.json({ ok: true }); throw new Error(error.message); }
  await telegram('sendMessage', { chat_id: chat, text: 'Recebido para conferência. Nada será lançado sem sua aprovação.', reply_markup: { inline_keyboard: [[{ text: 'Abrir no MAR IA', url: 'https://pocket-friend-balance.lovable.app/conferencia' }, { text: 'Descartar', callback_data: `descartar:${item.id}` }]] } });
  return Response.json({ ok: true });
}