import { createFileRoute, Link } from '@tanstack/react-router';
import { Fragment, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Wallet, PiggyBank, Utensils, ShoppingBasket, Fuel, Pencil, Trash2, Plus, Package, CalendarDays, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditarLinha } from '@/components/finance-editor';
import { useGrupo, useTabelaAoVivo } from '@/lib/grupo';
import { useSouAdmin } from '@/lib/use-admin';
import { supabase } from '@/integrations/supabase/client';
import { totaisMoto, type DespesaMoto } from '@/lib/moto';
import { brl, saldosPainel, pendenciasDoMes, ordenarPorVencimento, type LancamentoPainel } from '@/lib/painel';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'Painel — Minhas Finanças' },
    { name: 'description', content: 'Seus saldos, contas, compras, estoque e gasolina em um painel único.' },
    { property: 'og:title', content: 'Painel — Minhas Finanças' },
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
  const { linhas: lanc, recarregar } = useTabelaAoVivo<LancamentoPainel>('lancamentos', grupo.id);
  const { linhas: moto, recarregar: recarregarMoto } = useTabelaAoVivo<DespesaMoto>('moto_despesas', grupo.id);
  const { linhas: compras } = useTabelaAoVivo<Compra>('feira_historico', grupo.id);
  const { linhas: estoque } = useTabelaAoVivo<Produto>('estoque', grupo.id);
  const { linhas: feira } = useTabelaAoVivo<ItemFeira>('feira_itens', grupo.id);
  const admin = useSouAdmin();
  const [de, setDe] = useState(''); const [ate, setAte] = useState('');
  const [aba, setAba] = useState<'movimentos' | 'gasolina' | 'compras'>('movimentos');
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [mostrarPendentes, setMostrarPendentes] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const noPeriodo = (data: string) => (!de || data.slice(0,10) >= de) && (!ate || data.slice(0,10) <= ate);
  const saldos = saldosPainel(lanc); const gasolina = totaisMoto(lanc, moto);
  const todos = [
    ...lanc.filter(l => l.destino !== 'gasolina').map(l => ({ id: l.id, data: l.data, nome: l.descricao, valor: Number(l.valor), entrada: l.tipo === 'credito' || l.tipo === 'resgate', pendente: l.tipo === 'debito' && !l.pago, origem: `${tipos[l.tipo]} · ${contas[l.conta ?? 'dinheiro']}`, item: l, moto: false })),
    ...moto.map(d => ({ id: d.id, data: d.data, nome: d.descricao, valor: Number(d.valor), entrada: false, pendente: false, origem: 'Moto · Dinheiro', item: null, moto: true })),
  ].sort((a,b) => b.data.localeCompare(a.data));
  const lista = todos.filter(m => noPeriodo(m.data));
  const pendentes = ordenarPorVencimento(lista.filter(m => m.pendente));
  const entradas = lista.filter(m => m.entrada).reduce((s,m) => s + m.valor, 0);
  const saidas = lista.filter(m => !m.entrada && !m.pendente).reduce((s,m) => s + m.valor, 0);
  const meses = [...new Set(lista.map(m => m.data.slice(0,7)))].sort().slice(-6);
  const grafico = meses.map(m => ({ m, e: lista.filter(x => x.data.startsWith(m) && x.entrada).reduce((s,x) => s+x.valor,0), s: lista.filter(x => x.data.startsWith(m) && !x.entrada && !x.pendente).reduce((s,x) => s+x.valor,0) }));
  const maior = Math.max(1,...grafico.flatMap(g => [g.e,g.s]));
  const faltantes = estoque.filter(p => Number(p.qtd) < Number(p.padrao));
  const aportes = lanc.filter(l => l.destino === 'gasolina' && noPeriodo(l.data));
  async function pagar(item: LancamentoPainel) {
    const { error } = await supabase.from('lancamentos').update({ pago: !item.pago }).eq('id',item.id);
    if (error) setErro('Não foi possível atualizar o pagamento.'); else await recarregar();
  }
  async function excluir(id: string, ehMoto: boolean) {
    if (!admin || !confirm('Excluir esta movimentação?')) return;
    const { error, count } = await supabase.from(ehMoto ? 'moto_despesas' : 'lancamentos').delete({ count: 'exact' }).eq('id',id).eq('grupo_id',grupo.id);
    if (error || !count) setErro('Não foi possível excluir esta movimentação.');
    else { await recarregar(); await recarregarMoto(); }
  }
  function controles(item: LancamentoPainel | null, id: string, ehMoto: boolean) {
    return <div className="flex shrink-0 items-center gap-1">
      {item?.tipo === 'debito' && item.destino !== 'gasolina' && <Button variant="ghost" size="sm" className={item.pago ? 'text-credit' : 'text-debit'} onClick={() => pagar(item)}>{item.pago ? 'Pago' : 'Pagar'}</Button>}
      {item && <Button size="icon" variant="ghost" aria-label={`Editar ${item.descricao}`} title="Editar" onClick={() => setEditando(item.id)}><Pencil /></Button>}
      {admin && <Button size="icon" variant="ghost" aria-label={ehMoto ? 'Excluir abastecimento' : 'Excluir movimentação'} title="Excluir" onClick={() => excluir(id,ehMoto)}><Trash2 /></Button>}
    </div>;
  }

  return <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Minhas Finanças · {grupo.nome}</p><h1 className="font-display text-4xl sm:text-5xl">Meu Painel</h1></div>
      <div className="flex flex-wrap gap-2"><Button asChild><Link to="/financas"><Plus />Lançamento</Link></Button><Button asChild variant="outline"><Link to="/moto"><Fuel />Abastecimento</Link></Button></div>
    </header>
    <section aria-label="Saldos atuais" className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-6">
      <div className="min-w-0 rounded-lg bg-primary p-3 text-primary-foreground sm:p-4"><Wallet className="mb-3 h-5 w-5 opacity-80" /><p className="text-xs opacity-80">Dinheiro disponível</p><p className="mt-1 break-words font-display text-lg sm:text-xl">{brl(saldos.disponivel)}</p></div>
      <div aria-label="Pendências do mês atual" className="min-w-0 rounded-lg border bg-debit-soft p-3 sm:p-4"><CalendarDays className="mb-3 h-5 w-5 text-debit" /><p className="text-xs text-muted-foreground">Pendências · mês atual</p><p className="mt-1 break-words font-display text-lg text-debit sm:text-xl">{brl(pendenciasDoMes(lanc))}</p></div>
      {[{ nome: 'Dinheiro guardado', valor: saldos.guardado, Icon: PiggyBank, cor: 'text-saved' },{ nome: 'Alimentação', valor: saldos.alimentacao, Icon: ShoppingBasket, cor: 'text-credit' },{ nome: 'Refeição', valor: saldos.refeicao, Icon: Utensils, cor: 'text-debit' },{ nome: 'Gasolina disponível', valor: gasolina.saldo, Icon: Fuel, cor: 'text-saved' }].map(({nome,valor,Icon,cor}) => <div key={nome} className="min-w-0 rounded-lg border bg-card p-3 sm:p-4"><Icon className={`mb-3 h-5 w-5 ${cor}`} /><p className="text-xs text-muted-foreground">{nome}</p><p className="mt-1 break-words font-display text-lg sm:text-xl">{brl(valor)}</p></div>)}
    </section>
    <section className="mb-7 border-y py-4" aria-label="Período de pesquisa">
      <div className="flex flex-wrap items-end gap-3"><span className="mb-2 flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4" />Período</span><label className="min-w-0 flex-1 text-xs text-muted-foreground sm:max-w-44">De<input aria-label="De" type="date" value={de} onChange={e => setDe(e.target.value)} className={`${campo} mt-1`} /></label><label className="min-w-0 flex-1 text-xs text-muted-foreground sm:max-w-44">Até<input aria-label="Até" type="date" value={ate} onChange={e => setAte(e.target.value)} className={`${campo} mt-1`} /></label>{(de || ate) && <Button variant="ghost" size="sm" onClick={() => {setDe('');setAte('');}}><RotateCcw />Todo o período</Button>}</div>
      {de && ate && de > ate && <p role="alert" className="mt-2 text-sm text-debit">A data final deve ser igual ou posterior à inicial.</p>}
    </section>
    <div className="mb-8 grid gap-7 lg:grid-cols-[1.6fr_1fr]">
      <section><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl">Entradas e saídas</h2><span className="text-xs text-muted-foreground">No período</span></div>
        <div className="mb-5 grid grid-cols-2 gap-3"><div className="rounded-lg bg-credit-soft p-3"><p className="flex items-center gap-2 text-xs text-credit"><ArrowDownLeft className="h-4 w-4" />Entradas</p><p className="mt-1 break-words font-display text-xl text-credit">{brl(entradas)}</p></div><div className="rounded-lg bg-debit-soft p-3"><p className="flex items-center gap-2 text-xs text-debit"><ArrowUpRight className="h-4 w-4" />Saídas pagas</p><p className="mt-1 break-words font-display text-xl text-debit">{brl(saidas)}</p></div></div>
        {grafico.length ? <div className="flex h-40 items-end gap-3 border-b pb-2">{grafico.map(g => <div key={g.m} className="min-w-0 flex-1"><div className="flex h-28 items-end justify-center gap-1"><div className="w-1/3 rounded-t bg-credit" style={{height:`${g.e/maior*100}%`}} title={`Entradas: ${brl(g.e)}`} /><div className="w-1/3 rounded-t bg-debit" style={{height:`${g.s/maior*100}%`}} title={`Saídas pagas: ${brl(g.s)}`} /></div><p className="mt-2 text-center text-xs text-muted-foreground">{new Date(g.m+'-01T00:00').toLocaleDateString('pt-BR',{month:'short',year:'2-digit'})}</p></div>)}</div> : <p className="py-10 text-center text-sm text-muted-foreground">Sem movimentações neste período.</p>}
      </section>
      <section className="min-w-0 lg:border-l lg:pl-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl">Contas pendentes</h2><span className="text-sm text-muted-foreground">{pendentes.length}</span>
          <Button variant="outline" size="sm" aria-expanded={mostrarPendentes} aria-controls="contas-pendentes-painel" onClick={() => setMostrarPendentes(mostrar => !mostrar)}>{mostrarPendentes ? <EyeOff /> : <Eye />}{mostrarPendentes ? 'Ocultar pendências' : 'Mostrar pendências'}</Button>
        </div>
        {mostrarPendentes && <ul id="contas-pendentes-painel" className="max-h-72 overflow-y-auto">
          {!pendentes.length && <li className="py-8 text-sm text-muted-foreground">Nenhuma conta a pagar neste período.</li>}
          {pendentes.map((m, i) => <Fragment key={m.id}>
            {(i === 0 || pendentes[i - 1]?.data.slice(0, 7) !== m.data.slice(0, 7)) && <li className="border-b py-2 text-xs font-semibold capitalize text-muted-foreground">{new Date(m.data.slice(0, 7) + '-01T00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</li>}
            {editando === m.id && m.item ? <EditarLinha item={m.item} onFechar={() => {setEditando(null);recarregar();}} /> : <li className="flex flex-wrap items-center gap-2 border-b py-3"><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{m.nome}</p><p className="text-xs text-muted-foreground">Vence {dataBr(m.data)}</p></div><span className="text-sm font-semibold text-debit">{brl(m.valor)}</span>{controles(m.item,m.id,false)}</li>}
          </Fragment>)}
        </ul>}
      </section>
    </div>
    <section className="mb-8 grid gap-6 border-y py-5 sm:grid-cols-3" aria-label="Feira, estoque e moto">
      <div><p className="mb-2 flex items-center gap-2 font-semibold"><ShoppingBasket className="h-4 w-4 text-credit" />Minha feira</p><p className="font-display text-xl">{brl(feira.reduce((s,i) => s+Number(i.qtd)*Number(i.preco),0))}</p><p className="mt-1 text-xs text-muted-foreground">{feira.length} itens · {feira.filter(i => i.pego).length} no carrinho</p><Button asChild variant="link" className="mt-1 h-8 px-0"><Link to="/feira">Abrir feira →</Link></Button></div>
      <div><p className="mb-2 flex items-center gap-2 font-semibold"><Package className="h-4 w-4 text-saved" />Estoque</p><p className="font-display text-xl">{estoque.length} produtos</p><p className="mt-1 text-xs text-muted-foreground">{faltantes.length} abaixo do padrão</p>{faltantes.length > 0 && <p className="mt-1 break-words text-xs text-debit">{faltantes.map(p => `${p.nome} (${Number(p.padrao)-Number(p.qtd)})`).join(' · ')}</p>}<Button asChild variant="link" className="mt-1 h-8 px-0"><Link to="/estoque">Abrir estoque →</Link></Button></div>
      <div><p className="mb-2 flex items-center gap-2 font-semibold"><Fuel className="h-4 w-4 text-saved" />Gasolina da moto</p><dl className="space-y-2 text-sm"><div className="flex justify-between gap-2"><dt className="text-muted-foreground">Dinheiro destinado</dt><dd className="font-semibold">{brl(gasolina.reservado)}</dd></div><div className="flex justify-between gap-2"><dt className="text-muted-foreground">Gasto com gasolina</dt><dd className="font-semibold text-debit">{brl(gasolina.gasto)}</dd></div></dl></div>
    </section>
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Históricos</h2>
        <Button variant="outline" size="sm" aria-expanded={mostrarHistorico} aria-controls="historicos-painel" onClick={() => setMostrarHistorico(mostrar => !mostrar)}>
          {mostrarHistorico ? <EyeOff /> : <Eye />}{mostrarHistorico ? 'Ocultar histórico' : 'Mostrar histórico'}
        </Button>
      </div>
      {mostrarHistorico && <div id="historicos-painel">
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Históricos">{([{id:'movimentos',nome:'Todas as movimentações'},{id:'gasolina',nome:'Moto e aportes'},{id:'compras',nome:'Compras da feira'}] as const).map(t => <Button key={t.id} role="tab" aria-selected={aba===t.id} variant={aba===t.id?'default':'outline'} size="sm" onClick={() => setAba(t.id)}>{t.nome}</Button>)}</div>
      {erro && <p role="alert" className="mb-3 text-sm text-debit">{erro}</p>}
      <ul className="divide-y">
        {aba === 'movimentos' && <>{!lista.filter(m => !m.pendente).length && <li className="py-8 text-sm text-muted-foreground">Nenhuma movimentação neste período.</li>}{lista.filter(m => !m.pendente).map(m => editando === m.id && m.item ? <EditarLinha key={m.id} item={m.item} onFechar={() => {setEditando(null);recarregar();}} /> : <li key={m.id} className="flex flex-wrap items-center gap-3 py-4"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.entrada?'bg-credit-soft text-credit':'bg-debit-soft text-debit'}`}>{m.entrada?<ArrowDownLeft className="h-4 w-4" />:<ArrowUpRight className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{m.nome}</p><p className="text-xs text-muted-foreground">{m.origem} · {dataBr(m.data)}</p></div><span className={`text-sm font-semibold ${m.entrada?'text-credit':'text-debit'}`}>{m.entrada?'+':'−'} {brl(m.valor)}</span>{controles(m.item,m.id,m.moto)}</li>)}</>}
        {aba === 'gasolina' && <>{!moto.filter(d => noPeriodo(d.data)).length && !aportes.length && <li className="py-8 text-sm text-muted-foreground">Nenhum abastecimento ou aporte neste período.</li>}{[...moto.filter(d => noPeriodo(d.data)).map(d => ({...d,aporte:false})),...aportes.map(d => ({...d,aporte:true}))].sort((a,b) => b.data.localeCompare(a.data)).map(d => {const item = d.aporte ? lanc.find(l => l.id===d.id) ?? null : null; return editando === d.id && item ? <EditarLinha key={d.id} item={item} onFechar={() => {setEditando(null);recarregar();}} /> : <li key={d.id} className="flex flex-wrap items-center gap-3 py-4"><Fuel className="h-5 w-5 shrink-0 text-saved" /><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{d.descricao}</p><p className="text-xs text-muted-foreground">{d.aporte?'Aporte para gasolina':'Abastecimento · Dinheiro · Pago'} · {dataBr(d.data)}</p></div><span className={`text-sm font-semibold ${d.aporte?'text-saved':'text-debit'}`}>{d.aporte?'+':'−'} {brl(Number(d.valor))}</span>{controles(item,d.id,!d.aporte)}</li>;})}</>}
        {aba === 'compras' && <>{!compras.filter(c => noPeriodo(c.created_at)).length && <li className="py-8 text-sm text-muted-foreground">Nenhuma compra salva neste período.</li>}{compras.filter(c => noPeriodo(c.created_at)).sort((a,b) => b.created_at.localeCompare(a.created_at)).map(c => <li key={c.id} className="py-4"><details><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">Compra de {dataBr(c.created_at)}</p><p className={`text-xs ${c.pagamento && c.pagamento!=='nenhum'?'text-credit':'text-muted-foreground'}`}>{c.pagamento && c.pagamento!=='nenhum'?`Finalizada · ${contas[c.pagamento]}`:'Não finalizada · Sem pagamento lançado'} · {c.itens.length} itens</p></div><span className="text-sm font-semibold">{brl(Number(c.total))}</span></summary><ul className="mt-3 space-y-2 border-l pl-4">{c.itens.map((i,n) => <li key={n} className="flex justify-between gap-3 text-sm"><span className="break-words">{i.qtd} × {i.nome}</span><span className="shrink-0">{brl(i.qtd*i.preco)}</span></li>)}</ul><Button asChild variant="link" className="mt-2 px-0"><Link to="/feira">Abrir compra na Feira →</Link></Button></details></li>)}</>}
      </ul>
      </div>}
    </section>
  </main>;
}
