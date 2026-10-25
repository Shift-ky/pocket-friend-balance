import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Fuel, Pencil, Pause, Play, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGrupo, useTabelaAoVivo } from '@/lib/grupo';
import { supabase } from '@/lib/offline-client';
import { useAccess } from '@/lib/access-context';
import { useSouAdmin } from '@/lib/use-admin';
import { carteirasFixas, validarFixa, type ContaFixa } from '@/lib/contas-fixas';
import { brl } from '@/lib/painel';

export const Route = createFileRoute('/contas-fixas')({
  head: () => ({ meta: [
    { title: 'MarIA — Contas e entradas fixas' },
    { name: 'description', content: 'Cadastre entradas, aportes e contas mensais com data inicial e duração definida ou indefinida.' },
    { property: 'og:title', content: 'MarIA — Contas e entradas fixas' },
    { property: 'og:description', content: 'Organize seus recebimentos e contas mensais automáticos.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: ContasFixas,
});

const campo = 'mt-1 w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring';
const dataBr = (data: string) => new Date(`${data}T00:00`).toLocaleDateString('pt-BR');
const hojeBr = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());

function ContasFixas() {
  const { grupo } = useGrupo();
  const access = useAccess();
  const admin = useSouAdmin();
  const { linhas, recarregar } = useTabelaAoVivo<ContaFixa>('contas_fixas', grupo.id);
  const [modalidade, setModalidade] = useState<ContaFixa['modalidade']>('credito');
  const [conta, setConta] = useState<ContaFixa['conta']>('dinheiro');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dia, setDia] = useState('1');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [indefinido, setIndefinido] = useState(true);
  const [editando, setEditando] = useState<ContaFixa | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [excluindo, setExcluindo] = useState<ContaFixa | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  useEffect(() => { setInicio(hojeBr()); setDia(String(Number(hojeBr().slice(-2)))); }, []);
  useEffect(() => { if (!sucesso) return; const timer = setTimeout(() => setSucesso(''), 4000); return () => clearTimeout(timer); }, [sucesso]);
  const modo = modalidade === 'gasolina' && !access.moto ? 'credito' : modalidade;
  const payload = { descricao: descricao.trim(), modalidade: modo, conta: modo === 'gasolina' ? 'dinheiro' as const : conta, valor: Number(valor.replace(',', '.')), dia: Number(dia), inicio, fim: indefinido ? null : fim, ativa: editando?.ativa ?? true };
  function limpar() {
    setEditando(null); setDescricao(''); setValor(''); setConfirmando(false); setErro(''); setIndefinido(true); setFim('');
  }
  function editar(fixa: ContaFixa) {
    setEditando(fixa); setModalidade(fixa.modalidade); setConta(fixa.conta); setDescricao(fixa.descricao); setValor(String(fixa.valor)); setDia(String(fixa.dia)); setInicio(fixa.inicio); setFim(fixa.fim ?? ''); setIndefinido(fixa.fim === null); setConfirmando(false); setErro('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando || !access.financas) return;
    const mensagem = validarFixa(payload);
    if (mensagem) { setErro(mensagem); return; }
    if (!confirmando) { setConfirmando(true); setErro(''); return; }
    setSalvando(true); setErro('');
    try {
      const { error } = editando
        ? await supabase.from('contas_fixas').update(payload).eq('id', editando.id).eq('grupo_id', grupo.id)
        : await supabase.from('contas_fixas').insert({ ...payload, grupo_id: grupo.id });
      if (error) { setErro(error.message); return; }
      limpar(); setSucesso('Cadastro salvo.'); await recarregar();
    } finally { setSalvando(false); }
  }
  async function alternar(fixa: ContaFixa) {
    if (salvando) return;
    setSalvando(true); setErro('');
    try {
      const { error } = await supabase.from('contas_fixas').update({ ativa: !fixa.ativa }).eq('id', fixa.id).eq('grupo_id', grupo.id);
      if (error) setErro(error.message); else { await recarregar(); setSucesso(fixa.ativa ? 'Lançamentos automáticos pausados.' : 'Lançamentos automáticos retomados.'); }
    } finally { setSalvando(false); }
  }
  async function excluir() {
    if (!excluindo || !admin || salvando) return;
    setSalvando(true); setErro('');
    try {
      const { error } = await supabase.from('contas_fixas').delete().eq('id', excluindo.id).eq('grupo_id', grupo.id);
      if (error) setErro(error.message); else { if (editando?.id === excluindo.id) limpar(); setExcluindo(null); await recarregar(); setSucesso('Cadastro excluído.'); }
    } finally { setSalvando(false); }
  }
  return <main className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-10">
    {sucesso && <div role="status" className="fixed inset-x-0 top-4 z-50 mx-auto w-fit max-w-[90vw] rounded-lg bg-credit px-4 py-2 text-center text-sm font-semibold text-primary-foreground shadow-lg">{sucesso}</div>}
    {excluindo && <div role="alertdialog" aria-label="Confirmar exclusão" className="fixed inset-x-0 top-4 z-50 mx-auto w-fit max-w-[90vw] space-y-3 rounded-lg border-2 border-primary bg-card p-4 shadow-lg"><p className="font-semibold">Excluir cadastro fixo?</p><p className="text-sm text-muted-foreground">{excluindo.descricao} · Os lançamentos já gerados serão mantidos.</p><div className="flex gap-2"><Button disabled={salvando} onClick={excluir} className="bg-debit text-primary-foreground">Excluir</Button><Button variant="outline" disabled={salvando} onClick={() => setExcluindo(null)}>Cancelar</Button></div></div>}
    <header className="mb-7"><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><CalendarDays className="h-4 w-4" />Todo mês</p><h1 className="font-display text-3xl sm:text-4xl">Contas e entradas fixas</h1></header>
    <form onSubmit={salvar} className="space-y-4 border-y py-6">
      <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{editando ? 'Editar cadastro' : 'Novo cadastro'}</h2>{editando && <Button type="button" variant="ghost" size="icon" title="Cancelar edição" aria-label="Cancelar edição" onClick={limpar}><X /></Button>}</div>
      <div className="grid grid-cols-2 gap-2"><Button type="button" variant={modo !== 'debito' ? 'default' : 'outline'} aria-pressed={modo !== 'debito'} onClick={() => { setModalidade('credito'); setConfirmando(false); }}><ArrowDownLeft />Entrada fixa</Button><Button type="button" variant={modo === 'debito' ? 'default' : 'outline'} aria-pressed={modo === 'debito'} onClick={() => { setModalidade('debito'); setConfirmando(false); }}><ArrowUpRight />Conta fixa</Button></div>
      <label className="block text-sm text-muted-foreground">{modo === 'debito' ? 'Carteira' : 'Entrada'}<select aria-label={modo === 'debito' ? 'Carteira' : 'Entrada'} className={campo} value={modo === 'gasolina' ? 'gasolina' : conta} onChange={e => { if (e.target.value === 'gasolina') { setModalidade('gasolina'); setConta('dinheiro'); } else { setConta(e.target.value as ContaFixa['conta']); if (modo !== 'debito') setModalidade('credito'); } setConfirmando(false); }}>
        {Object.entries(carteirasFixas).map(([id, nome]) => <option key={id} value={id}>{modo === 'debito' ? nome : `Entrada de ${nome}`}</option>)}
        {modo !== 'debito' && access.moto && <option value="gasolina">Gasolina · Aporte da Moto</option>}
      </select></label>
      <label className="block text-sm text-muted-foreground">Descrição<input required maxLength={200} aria-label="Descrição" value={descricao} onChange={e => { setDescricao(e.target.value); setConfirmando(false); }} className={campo} /></label>
      <div className="grid grid-cols-2 gap-3"><label className="min-w-0 text-sm text-muted-foreground">Valor mensal (R$)<input required inputMode="decimal" aria-label="Valor mensal" value={valor} onChange={e => { setValor(e.target.value); setConfirmando(false); }} className={campo} /></label><label className="min-w-0 text-sm text-muted-foreground">Dia do mês<input required type="number" min="1" max="31" step="1" aria-label="Dia do mês" value={dia} onChange={e => { setDia(e.target.value); setConfirmando(false); }} className={campo} /></label></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="min-w-0 text-sm text-muted-foreground">Início<input required type="date" min="2000-01-01" aria-label="Início" value={inicio} onChange={e => { setInicio(e.target.value); setConfirmando(false); }} className={campo} /></label><div className="min-w-0"><label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={indefinido} onChange={e => { setIndefinido(e.target.checked); setConfirmando(false); }} className="accent-primary" />Sem data final</label>{!indefinido && <label className="mt-2 block text-sm text-muted-foreground">Fim<input required type="date" min={inicio} aria-label="Fim" value={fim} onChange={e => { setFim(e.target.value); setConfirmando(false); }} className={campo} /></label>}</div></div>
      {erro && <p role="alert" className="text-sm text-debit">{erro}</p>}
      {confirmando ? <div className="space-y-3 border-l-2 border-primary pl-4"><p className="text-sm font-semibold">Confirmar cadastro mensal?</p><p className="text-sm text-muted-foreground">{descricao} · {brl(payload.valor)} · dia {dia}</p><p className="text-xs text-muted-foreground">{modo === 'gasolina' ? 'Aporte pago em dinheiro para a Moto.' : modo === 'debito' ? 'Conta gerada como pendente; descontada somente após pagar.' : 'Entrada recebida automaticamente na carteira escolhida.'} Dias 29, 30 e 31 usam o último dia quando o mês é mais curto. Datas anteriores ao dia de hoje serão lançadas ao salvar. Alterações não modificam lançamentos já gerados.</p><div className="flex gap-2"><Button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Confirmar'}</Button><Button type="button" variant="outline" disabled={salvando} onClick={() => setConfirmando(false)}>Cancelar</Button></div></div> : <Button type="submit" disabled={salvando} className="w-full"><Plus />{editando ? 'Salvar alterações' : 'Cadastrar'}</Button>}
    </form>
    <section aria-label="Cadastros mensais" className="pt-7"><h2 className="mb-4 font-display text-2xl">Cadastros mensais</h2>{!linhas.length && <p className="text-sm text-muted-foreground">Nenhuma conta ou entrada fixa cadastrada.</p>}<ul className="divide-y">{linhas.map(fixa => <li key={fixa.id} className="flex flex-wrap items-center gap-3 py-4"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${fixa.modalidade === 'debito' ? 'bg-debit-soft text-debit' : fixa.modalidade === 'gasolina' ? 'bg-saved-soft text-saved' : 'bg-credit-soft text-credit'}`}>{fixa.modalidade === 'gasolina' ? <Fuel className="h-4 w-4" /> : fixa.modalidade === 'debito' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{fixa.descricao}</p><p className="text-xs text-muted-foreground">{fixa.modalidade === 'gasolina' ? 'Aporte da Moto' : `${fixa.modalidade === 'debito' ? 'Conta' : 'Entrada'} · ${carteirasFixas[fixa.conta]}`} · dia {fixa.dia} · {fixa.ativa ? 'Ativa' : 'Pausada'}</p><p className="text-xs text-muted-foreground">{dataBr(fixa.inicio)} → {fixa.fim ? dataBr(fixa.fim) : 'Indefinido'}</p></div><span className="text-sm font-semibold">{brl(Number(fixa.valor))}</span><div className="flex shrink-0"><Button variant="ghost" size="icon" disabled={salvando} aria-label={`Editar ${fixa.descricao}`} title="Editar" onClick={() => editar(fixa)}><Pencil /></Button><Button variant="ghost" size="icon" disabled={salvando} aria-label={`${fixa.ativa ? 'Pausar' : 'Retomar'} ${fixa.descricao}`} title={fixa.ativa ? 'Pausar' : 'Retomar'} onClick={() => alternar(fixa)}>{fixa.ativa ? <Pause /> : <Play />}</Button>{admin && <Button variant="ghost" size="icon" disabled={salvando} aria-label={`Excluir ${fixa.descricao}`} title="Excluir" onClick={() => setExcluindo(fixa)}><Trash2 /></Button>}</div></li>)}</ul></section>
  </main>;
}