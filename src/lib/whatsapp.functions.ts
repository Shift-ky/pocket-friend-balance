import { appApi } from '@/lib/app-api';
import type { Tables } from '@/integrations/supabase/types';

export const linkWhatsApp = (input: { data: { grupo: string } }) => appApi<{ url: string }>('linkWhatsApp', input.data);
export const listWhatsAppReviews = (input: { data: { grupo: string } }) => appApi<{ rows: Tables<'telegram_reviews'>[]; linked: boolean }>('listWhatsAppReviews', input.data);

