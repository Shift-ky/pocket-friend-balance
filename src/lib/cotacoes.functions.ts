import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export const atualizarCotacoes = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {data:cache,error}=await context.supabase.from('cotacoes').select('*');
  if(error)throw new Error('Não foi possível consultar as cotações.');
  const hoje=new Date().toISOString().slice(0,10);
  if(cache?.length===2 && cache.every(c=>c.consultado_em.slice(0,10)===hoje))return cache;
  const updates=await Promise.all(['USD','EUR'].map(async currency=>{
    try {
      const response=await fetch(`https://api.frankfurter.dev/v1/latest?base=${currency}&symbols=BRL`,{signal:AbortSignal.timeout(10000)});
      if(!response.ok)return null;
      const body=await response.json() as {date?:string;rates?:{BRL?:number}};
      if(!body.date || !Number.isFinite(body.rates?.BRL) || Number(body.rates?.BRL)<=0)return null;
      return {moeda:currency,valor_brl:Number(body.rates?.BRL),data:body.date,consultado_em:new Date().toISOString()};
    }catch{return null;}
  }));
  const valid=updates.filter(u=>u!==null);
  if(valid.length){const {supabaseAdmin}=await import('@/integrations/supabase/client.server');await supabaseAdmin.from('cotacoes').upsert(valid);}
  return ['USD','EUR'].flatMap(currency=>{const rate=valid.find(t=>t.moeda===currency)??cache?.find(t=>t.moeda===currency);return rate?[rate]:[];});
});