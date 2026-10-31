import { Fragment,useEffect,useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowDownLeft,ArrowUpRight,Fuel,Pencil,Trash2,RotateCcw,Eye,EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditarLinha } from '@/components/finance-editor';
import { useGrupo,useTabelaAoVivo } from '@/lib/grupo';
import { useSouAdmin } from '@/lib/use-admin';
import { supabase,offlineTransaction } from '@/lib/offline-client';
import { useAccess } from '@/lib/access-context';
import { visibleEntries,panelVisibility } from '@/lib/access';
import { ordenarPorVencimento,separarPendencias,historicoPorMes,dataLancamento,brl,type LancamentoPainel } from '@/lib/painel';
import type { DespesaMoto } from '@/lib/moto';
import { useCarteiras } from '@/hooks/use-carteiras';
import { carteiraDaLinha,moeda } from '@/lib/carteiras';
type Compra = { id: string; total: number; created_at: string; pagamento?: string; itens: { nome: string; qtd: number; preco: number }[] };
type Produto = { id: string; nome: string; qtd: number; padrao: number };
type ItemFeira = { id: string; nome: string; qtd: number; preco: number; pego: boolean };
const contas: Record<string, string> = { dinheiro: 'Dinheiro', alimentacao: 'Alimentação', refeicao: 'Refeição' };
const tipos: Record<string, string> = { credito: 'Crédito', debito: 'Débito', aplicacao: 'Aplicação', resgate: 'Resgate' };
const campo = 'min-w-0 w-full rounded-md border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';
const dataBr = (d: string) => new Date(d.slice(0, 10) + 'T00:00').toLocaleDateString('pt-BR');


