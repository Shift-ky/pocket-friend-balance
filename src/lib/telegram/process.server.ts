import { downloadTelegram, telegram } from './gateway.server';
import { extractDocument } from './extract.server';
import { telegramActions } from './model';
import { ExtractionProviderError, extractionHttpStatus, isLovableCreditPause, lovableCreditPause } from './extraction-policy.server';

export async function processReviews(ids?: string[]) {
  const runStarted = Date.now();
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const { data: state, error: stateError } = await db.from('telegram_ai_state').select('*').eq('id', true).maybeSingle();
  if (stateError) throw new Error('Não foi possível consultar o estado da leitura.');
  let geminiOnly = Boolean(state?.paused && isLovableCreditPause(state.reason) && process.env['GEMINI_API_KEY']?.trim());
  if (state?.paused && !geminiOnly) return { paused: true, reason: state.reason };
  let query = db.from('telegram_reviews').select('*').eq('status', 'pendente').eq('extraction_status', 'aguardando').order('created_at').limit(2);
  if (ids) query = query.in('id', ids);
  const { data: rows, error } = await query; if (error) throw new Error(error.message);
  for (const row of rows ?? []) {
    const { data: allowed } = await db.rpc('telegram_sender_allowed', { _user: row.user_id, _grupo: row.grupo_id });
    if (!allowed) continue;
    const { data: claimed } = await db.rpc('telegram_claim', { _id: row.id }); if (!claimed) continue;
    const started = Date.now();
    const progress = (stage: string) => console.info('telegram_extraction', { reviewId: row.id, stage, elapsedMs: Date.now() - started });
    progress('claimed');
    try {
      let bytes: Buffer | undefined;
      if (row.file_id) {
        bytes = await downloadTelegram(row.file_id);
        progress('downloaded');
        if (row.mime_type === 'application/pdf' && bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('PDF inválido.');
        const path = `${row.user_id}/${row.id}/${row.mime_type === 'application/pdf' ? 'documento.pdf' : 'imagem.jpg'}`;
        const { error: uploadError } = await db.storage.from('telegram-documents').upload(path, bytes, { contentType: row.mime_type ?? 'application/octet-stream', upsert: true });
        if (uploadError) throw new Error(uploadError.message);
        await db.from('telegram_reviews').update({ file_path: path }).eq('id', row.id);
        progress('stored');
      }
      const extracted = await extractDocument(row.source_text, bytes, row.mime_type ?? undefined, row.file_name ?? undefined, {
        geminiOnly,
        onLovableCreditsExhausted: async () => {
          const { error } = await db.from('telegram_ai_state').upsert({ id: true, paused: true, reason: lovableCreditPause, updated_at: new Date().toISOString() });
          if (error) throw new Error('Não foi possível salvar a pausa da leitura pelo Lovable.');
          geminiOnly = true;
        },
      });
      progress('extracted');
      const { error: saveError } = await db.from('telegram_reviews').update({ ...extracted, extraction_status: 'concluido', error: null }).eq('id', row.id).eq('status', 'pendente').is('produtos_destino', null);
      if (saveError) throw new Error(saveError.message);
      progress('saved');
      const {data:permissions}=await db.from('user_access').select('moto').eq('user_id',row.user_id).maybeSingle();
      const hasMoto=row.user_id==='3f3f6b62-d686-4451-b75f-a108adfb813d' || permissions?.moto !== false;
      await telegram('sendMessage', { chat_id: row.chat_id, text: `Leitura concluída: ${extracted.descricao || 'Documento'}\nValor: ${extracted.valor === null ? 'Conferir' : `R$ ${extracted.valor.toFixed(2)}`}\nData: ${extracted.data ?? 'Conferir'}${extracted.documento==='cupom' || extracted.produtos.length ? `\nCupom com produtos: confirme a compra no MAR IA para validar o estoque (${extracted.produtos.length} itens).` : '\nSelecione a carteira para aprovar.'}`, reply_markup: { inline_keyboard:telegramActions({...extracted,id:row.id},hasMoto) } });
    } catch (e) {
      progress('failed');
      const message = e instanceof Error ? e.message : 'Não foi possível ler o documento.';
      const status = extractionHttpStatus(e);
      await db.from('telegram_reviews').update({ extraction_status: 'erro', error: message.slice(0, 1000) }).eq('id', row.id);
      if (!(e instanceof ExtractionProviderError && e.provider === 'gemini') && (status === 402 || status === 403 || status === 401 || status === 404)) {
        await db.from('telegram_ai_state').upsert({ id: true, paused: true, reason: status === 402 ? lovableCreditPause : message.slice(0, 1000), updated_at: new Date().toISOString() });
        return { paused: true, reason: message };
      }
    }
    // Leave the next item waiting if the current one used most of the cron window.
    if (Date.now() - runStarted >= 20_000) break;
  }
  return { paused: false };
}
