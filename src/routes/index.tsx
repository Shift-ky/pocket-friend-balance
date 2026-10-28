import { KpiCards, FluxoChart, CarteirasChart } from '@/components/painel-analitico';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Fragment, useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Wallet, PiggyBank, Utensils, ShoppingBasket, Fuel, Pencil, Trash2, Plus, Package, CalendarDays, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditarLinha } from '@/components/finance-editor';
import { useGrupo, useTabelaAoVivo } from '@/lib/grupo';
import { useSouAdmin } from '@/lib/use-admin';
import { supabase } from '@/lib/offline-client';
import { totaisMoto, type DespesaMoto } from '@/lib/moto';
import { useAccess } from '@/lib/access-context';
import { panelVisibility, visibleEntries } from '@/lib/access';
import { brl, saldosPainel, pendenciasDoMes, ordenarPorVencimento, separarPendencias, kpisPainel, fluxoMensal, type LancamentoPainel } from '@/lib/painel';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'MarIA — Painel' },
    { name: 'description', content: 'Seus saldos, contas, compras, estoque e gasolina em um painel único.' },
    { property: 'og:title', content: 'MarIA — Painel' },
    { property: 'og:description', content: 'Acompanhe suas finanças, compras e despesas da moto em um só lugar.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: Painel,
});

type Compra = { id: string; total: number; created_at: string; pagamento?: string; itens: { nome: string; qtd: number; preco: number }[] };
type Produto = { id: string; nome: string; qtd: number; padrao: number };
type ItemFeira = { id: string; nome: string; qtd: number; preco: number; pego: boolean };
const contas: Record<string, string> = { dinheiro: 'Dinheiro', alimentacao: 'Alimentação', refeicao: 'Refeição' };
const tipos: Record<string, string> = { credito: 'Crédito', debito: 'Débito', aplicacao: 'Aplicação', resgate: 'Resgate' };
const campo = 'min-w-0 w-full rounded-md border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';
const dataBr = (d: string) => new Date(d.slice(0, 10) + 'T00:00').toLocaleDateString('pt-BR');

