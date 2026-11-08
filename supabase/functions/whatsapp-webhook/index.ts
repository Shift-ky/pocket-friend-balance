import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const appUrl = "https://shift-ky.github.io/pocket-friend-balance";
const maxBytes = 20 * 1024 * 1024;

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Configuração do Supabase incompleta.");
  return createClient(url, key, { auth: { persistSession: false } });
}

function settings() {
  const baseUrl = Deno.env.get("EVOLUTION_API_URL")?.replace(/\/+$/, "");
  const apiKey = Deno.env.get("EVOLUTION_API_KEY");
  const instance = Deno.env.get("EVOLUTION_INSTANCE");
  if (!baseUrl || !apiKey || !instance) throw new Error("Evolution API não configurada.");
  return { baseUrl, apiKey, instance };
}

function safeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const left = enc.encode(a);
  const right = enc.encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

async function sendText(number: string, text: string) {
  const { baseUrl, apiKey, instance } = settings();
  const response = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(instance)}`, {
    method: "POST", headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify({ number, text, linkPreview: false }),
  });
  if (!response.ok) throw new Error(`Evolution sendText (${response.status}).`);
}

function unwrapMessage(message: Record<string, unknown>): Record<string, unknown> {
  for (const key of ["ephemeralMessage", "viewOnceMessage", "viewOnceMessageV2", "documentWithCaptionMessage"]) {
    const wrapped = message[key] as { message?: unknown } | undefined;
    if (wrapped?.message && typeof wrapped.message === "object") return unwrapMessage(wrapped.message as Record<string, unknown>);
  }
  return message;
}

function messageText(message: Record<string, unknown>) {
  const content = unwrapMessage(message);
  const conversation = content.conversation;
  if (typeof conversation === "string") return conversation.slice(0, 10_000);
  const extended = content.extendedTextMessage as { text?: unknown } | undefined;
  if (typeof extended?.text === "string") return extended.text.slice(0, 10_000);
  const image = content.imageMessage as { caption?: unknown } | undefined;
  if (typeof image?.caption === "string") return image.caption.slice(0, 10_000);
  const document = content.documentMessage as { caption?: unknown } | undefined;
  if (typeof document?.caption === "string") return document.caption.slice(0, 10_000);
  return "";
}

function mediaInfo(message: Record<string, unknown>) {
  const content = unwrapMessage(message);
  const image = content.imageMessage as { mimetype?: unknown; fileLength?: unknown; caption?: unknown } | undefined;
  if (image) return { mime: typeof image.mimetype === "string" ? image.mimetype : "image/jpeg", size: Number(image.fileLength ?? 0), name: "comprovante.jpg" };
  const document = content.documentMessage as { mimetype?: unknown; fileLength?: unknown; fileName?: unknown } | undefined;
  if (document) return { mime: typeof document.mimetype === "string" ? document.mimetype : "application/octet-stream", size: Number(document.fileLength ?? 0), name: typeof document.fileName === "string" ? document.fileName.slice(0, 255) : "documento" };
  return null;
}

async function downloadMedia(message: Record<string, unknown>) {
  const { baseUrl, apiKey, instance } = settings();
  const key = message.key as Record<string, unknown> | undefined;
  const response = await fetch(`${baseUrl}/chat/getBase64FromMediaMessage/${encodeURIComponent(instance)}`, {
    method: "POST", headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify({ message: { key }, convertToMp4: false }),
  });
  if (!response.ok) throw new Error(`Evolution media (${response.status}).`);
  const raw = await response.text();
  let result: { base64?: string; data?: string; mimetype?: string; mimeType?: string; fileName?: string };
  try { result = JSON.parse(raw); } catch { result = { base64: raw }; }
  const encoded = (result.base64 ?? result.data)?.replace(/^data:[^,]+,/, "");
  if (!encoded || encoded.length > Math.ceil(maxBytes * 4 / 3) + 16) throw new Error("Arquivo indisponível ou acima de 20 MB.");
  const binary = atob(encoded);
  if (binary.length > maxBytes) throw new Error("Arquivo acima de 20 MB.");
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return { bytes, mime: result.mimetype ?? result.mimeType, fileName: result.fileName };
}

async function numericUpdateId(messageId: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`whatsapp:${messageId}`));
  return (BigInt(`0x${Array.from(new Uint8Array(digest).slice(0, 8), b => b.toString(16).padStart(2, "0")).join("")}`) & ((1n << 62n) - 1n)).toString();
}

async function processMessage(raw: unknown) {
  if (!raw || typeof raw !== "object") return;
  const payload = raw as Record<string, unknown>;
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object") return;
  const key = data.key as Record<string, unknown> | undefined;
  const message = data.message as Record<string, unknown> | undefined;
  if (!key || !message || key.fromMe === true) return;

  const remoteJid = typeof key.remoteJid === "string" ? key.remoteJid : "";
  if (remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast") return;
  const remoteAlt = typeof key.remoteJidAlt === "string" ? key.remoteJidAlt : "";
  const number = (remoteJid.endsWith("@s.whatsapp.net") ? remoteJid.split("@")[0] : remoteAlt.split("@")[0])
    .replace(/\D/g, "");
  if (!/^[1-9][0-9]{6,14}$/.test(number) || !Number.isSafeInteger(Number(number))) return;

  const text = messageText(message).trim();
  const db = adminClient();
  const connectCode = text.match(/^(?:conectar\s+)?([a-f0-9]{48})$/i)?.[1];
  if (connectCode) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(connectCode));
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    const { data: linked, error } = await db.rpc("whatsapp_bind", { _hash: hash, _wa_id: number });
    await sendText(number, !error && linked
      ? "WhatsApp conectado à MarIA. Envie foto, PDF ou texto de um comprovante. Revise tudo no app antes de salvar."
      : "Código inválido ou expirado. Gere outro em Conferência no app MarIA.");
    return;
  }

  const { data: link } = await db.from("whatsapp_links").select("user_id,grupo_id").eq("wa_id", number).maybeSingle();
  const allowed = link ? await db.rpc("telegram_sender_allowed", { _user: link.user_id, _grupo: link.grupo_id }) : null;
  if (!link || !allowed?.data) {
    await sendText(number, `Para conectar, abra ${appUrl}/conferencia e toque em “Conectar WhatsApp”.`);
    return;
  }

  const media = mediaInfo(message);
  if (media && !["application/pdf", "image/jpeg", "image/png"].includes(media.mime)) {
    await sendText(number, "Envie foto JPG/PNG, PDF ou texto.");
    return;
  }
  if (media && media.size > maxBytes) {
    await sendText(number, "O arquivo precisa ter até 20 MB.");
    return;
  }
  const messageId = typeof key.id === "string" ? key.id : "";
  if (!messageId || messageId.length > 200) return;
  const { data: existing, error: lookupError } = await db.from("telegram_reviews").select("id")
    .eq("source_channel", "whatsapp").eq("source_message_id", messageId).maybeSingle();
  if (lookupError) throw new Error("Não foi possível verificar a mensagem duplicada.");
  if (existing) return;
  const id = crypto.randomUUID();
  let filePath: string | null = null;
  let fileError: string | null = null;
  let mime = media?.mime ?? null;
  let fileName = media?.name ?? null;
  if (media) {
    try {
      const downloaded = await downloadMedia(message);
      if (downloaded.mime) mime = downloaded.mime;
      if (downloaded.fileName) fileName = downloaded.fileName.slice(0, 255);
      if (mime === "application/pdf" && new TextDecoder().decode(downloaded.bytes.subarray(0, 5)) !== "%PDF-") throw new Error("PDF inválido.");
      const extension = mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";
      filePath = `${link.user_id}/${id}/documento.${extension}`;
      const { error } = await db.storage.from("telegram-documents").upload(filePath, downloaded.bytes, { contentType: mime ?? "application/octet-stream", upsert: false });
      if (error) throw new Error("Não foi possível guardar o arquivo.");
    } catch (error) {
      fileError = error instanceof Error ? error.message.slice(0, 500) : "Falha ao baixar o arquivo.";
    }
  }

  const { error } = await db.from("telegram_reviews").insert({
    id, update_id: await numericUpdateId(messageId), source_channel: "whatsapp", source_message_id: messageId,
    sender_phone: number, user_id: link.user_id, grupo_id: link.grupo_id, chat_id: Number(number),
    source_text: text, file_id: media ? messageId : null, file_name: fileName, mime_type: mime,
    file_path: filePath, extraction_status: "aguardando", ...(fileError ? { extraction_status: "erro", error: fileError } : {}),
  });
  if (error) {
    if (error.code === "23505") {
      if (filePath) await db.storage.from("telegram-documents").remove([filePath]);
      return;
    }
    throw new Error("Não foi possível guardar a mensagem para conferência.");
  }
  await sendText(number, `${fileError ? "Não consegui abrir o arquivo. Reenvie em PDF ou foto JPG/PNG. " : "Recebido para conferência. "}Nada será lançado sem sua aprovação. Abra o app: ${appUrl}/conferencia`);
}

Deno.serve(async request => {
  const configuredSecret = Deno.env.get("EVOLUTION_WEBHOOK_SECRET");
  const providedSecret = new URL(request.url).searchParams.get("key") ?? "";
  if (!configuredSecret || !safeEqual(configuredSecret, providedSecret)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  if (request.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405 });
  const body = await request.text();
  if (body.length > 1_000_000) return Response.json({ error: "Payload muito grande." }, { status: 413 });
  let payload: unknown;
  try { payload = JSON.parse(body); } catch { return Response.json({ error: "Payload inválido." }, { status: 400 }); }
  const event = String((payload as Record<string, unknown>)?.event ?? "").toLowerCase().replace(/[.-]/g, "_");
  if (event !== "messages_upsert") return Response.json({ ok: true });
  const data = (payload as Record<string, unknown>).data;
  const messages = Array.isArray(data) ? data.map(item => ({ ...(payload as Record<string, unknown>), data: item })) : [payload];
  try {
    for (const item of messages) await processMessage(item);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("WhatsApp webhook failed", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "Falha ao processar mensagem." }, { status: 500 });
  }
});

