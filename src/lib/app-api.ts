import { supabase } from '@/integrations/supabase/client';
export async function appApi<T>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  const { data: result, error } = await supabase.functions.invoke('app-api', { body: { action, data } });
  if (error) throw new Error(error.message || 'Não foi possível acessar o servidor.');
  if (result && typeof result === 'object' && 'error' in result && typeof result.error === 'string') throw new Error(result.error);
  return result as T;
}
