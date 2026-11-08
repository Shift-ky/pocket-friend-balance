import { appApi } from '@/lib/app-api';
export type Cotacao = { moeda: string; valor_brl: number; data: string; consultado_em: string };
export const atualizarCotacoes = () => appApi<Cotacao[]>('atualizarCotacoes');
