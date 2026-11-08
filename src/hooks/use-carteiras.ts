import { useEffect,useState } from 'react';
import { useGrupo,useTabelaAoVivo } from '@/lib/grupo';
import { atualizarCotacoes } from '@/lib/cotacoes.functions';
import { cachedValue } from '@/lib/offline-store';
import type { Carteira,Meta,Cotacao } from '@/lib/carteiras';
export function useCarteiras(){
  const {grupo,session}=useGrupo();
  const wallets=useTabelaAoVivo<Carteira>('carteiras',grupo.id);
  const goals=useTabelaAoVivo<Meta>('metas',grupo.id);
  const [cotacoes,setCotacoes]=useState<Cotacao[]>([]);const [erroCotacao,setErroCotacao]=useState('');
  const read=atualizarCotacoes;
  useEffect(()=>{let alive=true;const load=()=>cachedValue(session.user.id,'cotacoes',()=>read()).then(data=>{if(alive){setCotacoes(data);setErroCotacao(data.length<2?'Cotação indisponível para uma ou mais moedas.':'');}}).catch(()=>{if(alive)setErroCotacao('Não foi possível atualizar a cotação.');});void load();const t=setInterval(()=>void load(),3600000);window.addEventListener('online',load);return()=>{alive=false;clearInterval(t);window.removeEventListener('online',load);};},[session.user.id,read]);
  return {carteiras:wallets.linhas,metas:goals.linhas,cotacoes,erroCotacao,recarregar:async()=>{await wallets.recarregar();await goals.recarregar();}};
}