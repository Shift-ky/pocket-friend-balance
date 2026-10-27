import { createFileRoute } from '@tanstack/react-router';
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth';
export const Route = createFileRoute('/api/public/telegram/process')({ server: { handlers: {
  POST: async ({ request }) => { const denial = await authenticateCronRequest(request); if (denial) return denial;
    const { processReviews } = await import('@/lib/telegram/process.server'); await processReviews(); return Response.json({ ok: true }); },
} } });