function Painel() {
  const { grupo } = useGrupo();
  const access = useAccess();
  const visible = panelVisibility(access);
  const { linhas: rawLanc, recarregar } = useTabelaAoVivo<LancamentoPainel>('lancamentos', grupo.id);
  const { linhas: moto, recarregar: recarregarMoto } = useTabelaAoVivo<DespesaMoto>('moto_despesas', grupo.id);
  const { linhas: compras } = useTabelaAoVivo<Compra>('feira_historico', grupo.id);
  const { linhas: estoque } = useTabelaAoVivo<Produto>('estoque', grupo.id);
  const { linhas: feira } = useTabelaAoVivo<ItemFeira>('feira_itens', grupo.id);
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
  const [mostrarPendentes, setMostrarPendentes] = useState(false);
  const [mostrarFuturas, setMostrarFuturas] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [excluindo, setExcluindo] = useState<{ id: string; ehMoto: boolean; nome: string } | null>(null);
  const noPeriodo = (data: string) => (!de || data.slice(0,10) >= de) && (!ate || data.slice(0,10) <= ate);
  const lanc = visibleEntries(rawLanc, access);
  const financialLanc = access.financas ? lanc : [];
  const saldos = saldosPainel(financialLanc); const gasolina = totaisMoto(lanc, moto);
  const todos = [
    ...financialLanc.filter(l => l.destino !== 'gasolina').map(l => ({ id: l.id, data: l.data, nome: l.descricao, valor: Number(l.valor), entrada: l.tipo === 'credito' || l.tipo === 'resgate', pendente: l.tipo === 'debito' && !l.pago, origem: `${tipos[l.tipo]} · ${contas[l.conta ?? 'dinheiro']}`, item: l, moto: false, criado_por: l.criado_por, created_at: l.created_at })),
    ...moto.map(d => ({ id: d.id, data: d.data, nome: d.descricao, valor: Number(d.valor), entrada: false, pendente: false, origem: 'Moto · Dinheiro', item: null, moto: true, criado_por: d.criado_por, created_at: d.created_at })),
  ].sort((a,b) => b.data.localeCompare(a.data));
  const lista = todos.filter(m => noPeriodo(m.data));
  const pendentes = ordenarPorVencimento(lista.filter(m => m.pendente));
  const { atuais: pendentesAtuais, futuras: pendentesFuturas } = separarPendencias(pendentes);
  const pendentesVisiveis = mostrarFuturas ? pendentes : pendentesAtuais;
  const entradas = lista.filter(m => m.entrada).reduce((s,m) => s + m.valor, 0);
  const saidas = lista.filter(m => !m.entrada && !m.pendente).reduce((s,m) => s + m.valor, 0);
  const grafico = fluxoMensal(lista);
  const kpis = { ...kpisPainel(todos), consolidado: (access.financas ? saldos.disponivel + saldos.guardado + saldos.alimentacao + saldos.refeicao : 0) + (access.moto ? gasolina.saldo : 0) };
  const carteiras = [...(access.financas ? [{ nome: 'Dinheiro', valor: saldos.disponivel, cor: 'var(--primary)' },{ nome: 'Alimentação', valor: saldos.alimentacao, cor: 'var(--credit)' },{ nome: 'Refeição', valor: saldos.refeicao, cor: 'var(--debit)' }] : []), ...(access.moto ? [{ nome: 'Moto/Aporte', valor: gasolina.saldo, cor: 'var(--saved)' }] : [])];
  const faltantes = estoque.filter(p => Number(p.qtd) < Number(p.padrao));
  const aportes = access.moto ? lanc.filter(l => l.destino === 'gasolina' && noPeriodo(l.data)) : [];
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
    const { error, count } = await supabase.from(ehMoto ? 'moto_despesas' : 'lancamentos').delete({ count: 'exact' }).eq('id',id).eq('grupo_id',grupo.id);
    if (error || !count) setErro('Não foi possível excluir esta movimentação.');
    else { await recarregar(); await recarregarMoto(); }
  }
  function controles(item: LancamentoPainel | null, id: string, ehMoto: boolean, nome: string) {
    return <div className="flex shrink-0 items-center gap-1">
      {item?.tipo === 'debito' && item.destino !== 'gasolina' && <Button variant="ghost" size="sm" className={item.pago ? 'text-credit' : 'text-debit'} onClick={() => pagar(item)}>{item.pago ? 'Pago' : 'Pagar'}</Button>}
      {item && access.financas && <Button size="icon" variant="ghost" aria-label={`Editar ${item.descricao}`} title="Editar" onClick={() => setEditando(item.id)}><Pencil /></Button>}
      {admin && (ehMoto ? access.moto : access.financas) && <Button size="icon" variant="ghost" aria-label={ehMoto ? 'Excluir abastecimento' : 'Excluir movimentação'} title="Excluir" onClick={() => pedirExclusao(id,ehMoto,nome)}><Trash2 /></Button>}
    </div>;
  }

  return <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
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
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">MarIA · {grupo.nome}</p><h1 className="font-display text-4xl sm:text-5xl">Meu Painel</h1></div>
      <div className="flex flex-wrap gap-2">{access.financas && <Button asChild><Link to="/financas"><Plus />Lançamento</Link></Button>}{access.moto && <Button asChild variant="outline"><Link to="/moto"><Fuel />Abastecimento</Link></Button>}</div>
    </header>
    {(access.financas || access.moto) && <KpiCards k={kpis} />}
    {carteiras.length > 1 && <section aria-label="Carteiras dedicadas" className="mb-7 rounded-xl border bg-card p-4 sm:p-5"><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-bold">Carteiras dedicadas</h2><span className="text-xs text-muted-foreground">Saldo atual</span></div><CarteirasChart dados={carteiras} /></section>}
    {visible.balances && <section aria-label="Saldos atuais" className={`mb-7 grid gap-3 ${visible.financialCards ? 'grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(140px,1fr))]' : 'grid-cols-1'}`}>
      {access.financas && <div className="min-w-0 rounded-lg bg-primary p-3 text-primary-foreground sm:p-4"><Wallet className="mb-3 h-5 w-5 opacity-80" /><p className="text-xs opacity-80">Dinheiro disponível</p><p className="mt-1 break-words font-display text-lg sm:text-xl">{brl(saldos.disponivel)}</p></div>}
      {access.financas && <div aria-label="Pendências do mês atual" className="min-w-0 rounded-lg border bg-debit-soft p-3 sm:p-4"><CalendarDays className="mb-3 h-5 w-5 text-debit" /><p className="text-xs text-muted-foreground">Pendências · mês atual</p><p className="mt-1 break-words font-display text-lg text-debit sm:text-xl">{brl(pendenciasDoMes(financialLanc))}</p></div>}
      {[{ nome: 'Dinheiro guardado', valor: saldos.guardado, Icon: PiggyBank, cor: 'text-saved' },{ nome: 'Alimentação', valor: saldos.alimentacao, Icon: ShoppingBasket, cor: 'text-credit' },{ nome: 'Refeição', valor: saldos.refeicao, Icon: Utensils, cor: 'text-debit' },{ nome: 'Gasolina disponível', valor: gasolina.saldo, Icon: Fuel, cor: 'text-saved' }].filter(item => item.nome === 'Gasolina disponível' ? access.moto : access.financas).map(({nome,valor,Icon,cor}) => <div key={nome} className="min-w-0 rounded-lg border bg-card p-3 sm:p-4"><Icon className={`mb-3 h-5 w-5 ${cor}`} /><p className="text-xs text-muted-foreground">{nome}</p><p className="mt-1 break-words font-display text-lg sm:text-xl">{brl(valor)}</p></div>)}
    </section>}
    {visible.period && <section className="mb-7 border-y bg-card px-4 py-4" aria-label="Período de pesquisa">
      <div className="flex flex-wrap items-end gap-3"><span className="mb-2 flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4" />Período</span><label className="min-w-0 flex-1 text-xs text-muted-foreground sm:max-w-44">De<input aria-label="De" type="date" value={de} onChange={e => setDe(e.target.value)} className={`${campo} mt-1`} /></label><label className="min-w-0 flex-1 text-xs text-muted-foreground sm:max-w-44">Até<input aria-label="Até" type="date" value={ate} onChange={e => setAte(e.target.value)} className={`${campo} mt-1`} /></label>{(de || ate) && <Button variant="ghost" size="sm" onClick={() => {setDe('');setAte('');}}><RotateCcw />Todo o período</Button>}</div>
      {de && ate && de > ate && <p role="alert" className="mt-2 text-sm text-debit">A data final deve ser igual ou posterior à inicial.</p>}
    </section>}
    {visible.financialSummary && <div className="mb-8 bg-card p-4 sm:p-5">
      <section><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl">Entradas e saídas</h2><span className="text-xs text-muted-foreground">No período</span></div>
        <div className="mb-5 grid grid-cols-2 gap-3"><div className="rounded-lg bg-credit-soft p-3"><p className="flex items-center gap-2 text-xs text-credit"><ArrowDownLeft className="h-4 w-4" />Entradas</p><p className="mt-1 break-words font-display text-xl text-credit">{brl(entradas)}</p></div><div className="rounded-lg bg-debit-soft p-3"><p className="flex items-center gap-2 text-xs text-debit"><ArrowUpRight className="h-4 w-4" />Saídas pagas</p><p className="mt-1 break-words font-display text-xl text-debit">{brl(saidas)}</p></div></div>
        <FluxoChart dados={grafico} />
      </section>
    </div>}
    {visible.moduleSummary && <section className="mb-8 grid gap-6 border-y bg-card p-4 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] sm:p-5" aria-label="Feira, estoque e moto">
      {access.feira && <div><p className="mb-2 flex items-center gap-2 font-semibold"><ShoppingBasket className="h-4 w-4 text-credit" />Minha feira</p><p className="font-display text-xl">{brl(feira.reduce((s,i) => s+Number(i.qtd)*Number(i.preco),0))}</p><p className="mt-1 text-xs text-muted-foreground">{feira.length} itens · {feira.filter(i => i.pego).length} no carrinho</p><Button asChild variant="link" className="mt-1 h-8 px-0"><Link to="/feira">Abrir feira →</Link></Button></div>}
      {access.estoque && <div><p className="mb-2 flex items-center gap-2 font-semibold"><Package className="h-4 w-4 text-saved" />Estoque</p><p className="font-display text-xl">{estoque.length} produtos</p><p className="mt-1 text-xs text-muted-foreground">{faltantes.length} abaixo do padrão</p>{faltantes.length > 0 && <p className="mt-1 break-words text-xs text-debit">{faltantes.map(p => `${p.nome} (${Number(p.padrao)-Number(p.qtd)})`).join(' · ')}</p>}<Button asChild variant="link" className="mt-1 h-8 px-0"><Link to="/estoque">Abrir estoque →</Link></Button></div>}
      {access.moto && <div><p className="mb-2 flex items-center gap-2 font-semibold"><Fuel className="h-4 w-4 text-saved" />Gasolina da moto</p><dl className="space-y-2 text-sm"><div className="flex justify-between gap-2"><dt className="text-muted-foreground">Dinheiro destinado</dt><dd className="font-semibold">{brl(gasolina.reservado)}</dd></div><div className="flex justify-between gap-2"><dt className="text-muted-foreground">Gasto com gasolina</dt><dd className="font-semibold text-debit">{brl(gasolina.gasto)}</dd></div></dl></div>}
    </section>}
      {access.financas && <section className="mb-8 min-w-0 bg-card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl">Contas pendentes</h2><span className="text-sm text-muted-foreground">{pendentes.length}</span>
          <Button variant="outline" size="sm" aria-expanded={mostrarPendentes} aria-controls="contas-pendentes-painel" onClick={() => { setMostrarPendentes(mostrar => !mostrar); setMostrarFuturas(false); }}>{mostrarPendentes ? <EyeOff /> : <Eye />}{mostrarPendentes ? 'Ocultar pendências' : 'Mostrar pendências'}</Button>
        </div>
        {mostrarPendentes && <ul id="contas-pendentes-painel" className="max-h-72 overflow-y-auto">
          {!pendentesVisiveis.length && <li className="py-8 text-sm text-muted-foreground">Nenhuma conta pendente do mês vigente ou dos anteriores neste período.</li>}
          {pendentesVisiveis.map((m, i) => <Fragment key={m.id}>
            {(i === 0 || pendentesVisiveis[i - 1]?.data.slice(0, 7) !== m.data.slice(0, 7)) && <li className="border-b py-2 text-xs font-semibold capitalize text-muted-foreground">{new Date(m.data.slice(0, 7) + '-01T00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</li>}
            {editando === m.id && m.item ? <EditarLinha item={m.item} onFechar={() => {setEditando(null);recarregar();}} /> : <li className="flex flex-wrap items-center gap-2 border-b py-3"><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{m.nome}</p><p className="text-xs text-muted-foreground">Vence {dataBr(m.data)}{registro(m.criado_por, m.created_at)}</p></div><span className="text-sm font-semibold text-debit">{brl(m.valor)}</span>{controles(m.item,m.id,false,m.nome)}</li>}
          </Fragment>)}
          {pendentesFuturas.length > 0 && <li className="flex flex-wrap items-center justify-between gap-2 border-t py-2 text-xs text-muted-foreground"><span>{pendentesFuturas.length} {pendentesFuturas.length === 1 ? 'conta futura' : 'contas futuras'}</span><Button variant="ghost" size="sm" aria-expanded={mostrarFuturas} onClick={() => setMostrarFuturas(v => !v)}>{mostrarFuturas ? <EyeOff /> : <Eye />}{mostrarFuturas ? 'Recolher futuras' : 'Ver todas'}</Button></li>}
        </ul>}
      </section>}
    {visible.history && <section className="bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Históricos</h2>
        <Button variant="outline" size="sm" aria-expanded={mostrarHistorico} aria-controls="historicos-painel" onClick={() => setMostrarHistorico(mostrar => !mostrar)}>
          {mostrarHistorico ? <EyeOff /> : <Eye />}{mostrarHistorico ? 'Ocultar histórico' : 'Mostrar histórico'}
        </Button>
      </div>
      {mostrarHistorico && <div id="historicos-painel">
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Históricos">{availableTabs.map(t => <Button key={t.id} role="tab" aria-selected={activeTab===t.id} variant={activeTab===t.id?'default':'outline'} size="sm" onClick={() => setAba(t.id)}>{t.nome}</Button>)}</div>
      {erro && <p role="alert" className="mb-3 text-sm text-debit">{erro}</p>}
      <ul className="divide-y">
        {activeTab === 'movimentos' && <>{!lista.filter(m => !m.pendente).length && <li className="py-8 text-sm text-muted-foreground">Nenhuma movimentação neste período.</li>}{lista.filter(m => !m.pendente).map(m => editando === m.id && m.item ? <EditarLinha key={m.id} item={m.item} onFechar={() => {setEditando(null);recarregar();}} /> : <li key={m.id} className="flex items-start gap-3 py-4"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.entrada?'bg-credit-soft text-credit':'bg-debit-soft text-debit'}`}>{m.entrada?<ArrowDownLeft className="h-4 w-4" />:<ArrowUpRight className="h-4 w-4" />}</span><div className="min-w-0 flex-1 space-y-1"><p className="break-words text-sm font-semibold">{m.nome}</p><div className="flex flex-wrap items-center gap-x-4 gap-y-1"><p className="text-xs text-muted-foreground">forma: {contas[m.item?.conta ?? 'dinheiro']} · {dataBr(m.data)}</p><span className={`text-sm font-semibold ${m.entrada?'text-credit':'text-debit'}`}>{m.entrada?'+':'−'} {brl(m.valor)}</span>{controles(m.item,m.id,m.moto,m.nome)}</div>{registroTexto(m.criado_por, m.created_at) && <p className="text-xs text-muted-foreground">{registroTexto(m.criado_por, m.created_at)}</p>}</div></li>)}</>}
        {activeTab === 'gasolina' && <>{!moto.filter(d => noPeriodo(d.data)).length && !aportes.length && <li className="py-8 text-sm text-muted-foreground">Nenhum abastecimento ou aporte neste período.</li>}{[...moto.filter(d => noPeriodo(d.data)).map(d => ({...d,aporte:false})),...aportes.map(d => ({...d,aporte:true}))].sort((a,b) => b.data.localeCompare(a.data)).map(d => {const item = d.aporte ? lanc.find(l => l.id===d.id) ?? null : null; return editando === d.id && item && access.financas ? <EditarLinha key={d.id} item={item} onFechar={() => {setEditando(null);recarregar();}} /> : <li key={d.id} className="flex items-start gap-3 py-4"><Fuel className="mt-1 h-5 w-5 shrink-0 text-saved" /><div className="min-w-0 flex-1 space-y-1"><p className="break-words text-sm font-semibold">{d.descricao}</p><div className="flex flex-wrap items-center gap-x-4 gap-y-1"><p className="text-xs text-muted-foreground">forma: Dinheiro · {dataBr(d.data)}</p><span className={`text-sm font-semibold ${d.aporte?'text-saved':'text-debit'}`}>{d.aporte?'+':'−'} {brl(Number(d.valor))}</span>{controles(item,d.id,!d.aporte,d.descricao)}</div>{registroTexto(d.criado_por, d.created_at) && <p className="text-xs text-muted-foreground">{registroTexto(d.criado_por, d.created_at)} · {d.aporte ? 'Aporte para gasolina' : 'Abastecimento · Pago'}</p>}</div></li>;})}</>}
        {activeTab === 'compras' && <>{!compras.filter(c => noPeriodo(c.created_at)).length && <li className="py-8 text-sm text-muted-foreground">Nenhuma compra salva neste período.</li>}{compras.filter(c => noPeriodo(c.created_at)).sort((a,b) => b.created_at.localeCompare(a.created_at)).map(c => <li key={c.id} className="py-4"><details><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">Compra de {dataBr(c.created_at)}</p><p className={`text-xs ${c.pagamento && c.pagamento!=='nenhum'?'text-credit':'text-muted-foreground'}`}>{c.pagamento && c.pagamento!=='nenhum'?`Finalizada · ${contas[c.pagamento]}`:'Não finalizada · Sem pagamento lançado'} · {c.itens.length} itens</p></div><span className="text-sm font-semibold">{brl(Number(c.total))}</span></summary><ul className="mt-3 space-y-2 border-l pl-4">{c.itens.map((i,n) => <li key={n} className="flex justify-between gap-3 text-sm"><span className="break-words">{i.qtd} × {i.nome}</span><span className="shrink-0">{brl(i.qtd*i.preco)}</span></li>)}</ul><Button asChild variant="link" className="mt-2 px-0"><Link to="/feira">Abrir compra na Feira →</Link></Button></details></li>)}</>}
      </ul>
      </div>}
    </section>}
  </main>;
}