export function FinanceHistory() {
  const { grupo } = useGrupo();
  const access = useAccess();
  const visible = panelVisibility(access);
  const { linhas: rawLanc, recarregar } = useTabelaAoVivo<LancamentoPainel>('lancamentos', grupo.id);
  const { linhas: moto, recarregar: recarregarMoto } = useTabelaAoVivo<DespesaMoto>('moto_despesas', grupo.id);
  const { linhas: compras } = useTabelaAoVivo<Compra>('feira_historico', grupo.id);


  const admin = useSouAdmin();
  const [membros, setMembros] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from('grupo_membros').select('user_id,email').eq('grupo_id', grupo.id).then(({ data }) => {
      setMembros(Object.fromEntries((data ?? []).map(m => [m.user_id, m.email ?? ''])));
    });
  }, [grupo.id]);
  const autor = (uid?: string | null) => (uid ? membros[uid] || '' : '');
  const hora = (iso?: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
  const registro = (criado_por?: string | null, created_at?: string) => {
    const partes = [hora(created_at) && `lançado ${hora(created_at)}`, autor(criado_por) && `por ${autor(criado_por)}`].filter(Boolean);
    return partes.length ? ` · ${partes.join(' ')}` : '';
  };
  const registroTexto = (criado_por?: string | null, created_at?: string) => {
    const h = hora(created_at); const a = autor(criado_por);
    return h ? `Lançado ${h}${a ? ` por ${a}` : ''}` : '';
  };
  const [de, setDe] = useState(''); const [ate, setAte] = useState('');
  const [aba, setAba] = useState<'movimentos' | 'gasolina' | 'compras'>('movimentos');
  const availableTabs = ([{id:'movimentos',nome:'Todas as movimentações', allowed:access.financas || access.moto},{id:'gasolina',nome:'Moto e aportes', allowed:access.moto},{id:'compras',nome:'Compras da feira', allowed:access.feira}] as const).filter(t => t.allowed);
  const activeTab = availableTabs.some(t => t.id === aba) ? aba : availableTabs[0]?.id;
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [mesHistorico, setMesHistorico] = useState('');
  const [mostrarPendentes, setMostrarPendentes] = useState(true);
  const [mostrarFuturas, setMostrarFuturas] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [excluindo, setExcluindo] = useState<{ id: string; ehMoto: boolean; nome: string } | null>(null);
  const noPeriodo = (data: string) => (!de || data.slice(0,10) >= de) && (!ate || data.slice(0,10) <= ate);
  const {carteiras}=useCarteiras();
  const lanc = visibleEntries(rawLanc, access);
  const financialLanc = access.financas ? lanc : [];

  const todos = [
    ...financialLanc.filter(l => l.destino !== 'gasolina').map(l => ({ id: l.id, data: l.data, nome: l.descricao, valor: Number(l.valor), entrada: l.tipo === 'credito' || l.tipo === 'resgate', pendente: l.tipo === 'debito' && !l.pago, origem: `${l.transferencia_id?'Transferência interna':tipos[l.tipo]} · ${carteiraDaLinha(l,carteiras)?.nome??contas[l.conta ?? 'dinheiro']}`, item: l, moto: false, criado_por: l.criado_por, created_at: l.created_at })),
    ...moto.map(d => ({ id: d.id, data: d.data, nome: d.descricao, valor: Number(d.valor), entrada: false, pendente: false, origem: 'Moto · Dinheiro', item: null, moto: true, criado_por: d.criado_por, created_at: d.created_at })),
  ].sort((a,b) => b.data.localeCompare(a.data));
  const lista = todos.filter(m => noPeriodo(m.data));
  const pendentes = ordenarPorVencimento(lista.filter(m => m.pendente));
  const { atuais: pendentesAtuais, futuras: pendentesFuturas } = separarPendencias(pendentes);
  const pendentesVisiveis = mostrarFuturas ? pendentes : pendentesAtuais;
  const historicoMovimentos = historicoPorMes(todos.filter(m => !m.pendente), mesHistorico);
  const historicoMoto = historicoPorMes([
    ...moto.map(d => ({ ...d, aporte: false })),
    ...(access.moto ? lanc.filter(l => l.destino === 'gasolina').map(d => ({ ...d, aporte: true })) : []),
  ], mesHistorico);
  const historicoCompras = historicoPorMes(compras, mesHistorico);
  async function pagar(item: LancamentoPainel) {
    const { error } = await supabase.from('lancamentos').update({ pago: !item.pago }).eq('id',item.id);
    if (error) setErro('Não foi possível atualizar o pagamento.'); else await recarregar();
  }
  function pedirExclusao(id: string, ehMoto: boolean, nome: string) {
    if (!admin) return;
    setErro('');
    setExcluindo({ id, ehMoto, nome });
  }
  async function excluir() {
    if (!excluindo) return;
    const { id, ehMoto } = excluindo;
    setExcluindo(null);
    const transfer=lanc.find(l=>l.id===id)?.transferencia_id;
    const { error, count } = transfer ? await supabase.from('lancamentos').delete({count:'exact'}).eq('transferencia_id',transfer).eq('grupo_id',grupo.id) : await supabase.from(ehMoto ? 'moto_despesas' : 'lancamentos').delete({ count: 'exact' }).eq('id',id).eq('grupo_id',grupo.id);
    if (error || !count) setErro('Não foi possível excluir esta movimentação.');
    else { await recarregar(); await recarregarMoto(); }
  }
  function controles(item: LancamentoPainel | null, id: string, ehMoto: boolean, nome: string) {
    return <div className="flex shrink-0 items-center gap-1">
      {!item?.transferencia_id && item?.tipo === 'debito' && item.destino !== 'gasolina' && <Button variant="ghost" size="sm" className={item.pago ? 'text-credit' : 'text-debit'} onClick={() => pagar(item)}>{item.pago ? 'Pago' : 'Pagar'}</Button>}
      {item && !item.transferencia_id && access.financas && <Button size="icon" variant="ghost" aria-label={`Editar ${item.descricao}`} title="Editar" onClick={() => setEditando(item.id)}><Pencil /></Button>}
      {admin && (ehMoto ? access.moto : access.financas) && <Button size="icon" variant="ghost" aria-label={ehMoto ? 'Excluir abastecimento' : 'Excluir movimentação'} title="Excluir" onClick={() => pedirExclusao(id,ehMoto,nome)}><Trash2 /></Button>}
    </div>;
  }


 return <div>
    {excluindo && (
      <div className="fixed inset-x-0 top-4 z-50 mx-auto w-fit max-w-[90vw] space-y-2 rounded-lg border-2 border-primary bg-card p-4 shadow-lg" role="alertdialog" aria-label="Confirmar exclusão">
        <p className="text-sm font-semibold">Excluir movimentação?</p>
        <p className="break-words text-sm text-muted-foreground">“{excluindo.nome}” será removida e não poderá ser recuperada.</p>
        <div className="flex gap-2">
          <Button onClick={excluir} className="flex-1 bg-debit text-primary-foreground">Excluir</Button>
          <Button variant="outline" onClick={() => setExcluindo(null)} className="flex-1">Cancelar</Button>
        </div>
      </div>
    )}
      {access.financas && <section className="mb-8 min-w-0 bg-card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl">Contas pendentes</h2><span className="text-sm text-muted-foreground">{pendentes.length}</span>
          <Button variant="outline" size="sm" aria-expanded={mostrarPendentes} aria-controls="contas-pendentes-financas" onClick={() => { setMostrarPendentes(mostrar => !mostrar); setMostrarFuturas(false); }}>{mostrarPendentes ? <EyeOff /> : <Eye />}{mostrarPendentes ? 'Ocultar pendências' : 'Mostrar pendências'}</Button>
        </div>
        {mostrarPendentes && <ul id="contas-pendentes-financas" className="">
          {!pendentesVisiveis.length && <li className="py-8 text-sm text-muted-foreground">Nenhuma conta pendente do mês vigente ou dos anteriores neste período.</li>}
          {pendentesVisiveis.map((m, i) => <Fragment key={m.id}>
            {(i === 0 || pendentesVisiveis[i - 1]?.data.slice(0, 7) !== m.data.slice(0, 7)) && <li className="border-b py-2 text-xs font-semibold capitalize text-muted-foreground">{new Date(m.data.slice(0, 7) + '-01T00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</li>}
            {editando === m.id && m.item ? <EditarLinha item={m.item} onFechar={() => {setEditando(null);recarregar();}} /> : <li className="space-y-2 border-b py-4"><p className="break-words text-sm font-semibold">{m.nome}</p><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="text-xs text-muted-foreground">Vence {dataBr(m.data)}</span><span className="text-sm font-semibold text-debit">{moeda(m.valor,m.item?carteiraDaLinha(m.item,carteiras)?.moeda:'BRL')}</span>{controles(m.item,m.id,false,m.nome)}</div><p className="break-words text-xs text-muted-foreground">{registroTexto(m.criado_por,m.created_at)}</p></li>}
          </Fragment>)}
          {pendentesFuturas.length > 0 && <li className="flex flex-wrap items-center justify-between gap-2 border-t py-2 text-xs text-muted-foreground"><span>{pendentesFuturas.length} {pendentesFuturas.length === 1 ? 'conta futura' : 'contas futuras'}</span><Button variant="ghost" size="sm" aria-expanded={mostrarFuturas} onClick={() => setMostrarFuturas(v => !v)}>{mostrarFuturas ? <EyeOff /> : <Eye />}{mostrarFuturas ? 'Recolher futuras' : 'Ver todas'}</Button></li>}
        </ul>}
      </section>}
    {visible.history && <section className="bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Históricos</h2>
        <Button variant="outline" size="sm" aria-expanded={mostrarHistorico} aria-controls="historicos-financas" onClick={() => setMostrarHistorico(mostrar => !mostrar)}>
          {mostrarHistorico ? <EyeOff /> : <Eye />}{mostrarHistorico ? 'Ocultar histórico' : 'Mostrar histórico'}
        </Button>
      </div>
      {mostrarHistorico && <div id="historicos-financas">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="w-full min-w-0 text-xs text-muted-foreground sm:max-w-56">Mês de lançamento<input type="month" aria-label="Mês de lançamento" value={mesHistorico} onChange={e => setMesHistorico(e.target.value)} className={`${campo} mt-1`} /></label>
        {mesHistorico && <Button variant="outline" size="sm" onClick={() => setMesHistorico('')}><RotateCcw />Todos os meses</Button>}
      </div>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Históricos">{availableTabs.map(t => <Button key={t.id} role="tab" aria-selected={activeTab===t.id} variant={activeTab===t.id?'default':'outline'} size="sm" onClick={() => setAba(t.id)}>{t.nome}</Button>)}</div>
      {erro && <p role="alert" className="mb-3 text-sm text-debit">{erro}</p>}
      <ul className="divide-y">
        {activeTab === 'movimentos' && <>{!historicoMovimentos.length && <li className="py-8 text-sm text-muted-foreground">Nenhuma movimentação no mês selecionado.</li>}{historicoMovimentos.map((m,i) => <Fragment key={m.id}>{(i===0||dataLancamento(historicoMovimentos[i-1]??{}).slice(0,7)!==dataLancamento(m).slice(0,7))&&<li className="border-b py-3 text-sm font-semibold capitalize text-primary">{new Date(dataLancamento(m).slice(0,7)+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</li>}{editando === m.id && m.item ? <EditarLinha key={m.id} item={m.item} onFechar={() => {setEditando(null);recarregar();}} /> : <li key={m.id} className="flex items-start gap-3 py-4"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.entrada?'bg-credit-soft text-credit':'bg-debit-soft text-debit'}`}>{m.entrada?<ArrowDownLeft className="h-4 w-4" />:<ArrowUpRight className="h-4 w-4" />}</span><div className="min-w-0 flex-1 space-y-1"><p className="break-words text-sm font-semibold">{m.nome}</p>{m.item?.tipo === "debito" && <p className="text-xs text-muted-foreground">Tipo de saída · {m.item.categoria || "Outros"}</p>}<div className="flex flex-wrap items-center gap-x-4 gap-y-1"><p className="text-xs text-muted-foreground">forma: {m.item?carteiraDaLinha(m.item,carteiras)?.nome??contas[m.item.conta]:'Moto/Gasolina'}{m.item?.transferencia_id?' · Transferência interna':''} · {dataBr(m.data)}</p><span className={`text-sm font-semibold ${m.entrada?'text-credit':'text-debit'}`}>{m.entrada?'+':'−'} {moeda(m.valor,m.item?carteiraDaLinha(m.item,carteiras)?.moeda:'BRL')}</span>{controles(m.item,m.id,m.moto,m.nome)}</div>{registroTexto(m.criado_por, m.created_at) && <p className="text-xs text-muted-foreground">{registroTexto(m.criado_por, m.created_at)}</p>}</div></li>}</Fragment>)}</>}
        {activeTab === 'gasolina' && <>{!historicoMoto.length && <li className="py-8 text-sm text-muted-foreground">Nenhum abastecimento ou aporte no mês selecionado.</li>}{historicoMoto.map(d => {const item = d.aporte ? lanc.find(l => l.id===d.id) ?? null : null; return editando === d.id && item && access.financas ? <EditarLinha key={d.id} item={item} onFechar={() => {setEditando(null);recarregar();}} /> : <li key={d.id} className="flex items-start gap-3 py-4"><Fuel className="mt-1 h-5 w-5 shrink-0 text-saved" /><div className="min-w-0 flex-1 space-y-1"><p className="break-words text-sm font-semibold">{d.descricao}</p><div className="flex flex-wrap items-center gap-x-4 gap-y-1"><p className="text-xs text-muted-foreground">forma: Dinheiro · {dataBr(d.data)}</p><span className={`text-sm font-semibold ${d.aporte?'text-saved':'text-debit'}`}>{d.aporte?'+':'−'} {brl(Number(d.valor))}</span>{controles(item,d.id,!d.aporte,d.descricao)}</div>{registroTexto(d.criado_por, d.created_at) && <p className="text-xs text-muted-foreground">{registroTexto(d.criado_por, d.created_at)} · {d.aporte ? 'Aporte para gasolina' : 'Abastecimento · Pago'}</p>}</div></li>;})}</>}
        {activeTab === 'compras' && <>{!historicoCompras.length && <li className="py-8 text-sm text-muted-foreground">Nenhuma compra salva no mês selecionado.</li>}{historicoCompras.map(c => <li key={c.id} className="py-4"><details><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">Compra de {dataBr(c.created_at)}</p><p className={`text-xs ${c.pagamento && c.pagamento!=='nenhum'?'text-credit':'text-muted-foreground'}`}>{c.pagamento && c.pagamento!=='nenhum'?`Finalizada · ${contas[c.pagamento]}`:'Não finalizada · Sem pagamento lançado'} · {c.itens.length} itens</p></div><span className="text-sm font-semibold">{brl(Number(c.total))}</span></summary><ul className="mt-3 space-y-2 border-l pl-4">{c.itens.map((i,n) => <li key={n} className="flex justify-between gap-3 text-sm"><span className="break-words">{i.qtd} × {i.nome}</span><span className="shrink-0">{brl(i.qtd*i.preco)}</span></li>)}</ul><Button asChild variant="link" className="mt-2 px-0"><Link to="/feira">Abrir compra na Feira →</Link></Button></details></li>)}</>}
      </ul>
      </div>}
    </section>}
 </div>;
}
