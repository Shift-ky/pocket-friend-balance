import { createFileRoute,Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PainelSortableCard } from '@/components/painel-sortable-card';
import { normalizarOrdemPainel, ORDEM_PADRAO_PAINEL, moverCartaoPainel, moverCartaoPainelPara, type CartaoPainelId } from '@/lib/ordem-painel';
import { supabase } from '@/integrations/supabase/client';
import { Wallet,Layers,Target,ArrowDownLeft,ArrowUpRight,PiggyBank,Landmark } from 'lucide-react';
import { PieChart,Pie,Cell,ResponsiveContainer,Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { FluxoChart } from '@/components/painel-analitico';
import { useGrupo,useTabelaAoVivo } from '@/lib/grupo';
import { useCarteiras } from '@/hooks/use-carteiras';
import { useAccess } from '@/lib/access-context';
import { resumoCarteiras,movimentosAnaliticos,termometro,progressoMeta,saldoCarteira,valorEmReais,moeda } from '@/lib/carteiras';
import { fluxoMensal,type LancamentoPainel } from '@/lib/painel';
import type { DespesaMoto } from '@/lib/moto';
export const Route=createFileRoute('/')({head:()=>({meta:[{title:'MarIA — Painel estratégico'},{name:'description',content:'Patrimônio, dinheiro, benefícios e poupança, projeção mensal e metas.'},{property:'og:title',content:'MarIA — Painel estratégico'},{property:'og:description',content:'Analise seu fluxo de caixa e acompanhe suas próximas conquistas.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:Painel});
function Painel(){
const {grupo,session}=useGrupo();const access=useAccess();const queryClient=useQueryClient();
const orderKey=['painel-ordem',session.user.id] as const;
const {data:ordemSalva=ORDEM_PADRAO_PAINEL}=useQuery({queryKey:orderKey,initialData:[...ORDEM_PADRAO_PAINEL],queryFn:async()=>{
 const {data,error}=await supabase.from('user_appearance').select('*').eq('user_id',session.user.id).maybeSingle();
 if(error)throw error;
 return normalizarOrdemPainel((data as unknown as {dashboard_order?:unknown}|null)?.dashboard_order);
}});
const [ordemLocal,setOrdemLocal]=useState<CartaoPainelId[]|null>(null);
const [organizando,setOrganizando]=useState(false);
const [salvandoOrdem,setSalvandoOrdem]=useState(false);
const [erroOrdem,setErroOrdem]=useState('');
const ordem=normalizarOrdemPainel(ordemLocal??ordemSalva);
const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:6}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));const {carteiras,metas,cotacoes,erroCotacao}=useCarteiras();const {linhas}=useTabelaAoVivo<LancamentoPainel>('lancamentos',grupo.id);const {linhas:moto}=useTabelaAoVivo<DespesaMoto>('moto_despesas',grupo.id);const [month,setMonth]=useState(new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date()).slice(0,7));const totals=resumoCarteiras(carteiras,linhas,moto,cotacoes);const movs=movimentosAnaliticos(carteiras,linhas,moto,cotacoes);const thermo=termometro(movs,month);const currentMonth=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date()).slice(0,7);const livre=termometro(movs,currentMonth).livre;const goal=metas.find(m=>m.ativa&&carteiras.some(w=>w.id===m.carteira_id&&w.no_painel));const gw=carteiras.find(w=>w.id===goal?.carteira_id);const rate=gw?.moeda==='BRL'?1:Number(cotacoes.find(c=>c.moeda===gw?.moeda)?.valor_brl??0);const gp=goal&&gw?progressoMeta(goal,saldoCarteira(gw,linhas,moto),rate?livre/rate:0):null;const groups=new Map<string,number>();movs.filter(m=>m.data.startsWith(month)&&!m.entrada&&!m.pendente).forEach(m=>groups.set(m.categoria,(groups.get(m.categoria)??0)+m.valor));const categories=[...groups].map(([nome,valor])=>({nome,valor}));const colors=['var(--primary)','var(--credit)','var(--debit)','var(--saved)','var(--muted-foreground)'];
const caixas:Record<CartaoPainelId,{nome:string;valor:number;Icon:typeof Layers;destaque:boolean}> = {
 patrimonio:{nome:'Patrimônio consolidado',valor:totals.patrimonio,Icon:Layers,destaque:true},
 financeiro:{nome:'Financeiro / Dinheiro',valor:totals.financeiro,Icon:Wallet,destaque:false},
 beneficios:{nome:'Benefícios',valor:totals.beneficios,Icon:PiggyBank,destaque:false},
 poupanca:{nome:'Poupança',valor:totals.poupanca,Icon:Landmark,destaque:false},
};
async function salvarOrdem(ids:CartaoPainelId[]){
 if(salvandoOrdem)return;
 setOrdemLocal(ids);setSalvandoOrdem(true);setErroOrdem('');
 try{
  const {error}=await supabase.from('user_appearance').upsert({user_id:session.user.id,dashboard_order:ids});
  if(error)throw error;
  queryClient.setQueryData(orderKey,ids);
 }catch{
  setErroOrdem('Não foi possível salvar a ordem das caixas. Tente novamente.');
  await queryClient.invalidateQueries({queryKey:orderKey});
 }finally{setOrdemLocal(null);setSalvandoOrdem(false);}
}
async function reordenar({active,over}:DragEndEvent){
 if(!over||active.id===over.id||salvandoOrdem)return;
 const ids=moverCartaoPainelPara(ordem,String(active.id) as CartaoPainelId,String(over.id) as CartaoPainelId);
 if(ids.some((id,i)=>id!==ordem[i]))await salvarOrdem(ids);
}

return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><header className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs uppercase text-muted-foreground">MarIA · {grupo.nome}</p><h1 className="font-display text-4xl sm:text-5xl">Meu Painel</h1></div>{access.financas&&<Button asChild variant="outline"><Link to="/financas"><Wallet/>Finanças</Link></Button>}</header>
<section aria-label="Patrimônio e saldos" className="mb-8">
<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
{organizando?<p className="text-xs text-muted-foreground">Arraste as caixas ou use as setas para escolher a ordem.{salvandoOrdem?' Salvando…':''}</p>:<span />}
<div className="flex items-center gap-3">
{erroOrdem&&<p role="alert" className="text-sm text-debit">{erroOrdem}</p>}
<Button type="button" variant={organizando?'default':'outline'} disabled={salvandoOrdem} aria-pressed={organizando} onClick={()=>setOrganizando(v=>!v)}>{organizando?'Concluir':'Organizar caixas'}</Button>
</div>
</div>
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reordenar}>
<SortableContext items={ordem} strategy={verticalListSortingStrategy}>
<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
{ordem.map((id,position)=>{const c=caixas[id];return <PainelSortableCard key={id} id={id} nome={c.nome} valor={moeda(c.valor)} Icon={c.Icon} destaque={c.destaque} position={position} total={ordem.length} editing={organizando} disabled={salvandoOrdem} onMove={delta=>void salvarOrdem(moverCartaoPainel(ordem,id,delta))}/>;})}
</div>
</SortableContext>
</DndContext>
</section>
{(totals.semCotacao||erroCotacao)&&carteiras.some(w=>w.moeda!=='BRL'&&w.no_painel)&&<p role="status" className="mb-5 text-sm text-muted-foreground">{totals.semCotacao?'Carteiras sem cotação não estão incluídas no consolidado.':erroCotacao}</p>}
<section aria-label="Termômetro do mês" className="mb-8 border-y py-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl">Termômetro do mês</h2><input aria-label="Mês analítico" type="month" value={month} onChange={e=>setMonth(e.target.value)} className="min-w-0 rounded-md border bg-background px-3 py-2 text-sm"/></div><div className="grid gap-5 sm:grid-cols-3">{[{nome:'Entradas',valor:thermo.entradas,Icon:ArrowDownLeft,cor:'text-credit'},{nome:'Saídas pagas',valor:thermo.saidas,Icon:ArrowUpRight,cor:'text-debit'},{nome:'Previsão de sobra livre',valor:thermo.sobra,Icon:PiggyBank,cor:thermo.sobra>=0?'text-primary':'text-debit'}].map(c=><div key={c.nome} className="min-w-0"><p className="flex items-center gap-2 text-sm text-muted-foreground"><c.Icon className={`h-4 w-4 ${c.cor}`}/>{c.nome}</p><p className={`mt-2 break-words font-display text-2xl ${c.cor}`}>{moeda(c.valor)}</p></div>)}</div></section>
{access.financas&&<section aria-label="Meta ativa" className="mb-8 grid gap-6 border-b pb-6 sm:grid-cols-[2fr_1fr]"><div className="min-w-0"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-display text-2xl"><Target className="h-5 w-5 text-primary"/>{goal?.nome??'Meta ativa'}</h2><Button asChild variant="link"><Link to="/metas">Metas →</Link></Button></div>{gp&&goal&&gw?<><p className="mt-2 text-sm text-muted-foreground">{gw.nome} · {goal.data_limite?new Date(goal.data_limite+'T12:00:00').toLocaleDateString('pt-BR'):'Prazo livre'}</p><progress aria-label="Progresso da meta ativa" value={gp.percentual} max={100} className="mt-5 h-3 w-full accent-primary"/><div className="mt-2 flex flex-wrap justify-between gap-2 text-sm"><span>{moeda(gp.guardado,gw.moeda)} / {moeda(Number(goal.valor_alvo),gw.moeda)}</span><strong className="text-primary">{gp.percentual.toFixed(0)}%</strong></div></>:<p className="mt-4 text-sm text-muted-foreground">Nenhuma meta ativa nas carteiras visíveis.</p>}</div><div className="min-w-0 border-l-2 border-primary pl-5"><p className="text-sm text-muted-foreground">Provisão de aporte · mês atual</p><p className="mt-3 break-words font-display text-3xl text-credit">{moeda(gp?.aporte??0,gw?.moeda??'BRL')}</p></div></section>}
<div className="grid min-w-0 gap-8 lg:grid-cols-2"><section aria-label="Gastos por categoria" className="min-w-0"><h2 className="mb-5 font-display text-2xl">Onde foi o dinheiro</h2>{categories.length?<><div className="h-64 w-full"><ResponsiveContainer><PieChart><Pie data={categories} dataKey="valor" nameKey="nome" innerRadius={65} outerRadius={100} paddingAngle={3}>{categories.map((c,i)=><Cell key={c.nome} fill={colors[i%colors.length]}/>)}</Pie><Tooltip contentStyle={{background:'var(--card)',border:'1px solid var(--border)',color:'var(--foreground)'}} formatter={(v:number)=>moeda(v)}/></PieChart></ResponsiveContainer></div><div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">{categories.map(c=><span key={c.nome}>{c.nome} · {moeda(c.valor)}</span>)}</div></>:<p className="py-20 text-center text-sm text-muted-foreground">Nenhuma saída paga neste mês.</p>}</section><section aria-label="Evolução mensal" className="min-w-0"><h2 className="mb-5 font-display text-2xl">Entradas vs. saídas</h2><FluxoChart dados={fluxoMensal(movs)}/><div className="mt-3 flex justify-center gap-5 text-xs"><span className="text-credit">Entradas</span><span className="text-debit">Saídas pagas</span></div></section></div></main>;
}
