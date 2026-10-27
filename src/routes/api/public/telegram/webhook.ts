import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/api/public/telegram/webhook')({ server: { handlers: {
  POST: async ({ request }) => { const { receiveTelegram } = await import('@/lib/telegram/receive.server'); return receiveTelegram(request); },
} } });