import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { z } from "npm:zod@3.25.76";

const publicApp = "https://shift-ky.github.io/pocket-friend-balance";
const fileSchema = z.object({ file_id: z.string().max(500), file_size: z.number().optional() });
const messageSchema = z.object({
  message_id: z.number().int(),
  from: z.object({ id: z.number().int().safe() }),
  chat: z.object({ id: z.number().int().safe(), type: z.string() }),
  text: z.string().max(10_000).optional(),
  caption: z.string().max(10_000).optional(),
  photo: z.array(fileSchema).max(20).optional(),
  document: fileSchema.extend({ mime_type: z.string().optional(), file_name: z.string().max(255).optional() }).optional(),
});
const updateSchema = z.object({
  update_id: z.number().int().safe(),
  message: messageSchema.optional(),
  callback_query: z.object({
    id: z.string().max(200),
    from: z.object({ id: z.number().int().safe() }),
    data: z.string().max(64).optional(),
    message: z.object({ message_id: z.number().int(), chat: z.object({ id: z.number().int().safe() }) }).optional(),
  }).optional(),
});

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function equalBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}

async function validWebhookSecret(provided: string, expected: string) {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return equalBytes(new Uint8Array(a), new Uint8Array(b));
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Configuração do Supabase incompleta.");
  return createClient(url, key, { auth: { persistSession: false } });
}

function botToken() {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("Bot do Telegram não configurado.");
  return token;
}

async function telegram(method: string, payload: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${botToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null) as { ok?: boolean; result?: unknown; description?: string } | null;
  if (!response.ok || !result?.ok) throw new Error(`Telegram indisponível (${response.status}).`);
  return result.result as Record<string, unknown>;
}

