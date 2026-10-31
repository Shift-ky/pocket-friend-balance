import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Check, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccess } from '@/lib/access-context';
import { receiptOptions, reviewTelegramReceipt, reviewTelegram } from '@/lib/telegram.functions';
import { produtosExtraidos } from '@/lib/telegram/model';
import { receiptQualityWarnings } from '@/lib/telegram/quality';
import type { Tables } from '@/integrations/supabase/types';

const field='mt-1 w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';
const number=(s:string) => s.trim() ? Number(s.replace(',','.')) : null;
export function TelegramReceipt({row,done}:{row:Tables<'telegram_reviews'>;done:()=>void}) {
  const access=useAccess(); const read=useServerFn(receiptOptions); const act=useServerFn(reviewTelegramReceipt); const discard=useServerFn(reviewTelegram);
  const options=useQuery({queryKey:['telegram-stock-options',row.grupo_id],queryFn:()=>read({data:{grupo:row.grupo_id}}),enabled:access.estoque});
  const [items,setItems]=useState(()=>produtosExtraidos(row.produtos).map((p,id)=>({id,nome:p.nome,qtd:String(p.qtd ?? ''),preco:String(p.preco ?? ''),estoque_id:p.estoque_id ?? '',novo:p.novo ?? false,nome_estoque:p.nome_estoque || p.nome})));
  const [valor,setValor]=useState(String(row.valor ?? '')); const [date,setDate]=useState(row.data ?? row.emissao ?? '');
  const [local,setLocal]=useState(row.beneficiario); const [description,setDescription]=useState(row.descricao); const [wallet,setWallet]=useState<'dinheiro'|'alimentacao'|'refeicao'>(row.conta as 'dinheiro'); const [category,setCategory]=useState(row.categoria);
  const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [notice,setNotice]=useState(''); const [confirm,setConfirm]=useState<'aprovar'|'descartar'|null>(null);
  const [searches,setSearches]=useState<Record<number,string>>({});
  const suggested=useRef(false);
  const stockOptions=options.data?.stock;
  useEffect(()=>{
    if (!options.data || suggested.current) return;
    suggested.current=true;
    const links=options.data.links;
    setItems(current=>current.map(item=>{
      if(item.estoque_id || item.novo) return item;
      const link=links.find(l=>l.nome_cupom===item.nome.trim().toLowerCase());
      return link && options.data?.stock.some(p=>p.id===link.estoque_id) ? {...item,estoque_id:link.estoque_id} : item;
    }));
  },[options.data]);
  useEffect(()=>{
    if (!stockOptions) return;
    setItems(current=>current.map(item=>{
      const search=searches[item.id];
      if (search===undefined || item.novo) return item;
      const found=stockOptions.find(p=>p.nome===search)?.id ?? '';
      return found===item.estoque_id ? item : {...item,estoque_id:found};
    }));
  },[stockOptions,searches]);
  const reading=row.extraction_status==='aguardando'||row.extraction_status==='processando';
  const qualityWarnings=receiptQualityWarnings({valor:number(valor),data:date,produtos:items.map(item=>({qtd:number(item.qtd),preco:number(item.preco)}))});
  function change(id:number,patch:Partial<(typeof items)[number]>) {setConfirm(null);setItems(current=>current.map(p=>p.id===id?{...p,...patch}:p));}
  async function submit(action:'salvar'|'aprovar'|'descartar') {
    setBusy(true);setError('');setNotice('');
    try {
      if(action==='descartar') await discard({data:{id:row.id,action,valor:number(valor),data:date||null,descricao:description,conta:wallet,categoria:category,pago:false}});
      else await act({data:{id:row.id,action,valor:number(valor) ?? 0,data:date,descricao:description,local,conta:wallet,categoria:category,produtos:items.map(p=>({nome:p.nome,qtd:number(p.qtd),preco:number(p.preco),estoque_id:p.estoque_id||null,novo:p.novo,nome_estoque:p.nome_estoque}))}});
      setConfirm(null);setNotice(action==='salvar'?'Revisão salva.':action==='aprovar'?'Compra aprovada.':'Documento descartado.');done();
    } catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar a compra.');} finally{setBusy(false);}
  }
  return <div className="mt-4 min-w-0 space-y-5">
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label className="min-w-0 text-sm">Total do cupom (R$)<input aria-label="Total do cupom" inputMode="decimal" className={field} value={valor} onChange={e=>setValor(e.target.value)} /></label>
      <label className="min-w-0 text-sm">Data da compra<input aria-label="Data da compra" type="date" className={field} value={date} onChange={e=>setDate(e.target.value)} /></label>
      <label className="min-w-0 text-sm sm:col-span-2">Estabelecimento<input aria-label="Estabelecimento" maxLength={200} className={field} value={local} onChange={e=>setLocal(e.target.value)} /></label>
      <label className="min-w-0 text-sm sm:col-span-2">Descrição<input aria-label="Descrição da compra" maxLength={200} className={field} value={description} onChange={e=>setDescription(e.target.value)} /></label>
      <label className="min-w-0 text-sm">Carteira<select aria-label="Carteira da compra" className={field} value={wallet} onChange={e=>setWallet(e.target.value as typeof wallet)}><option value="dinheiro">Dinheiro</option><option value="alimentacao">Alimentação</option><option value="refeicao">Refeição</option></select></label>
      <label className="min-w-0 text-sm">Categoria<input aria-label="Categoria da compra" className={field} maxLength={100} value={category} onChange={e=>setCategory(e.target.value)} /></label>
    </div>
    {!reading && <p className="text-xs text-muted-foreground">Para uma leitura melhor, envie uma foto nítida, sem reflexo, com o cupom inteiro e na posição correta.</p>}
    {!reading && qualityWarnings.length > 0 && <div role="status" aria-label="Pontos para conferir" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"><p className="font-semibold">Confira estes pontos antes de aprovar</p><ul className="mt-2 list-disc space-y-1 pl-5">{qualityWarnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul></div>}
    <section aria-label="Produtos do cupom" className="border-y py-4">
      <h3 className="font-semibold">Produtos do cupom · {items.length}</h3>
      {reading && <p className="mt-3 text-sm text-muted-foreground">Aguardando leitura dos produtos…</p>}
      {row.error && <p role="alert" className="mt-3 break-words text-sm text-debit">{row.error}</p>}
      <div className="mt-3 divide-y">{items.map((item,index)=><div key={item.id} className="min-w-0 space-y-3 py-4">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2"><label className="min-w-0 text-xs text-muted-foreground">Nome no cupom<input aria-label={`Produto ${index+1}`} className={field} value={item.nome} maxLength={200} disabled={reading||busy} onChange={e=>change(item.id,{nome:e.target.value})}/></label><Button variant="ghost" size="icon" disabled={reading||busy} aria-label={`Remover produto ${index+1}`} title="Remover produto" onClick={()=>setItems(current=>current.filter(p=>p.id!==item.id))}><Trash2/></Button></div>
        <div className="grid min-w-0 grid-cols-2 gap-3"><label className="min-w-0 text-xs text-muted-foreground">Quantidade<input aria-label={`Quantidade ${index+1}`} inputMode="decimal" className={field} value={item.qtd} disabled={reading||busy} onChange={e=>change(item.id,{qtd:e.target.value})}/></label><label className="min-w-0 text-xs text-muted-foreground">Preço unitário (R$)<input aria-label={`Preço ${index+1}`} inputMode="decimal" className={field} value={item.preco} disabled={reading||busy} onChange={e=>change(item.id,{preco:e.target.value})}/></label></div>
        {access.estoque && <>
          <label className="block min-w-0 text-xs text-muted-foreground">Produto no estoque<input aria-label={`Associar produto ${index+1}`} list={`stock-${row.id}-${item.id}`} className={field} disabled={reading||busy||item.novo} value={searches[item.id] ?? options.data?.stock.find(p=>p.id===item.estoque_id)?.nome ?? ''} placeholder="Buscar produto existente" onChange={e=>{const value=e.target.value;setSearches(current=>({...current,[item.id]:value}));change(item.id,{estoque_id:options.data?.stock.find(p=>p.nome===value)?.id ?? '',novo:false});}}/><datalist id={`stock-${row.id}-${item.id}`}>{options.data?.stock.map(p=><option key={p.id} value={p.nome}/>)}</datalist></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" aria-label={`Cadastrar novo produto ${index+1}`} disabled={reading||busy||Boolean(item.estoque_id)} checked={item.novo} onChange={e=>change(item.id,{novo:e.target.checked})}/>Cadastrar novo produto</label>
          {item.novo && <label className="block min-w-0 text-xs text-muted-foreground">Nome no estoque<input aria-label={`Nome novo produto ${index+1}`} className={field} maxLength={200} value={item.nome_estoque} onChange={e=>change(item.id,{nome_estoque:e.target.value})}/></label>}
        </>}
        <p className="text-xs text-muted-foreground">{item.estoque_id?'Associado ao estoque':item.novo?'Novo produto no estoque':'Somente na compra · não entra no estoque'} · R$ {((number(item.qtd)??0)*(number(item.preco)??0)).toFixed(2)}</p>
      </div>)}</div>
      <Button variant="ghost" disabled={reading||busy} onClick={()=>setItems(current=>[...current,{id:Math.max(-1,...current.map(p=>p.id))+1,nome:'',qtd:'',preco:'',estoque_id:'',novo:false,nome_estoque:''}])}><Plus/>Produto</Button>
    </section>
    {options.error && <p role="alert" className="text-sm text-debit">{options.error.message}</p>}
    {confirm ? <div role="alertdialog" aria-label="Confirmar compra" className="border-l-2 border-primary pl-4"><p className="text-sm">{confirm==='aprovar'?`Confirmar compra paga de R$ ${valor}, abastecer os produtos selecionados e salvar no histórico da Feira?`:'Descartar sem criar lançamento?'}</p><div className="mt-3 flex flex-wrap gap-2"><Button disabled={busy} onClick={()=>submit(confirm)}>Confirmar</Button><Button variant="outline" disabled={busy} onClick={()=>setConfirm(null)}>Cancelar</Button></div></div> : <div className="flex flex-wrap gap-2"><Button disabled={busy||reading||!access.feira||!items.length} onClick={()=>setConfirm('aprovar')}><Check/>Aprovar compra</Button><Button variant="outline" disabled={busy||reading} onClick={()=>submit('salvar')}><Save/>Salvar revisão</Button><Button variant="ghost" disabled={busy} onClick={()=>setConfirm('descartar')}><Trash2/>Descartar</Button></div>}
    {error && <p role="alert" className="break-words text-sm text-debit">{error}</p>}{notice && <p role="status" className="text-sm text-credit">{notice}</p>}
  </div>;
}