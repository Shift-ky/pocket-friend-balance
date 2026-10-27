import { createHash, timingSafeEqual } from 'node:crypto';

export function webhookSecret() {
  const key = process.env['TELEGRAM_API_KEY'];
  if (!key) throw new Error('Conexão Telegram não configurada.');
  return createHash('sha256').update(`telegram-webhook:${key}`).digest('base64url');
}
export function validSecret(value: string) {
  return timingSafeEqual(createHash('sha256').update(value).digest(), createHash('sha256').update(webhookSecret()).digest());
}
export async function telegram(method: string, body: Record<string, unknown>) {
  const key = process.env['TELEGRAM_API_KEY']; const ai = process.env['LOVABLE_API_KEY'];
  if (!key || !ai) throw new Error('Conexão Telegram não configurada.');
  const res = await fetch(`https://connector-gateway.lovable.dev/telegram/${method}`, {
    method: 'POST', headers: { Authorization: `Bearer ${ai}`, 'X-Connection-Api-Key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Telegram [${res.status}]: ${await res.text()}`);
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram: ${json.description ?? 'Falha no envio'}`);
  return json.result;
}
export async function downloadTelegram(fileId: string) {
  const file = await telegram('getFile', { file_id: fileId });
  if (!file.file_path || !/^[\w/.-]+$/.test(file.file_path) || file.file_path.includes('..')) throw new Error('Arquivo inválido.');
  const res = await fetch(`https://connector-gateway.lovable.dev/telegram/file/${file.file_path}`, { headers: {
    Authorization: `Bearer ${process.env['LOVABLE_API_KEY']}`, 'X-Connection-Api-Key': process.env['TELEGRAM_API_KEY'] ?? '',
  } });
  if (!res.ok) throw new Error(`Telegram [${res.status}]: ${await res.text()}`);
  const reader = res.body?.getReader(); if (!reader) throw new Error('Arquivo vazio.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 20 * 1024 * 1024) { await reader.cancel(); throw new Error('Arquivo acima de 20 MB.'); } chunks.push(part.value); }
  if (!size) throw new Error('Arquivo vazio.');
  return Buffer.concat(chunks);
}