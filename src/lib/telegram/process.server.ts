import { APICallError } from 'ai';
import { downloadTelegram, telegram } from './gateway.server';
import { extractDocument } from './extract.server';

export async function processReviews(ids?: string[]) {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const { data: state } = await db.from('telegram_ai_state').select('*').eq('id', true).maybeSingle();
  if (state?.paused) return { paused: true, reason: state.reason };
  let query = db.from('telegram_reviews').select('*').eq('status', 'pendente').eq('extraction_status', 'aguardando').order('created_at').limit(2);
  if (ids) query = query.in('id', ids);
  const { data: rows, error } = await query; if (error) throw new Error(error.message);
  for (const row of rows ?? []) {
    const { data: allowed } = await db.rpc('telegram_sender_allowed', { _user: row.user_id, _grupo: row.grupo_id });
    if (!allowed) continue;
    const { data: claimed } = await db.rpc('telegram_claim', { _id: row.id }); if (!claimed) continue;
    try {
      let bytes: Buffer | undefined;
      if (row.file_id) {
        bytes = await downloadTelegram(row.file_id);
        if (row.mime_type === 'application/pdf' && bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('PDF inválido.');
        const path = `${row.user_id}/${row.id}/${row.mime_type === 'application/pdf' ? 'documento.pdf' : 'imagem.jpg'}`;
        const { error: uploadError } = await db.storage.from('telegram-documents').upload(path, bytes, { contentType: row.mime_type ?? 'application/octet-stream', upsert: true });
        if (uploadError) throw new Error(uploadError.message);
        await db.from('telegram_reviews').update({ file_path: path }).eq('id', row.id);
      }
      const extracted = await extractDocument(row.source_text, bytes, row.mime_type ?? undefined, row.file_name ?? undefined);
      const { error: saveError } = await db.from('telegram_reviews').update({ ...extracted, extraction_status: 'concluido', error: null }).eq('id', row.id).eq('status', 'pendente').is('produtos_destino', null);
      if (saveError) throw new Error(saveError.message);
      await telegram('sendMessage', { chat_id: row.chat_id, text: `Leitura concluída: ${extracted.descricao || 'Documento'}\nValor: ${extracted.valor === null ? 'Conferir' : `R$ ${extracted.valor.toFixed(2)}`}\nData: ${extracted.data ?? 'Conferir'}${extracted.produtos.length ? `\nProdutos identificados: ${extracted.produtos.length}. Confira nomes e quantidades na MarIA.` : ''}\nRevise carteira e pagamento antes de aprovar.`, reply_markup: { inline_keyboard: [[{ text: 'Conferir e aprovar', url: 'https://pocket-friend-balance.lovable.app/conferencia' }, { text: 'Descartar', callback_data: `descartar:${row.id}` }]] } });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Não foi possível ler o documento.';
      const status = APICallError.isInstance(e) ? e.statusCode : undefined;
      await db.from('telegram_reviews').update({ extraction_status: 'erro', error: message.slice(0, 1000) }).eq('id', row.id);
      if (status === 402 || status === 403 || status === 401 || status === 404) {
        await db.from('telegram_ai_state').upsert({ id: true, paused: true, reason: message.slice(0, 1000), updated_at: new Date().toISOString() });
        return { paused: true, reason: message };
      }
    }
  }
  return { paused: false };
}