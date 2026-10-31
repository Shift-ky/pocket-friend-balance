import type { LancamentoPainel } from './painel';
import type { DespesaMoto } from './moto';
export type Carteira = { id:string; grupo_id:string; nome:string; tipo:'financeiro'|'beneficio'; moeda:'BRL'|'USD'|'EUR'; cor:'primary'|'credit'|'debit'|'saved'; icone:string; legado:string|null; na_feira:boolean; nas_fixas:boolean; no_painel:boolean; created_at?:string };
export type Meta = { id:string; grupo_id:string; carteira_id:string; nome:string; valor_alvo:number; data_limite:string|null; ativa:boolean; created_at?:string };
export type Cotacao = { moeda:string; valor_brl:number; data:string; consultado_em?:string };
export const moeda = (n:number, currency='BRL') => n.toLocaleString('pt-BR',{style:'currency',currency});
export const contaLegada = (w:Carteira):'dinheiro'|'alimentacao'|'refeicao' => w.legado==='alimentacao' ? 'alimentacao' : w.legado==='refeicao' ? 'refeicao' : 'dinheiro';
export function carteiraDaLinha(l:LancamentoPainel, wallets:Carteira[]) { return wallets.find(w=>l.carteira_id ? w.id===l.carteira_id : w.legado===(l.conta??'dinheiro')); }
export function aceitaTransferencia(w:Carteira, metas:Meta[]) { return w.tipo==='financeiro' && w.moeda==='BRL' && !metas.some(m=>m.carteira_id===w.id); }
export function aceitaAutomacao(w:Carteira, metas:Meta[], local:'feira'|'fixas') { return w.moeda==='BRL' && !metas.some(m=>m.carteira_id===w.id) && (local==='feira' ? w.na_feira && w.legado!=='gasolina' : w.nas_fixas); }
export function saldoCarteira(w:Carteira, linhas:LancamentoPainel[], moto:DespesaMoto[]) {
  let total=0;
  for (const l of linhas) {
    const matches=l.carteira_id ? l.carteira_id===w.id : w.legado===(l.conta??'dinheiro');
    const v=Number(l.valor);
    if(matches) { if(l.tipo==='credito'||l.tipo==='resgate') total+=v; if(l.tipo==='debito'&&l.pago) total-=v; if(l.tipo==='aplicacao') total-=v; }
    if(w.legado==='gasolina' && l.destino==='gasolina' && l.pago && l.conta==='dinheiro') total+=v;
  }
  if(w.legado==='gasolina') total-=moto.reduce((s,d)=>s+Number(d.valor),0);
  return total;
}
export function valorEmReais(w:Carteira, valor:number, taxas:Cotacao[]) { if(w.moeda==='BRL') return valor; const taxa=taxas.find(t=>t.moeda===w.moeda); return taxa ? valor*Number(taxa.valor_brl) : null; }
export function resumoCarteiras(wallets:Carteira[], linhas:LancamentoPainel[], moto:DespesaMoto[], taxas:Cotacao[]) {
  let financeiro=0,beneficios=0; let semCotacao=false;
  for(const w of wallets.filter(w=>w.no_painel)) {
    let saldo=saldoCarteira(w,linhas,moto);
    // Legacy applications remain part of patrimony without duplicating available cash.
    if(w.legado==='dinheiro') saldo+=linhas.filter(l=>(!l.carteira_id||l.carteira_id===w.id)&&['aplicacao','resgate'].includes(l.tipo)).reduce((s,l)=>s+(l.tipo==='aplicacao'?1:-1)*Number(l.valor),0);
    const convertido=valorEmReais(w,saldo,taxas); if(convertido===null) {semCotacao=true;continue;}
    if(w.tipo==='beneficio') beneficios+=convertido; else financeiro+=convertido;
  }
  return {financeiro,beneficios,patrimonio:financeiro+beneficios,semCotacao};
}
export function movimentosAnaliticos(wallets:Carteira[], linhas:LancamentoPainel[], moto:DespesaMoto[], taxas:Cotacao[]) {
  const result=linhas.filter(l=>!l.transferencia_id && l.destino!=='gasolina' && ['credito','debito'].includes(l.tipo)).flatMap(l=>{
    const w=carteiraDaLinha(l,wallets); if(!w?.no_painel)return []; const valor=valorEmReais(w,Number(l.valor),taxas); if(valor===null)return [];
    return [{data:l.data,valor,entrada:l.tipo==='credito',pendente:l.tipo==='debito'&&!l.pago,categoria:l.categoria || (l.origem_modulo==='feira'?'Feira':'Outros'),financeiro:w.tipo==='financeiro'}];
  });
  if(wallets.some(w=>w.legado==='gasolina'&&w.no_painel))result.push(...moto.map(d=>({data:d.data,valor:Number(d.valor),entrada:false,pendente:false,categoria:'Moto/Gasolina',financeiro:true})));
  return result;
}
export function termometro(movs:ReturnType<typeof movimentosAnaliticos>,mes:string) {
  const atuais=movs.filter(m=>m.data.slice(0,7)===mes);
  const entradas=atuais.filter(m=>m.entrada).reduce((s,m)=>s+m.valor,0);
  const saidas=atuais.filter(m=>!m.entrada&&!m.pendente).reduce((s,m)=>s+m.valor,0);
  const pendentes=atuais.filter(m=>m.pendente).reduce((s,m)=>s+m.valor,0);
  const financeiros=atuais.filter(m=>m.financeiro);
  const livre=financeiros.reduce((s,m)=>s+(m.entrada?m.valor:-m.valor),0);
  return {entradas,saidas,pendentes,sobra:entradas-saidas-pendentes,livre};
}
export function progressoMeta(meta:Meta,saldo:number,sobra:number) {
  const alvo=Number(meta.valor_alvo),guardado=Math.max(0,saldo);
  return {guardado,percentual:Math.min(100,guardado/alvo*100),faltante:Math.max(0,alvo-guardado),aporte:Math.max(0,Math.min(alvo-guardado,sobra))};
}