async function telegramFile(fileId: string) {
  const file = await telegram("getFile", { file_id: fileId });
  const path = file.file_path;
  if (typeof path !== "string" || !/^[\w/.-]+$/.test(path) || path.includes("..")) throw new Error("Arquivo inválido.");
  const response = await fetch(`https://api.telegram.org/file/bot${botToken()}/${path}`);
  if (!response.ok) throw new Error(`Download do Telegram indisponível (${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 20 * 1024 * 1024) throw new Error("Arquivo vazio ou acima de 20 MB.");
  return bytes;
}

function telegramActions(row: { id: string; documento: string; produtos: unknown; valor: number | null; data: string | null; descricao: string }, moto = false) {
  const open = { text: "Abrir na MarIA", url: `${publicApp}/conferencia` };
  const discard = { text: "Descartar", callback_data: `descartar:${row.id}` };
  if (row.documento === "cupom" || (Array.isArray(row.produtos) && row.produtos.length)) return [[open, discard]];
  if (!row.valor || !row.data || !row.descricao.trim()) return [[open, discard]];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());
  if (row.documento === "boleto" && row.data > today) return [[{ text: "Salvar Pendência", callback_data: `pendencia:${row.id}` }], [open, discard]];
  return [
    [{ text: "Dinheiro", callback_data: `dinheiro:${row.id}` }, { text: "Alimentação", callback_data: `alimentacao:${row.id}` }],
    [{ text: "Refeição", callback_data: `refeicao:${row.id}` }, ...(moto ? [{ text: "Moto", callback_data: `moto:${row.id}` }] : [])],
    [open, discard],
  ];
}

async function handleCallback(db: ReturnType<typeof adminClient>, update: z.infer<typeof updateSchema>) {
  const callback = update.callback_query!;
  const userId = callback.from.id;
  const chatId = callback.message?.chat.id;
  const match = callback.data?.match(/^(dinheiro|alimentacao|refeicao|moto|pendencia|descartar):([a-f0-9-]{36})$/);
  if (!match || !chatId) {
    await telegram("answerCallbackQuery", { callback_query_id: callback.id, text: "Revise no app." });
    return;
  }
  const { data, error } = await db.rpc("telegram_quick_action", { _id: match[2], _telegram: userId, _chat: chatId, _action: match[1] });
  if (error) {
    await telegram("answerCallbackQuery", { callback_query_id: callback.id, text: error.message.slice(0, 180), show_alert: true });
    return;
  }
  const result = data as { status?: string; conta?: string; pago?: boolean };
  const text = result.status === "descartado" ? "Descartado. Nenhum lançamento criado." : `${result.pago ? "Saída paga aprovada" : "Conta pendente salva"} · ${result.conta ?? "Dinheiro"}.`;
  await telegram("answerCallbackQuery", { callback_query_id: callback.id, text });
  if (callback.message) {
    try {
      await telegram("editMessageText", { chat_id: chatId, message_id: callback.message.message_id, text, reply_markup: { inline_keyboard: [[{ text: "Abrir na MarIA", url: `${publicApp}/conferencia` }]] } });
    } catch (error) { console.error("Telegram message update failed", error instanceof Error ? error.message : "Unknown"); }
  }
}

async function handleUpdate(update: z.infer<typeof updateSchema>) {
  const db = adminClient();
  if (update.callback_query) { await handleCallback(db, update); return; }
  const message = update.message;
  if (!message || message.chat.type !== "private") return;
  const userId = message.from.id;
  const chatId = message.chat.id;
  const start = message.text?.match(/^\/start(?:@\w+)?\s+([a-f0-9]{48})$/);
  if (start?.[1]) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(start[1]));
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    const { data, error } = await db.rpc("telegram_binding", { _hash: hash, _telegram: userId, _chat: chatId });
    await telegram("sendMessage", { chat_id: chatId, text: !error && data ? "Conta vinculada à MarIA. Envie seu comprovante, cupom, boleto PDF ou texto para conferência." : "Link inválido ou expirado. Gere outro em Conferência na MarIA." });
    return;
  }
  const { data: link } = await db.from("telegram_links").select("user_id,grupo_id").eq("telegram_user_id", userId).eq("chat_id", chatId).maybeSingle();
  const allowed = link ? await db.rpc("telegram_sender_allowed", { _user: link.user_id, _grupo: link.grupo_id }) : null;
  if (!link || !allowed?.data) {
    await telegram("sendMessage", { chat_id: chatId, text: "Vincule sua conta pelo botão Conectar Telegram na aba Conferência da MarIA." });
    return;
  }
  if (message.text?.match(/^\/start(?:@\w+)?\s*$/)) {
    await telegram("sendMessage", { chat_id: chatId, text: "Sua conta está vinculada à MarIA. Envie um comprovante, cupom ou boleto." });
    return;
  }
  const photo = message.photo?.at(-1);
  const doc = message.document;
  const mime = photo ? "image/jpeg" : doc?.mime_type;
  if (doc && mime !== "application/pdf" && !["image/jpeg", "image/png"].includes(mime ?? "")) {
    await telegram("sendMessage", { chat_id: chatId, text: "Envie foto, imagem JPG/PNG, PDF ou texto." });
    return;
  }
  if ((doc?.file_size ?? photo?.file_size ?? 0) > 20 * 1024 * 1024) {
    await telegram("sendMessage", { chat_id: chatId, text: "O arquivo precisa ter até 20 MB." });
    return;
  }
  const { data: row, error } = await db.from("telegram_reviews").insert({
    update_id: update.update_id, user_id: link.user_id, grupo_id: link.grupo_id, chat_id: chatId,
    source_text: message.text ?? message.caption ?? "", file_id: photo?.file_id ?? doc?.file_id ?? null,
    file_name: photo ? "comprovante.jpg" : doc?.file_name ?? null, mime_type: mime ?? null,
  }).select("id").single();
  if (error) {
    if (error.code === "23505") return;
    throw new Error("Não foi possível guardar o documento para conferência.");
  }
  await telegram("sendMessage", { chat_id: chatId, text: "Recebido para conferência. Nada será lançado sem sua aprovação.", reply_markup: { inline_keyboard: [[{ text: "Abrir na MarIA", url: `${publicApp}/conferencia` }, { text: "Descartar", callback_data: `descartar:${row.id}` }]] } });
}

Deno.serve(async request => {
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (!secret) return json({ error: "Webhook do Telegram não configurado." }, 500);
  const supplied = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
  if (!await validWebhookSecret(supplied, secret)) return json({ error: "Não autorizado." }, 401);
  const raw = await request.text();
  if (raw.length > 100_000) return json({ error: "Payload muito grande." }, 413);
  let update: z.infer<typeof updateSchema>;
  try { update = updateSchema.parse(JSON.parse(raw)); }
  catch { return json({ error: "Atualização inválida." }, 400); }
  try {
    await handleUpdate(update);
    return json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook failed", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Falha ao processar atualização." }, 500);
  }
});

