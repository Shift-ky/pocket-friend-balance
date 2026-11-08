import { appApi } from '@/lib/app-api';
import type { Tables } from '@/integrations/supabase/types';
import type { z } from 'zod';
import { reviewInput, produtosInput, receiptInput } from './telegram/model';

type ReviewInput = z.infer<typeof reviewInput>;
type ProdutosInput = z.infer<typeof produtosInput>;
type ReceiptInput = z.infer<typeof receiptInput>;

export const linkTelegram = (input: { data: { grupo: string } }) => appApi<{ url: string }>('linkTelegram', input.data);
export const listTelegramReviews = (input: { data: { grupo: string } }) => appApi<{ rows: Tables<'telegram_reviews'>[]; linked: boolean }>('listTelegramReviews', input.data);
export const reviewTelegram = (input: { data: ReviewInput }) => appApi<{ id: string }>('reviewTelegram', input.data as unknown as Record<string, unknown>);
export const telegramFile = (input: { data: { id: string } }) => appApi<{ url: string }>('telegramFile', input.data);
export const reviewTelegramProducts = (input: { data: ProdutosInput }) => appApi<{ destino: string }>('reviewTelegramProducts', input.data as unknown as Record<string, unknown>);
export const receiptOptions = (input: { data: { grupo: string } }) => appApi<{ stock: Array<{ id: string; nome: string }>; links: Array<{ nome_cupom: string; estoque_id: string }> }>('receiptOptions', input.data);
export const reviewTelegramReceipt = (input: { data: ReceiptInput }) => appApi<{ id: string }>('reviewTelegramReceipt', input.data as unknown as Record<string, unknown>);
