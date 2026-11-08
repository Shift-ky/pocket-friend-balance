import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, FileText, Send, Trash2, Save, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGrupo } from '@/lib/grupo';
import { linkTelegram, listTelegramReviews, reviewTelegram, telegramFile } from '@/lib/telegram.functions';
import type { Tables } from '@/integrations/supabase/types';
import { TelegramProducts } from '@/components/telegram-products';
import { TelegramReceipt } from '@/components/telegram-receipt';
import { supabase } from '@/integrations/supabase/client';
import { EditarLinha } from '@/components/finance-editor';

export const Route = createFileRoute('/conferencia')({ head: () => ({ meta: [
  { title: 'MarIA — Conferência do Telegram' }, { name: 'description', content: 'Revise cupons e boletos recebidos pelo Telegram antes de lançar nas carteiras.' },
  { property: 'og:title', content: 'MarIA — Conferência do Telegram' }, { property: 'og:description', content: 'Conferência e aprovação de documentos financeiros.' },
  { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
] }), component: Conference });
const field = 'mt-1 w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';
function Conference() {
  const { grupo } = useGrupo(); const read = listTelegramReviews; const link = linkTelegram;
  const qc = useQueryClient(); const [message, setMessage] = useState(''); const [filter, setFilter] = useState('pendente');
  const { data, error } = useQuery({ queryKey: ['telegram', grupo.id], queryFn: () => read({ data: { grupo: grupo.id } }), refetchInterval: 5000 });
  return <main className="mx-auto max-w-4xl px-4 py-8 pb-28 sm:px-5">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-6"><div><p className="text-xs font-semibold uppercase text-primary">Telegram · MarIA</p><h1 className="mt-2 font-display text-3xl">Conferência</h1><p className="mt-2 text-sm text-muted-foreground">{data?.linked ? 'Telegram conectado' : 'Telegram não vinculado'} · Aprovação manual</p><p className="mt-2 max-w-xl text-sm text-muted-foreground">Para ajudar na leitura, envie o documento inteiro, nítido, sem reflexos e na posição correta.</p></div>
      <Button variant="outline" onClick={async () => { try { const x = await link({ data: { grupo: grupo.id } }); window.location.assign(x.url); } catch(e) { setMessage(e instanceof Error ? e.message : 'Falha ao conectar'); } }}><Send />{data?.linked ? 'Vincular novamente' : 'Conectar Telegram'}</Button></header>
    {(message || error) && <p role="status" className="my-4 text-sm text-debit">{message || error?.message}</p>}
    <div className="my-6 flex gap-2">{['pendente', 'aprovado', 'descartado'].map(s => <Button key={s} variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)}>{s === 'pendente' ? 'Pendentes' : s === 'aprovado' ? 'Aprovados' : 'Descartados'}</Button>)}</div>
    {!data ? <p className="text-muted-foreground">Carregando…</p> : !data.rows.some(r => r.status === filter) ? <p className="py-12 text-center text-muted-foreground">Nenhum item {filter === 'pendente' ? 'em conferência' : filter}.</p> : <div className="space-y-4">{data.rows.filter(r => r.status === filter).map(row => <Review key={`${row.id}:${row.extraction_status}`} row={row} done={() => { void qc.invalidateQueries({ queryKey: ['telegram', grupo.id] }); }} />)}</div>}
  </main>;
}
function Review({ row, done }: { row: Tables<'telegram_reviews'>; done: () => void }) {
  const act = reviewTelegram; const file = telegramFile;
  const [valor, setValor] = useState(String(row.valor ?? '')); const [data, setData] = useState(row.data ?? '');
  const [descricao, setDescricao] = useState(row.descricao); const [conta, setConta] = useState<'dinheiro'|'alimentacao'|'refeicao'>(row.conta as 'dinheiro');
  const [categoria, setCategoria] = useState(row.categoria); const [pago, setPago] = useState(row.pago);
  const [confirm, setConfirm] = useState<'aprovar'|'descartar'|null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [editingApproved, setEditingApproved] = useState(false);
  async function action(kind: 'salvar'|'aprovar'|'descartar') {
    setBusy(true); setError(''); try { await act({ data: { id: row.id, action: kind, valor: Number(valor.replace(',', '.')) || null, data: data || null, descricao, conta, categoria, pago } }); setConfirm(null); done(); } catch(e) { setError(e instanceof Error ? e.message : 'Falha ao salvar'); } finally { setBusy(false); }
  }
  const receipt=(row.documento==='cupom'||(Array.isArray(row.produtos)&&row.produtos.length>0)) && !row.produtos_destino;
  return <article className="rounded-lg border bg-card p-5">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4 text-primary" />{row.documento.toUpperCase()}</h2><p className="mt-1 break-words text-sm text-muted-foreground">{row.beneficiario || row.file_name || 'Texto recebido'} · {new Date(row.created_at).toLocaleString('pt-BR')}</p></div>{row.file_path && <Button variant="ghost" size="icon" title="Abrir documento" aria-label="Abrir documento" onClick={async () => { try { const x = await file({ data: { id: row.id } }); window.open(x.url, '_blank', 'noopener,noreferrer'); } catch(e) { setError(e instanceof Error ? e.message : 'Arquivo indisponível'); } }}><ExternalLink /></Button>}</div>
    {row.source_text && <p className="my-3 break-words text-xs text-muted-foreground">{row.source_text}</p>}
    {row.codigo && <p className="my-3 break-all font-mono text-xs">{row.codigo}</p>}
    {row.status === 'pendente' && row.documento === 'boleto' && row.extraction_status === 'concluido' && !row.codigo && <p role="status" className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">A linha digitável não foi identificada. Confira o boleto manualmente antes de salvar.</p>}
    {receipt && row.status==='pendente' ? <TelegramReceipt row={row} done={done}/> : <TelegramProducts key={`${row.id}:${row.produtos_destino ?? 'revisao'}`} row={row} done={done} />}
    {row.status === 'pendente' && receipt ? null : row.status === 'pendente' ? <><p className="mt-3 text-xs text-muted-foreground">{row.extraction_status === 'aguardando' ? 'Aguardando leitura' : row.extraction_status === 'processando' ? 'Lendo documento…' : row.extraction_status === 'erro' ? 'Leitura não concluída · preencha os campos para conferir' : 'Dados extraídos · confira antes de aprovar'}</p>{row.error && <p role="alert" className="mt-2 break-words text-xs text-debit">{row.error}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm">Valor (R$)<input aria-label="Valor" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} className={field} /></label><label className="text-sm">Vencimento / emissão<input aria-label="Data" type="date" value={data} onChange={e => setData(e.target.value)} className={field} /></label><label className="text-sm sm:col-span-2">Descrição / favorecido<input aria-label="Descrição" maxLength={200} value={descricao} onChange={e => setDescricao(e.target.value)} className={field} /></label><label className="text-sm">Carteira<select aria-label="Carteira" value={conta} onChange={e => setConta(e.target.value as typeof conta)} className={field}><option value="dinheiro">Dinheiro</option><option value="alimentacao">Alimentação</option><option value="refeicao">Refeição</option></select></label><label className="text-sm">Categoria<input aria-label="Categoria" maxLength={100} value={categoria} onChange={e => setCategoria(e.target.value)} className={field} /></label></div>
      <label className="my-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={pago} onChange={e => setPago(e.target.checked)} />Já pago</label>
      {confirm ? <div role="alertdialog" aria-label="Confirmar conferência" className="border-l-2 border-primary pl-4"><p className="mb-3 text-sm">{confirm === 'aprovar' ? `Efetivar ${pago ? 'como saída paga' : 'nas contas pendentes'}?` : 'Descartar sem criar lançamento?'}</p><div className="flex gap-2"><Button disabled={busy} onClick={() => action(confirm)}>Confirmar</Button><Button variant="outline" disabled={busy} onClick={() => setConfirm(null)}>Cancelar</Button></div></div> : <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => setConfirm('aprovar')}><Check />Aprovar</Button><Button variant="outline" disabled={busy} onClick={() => action('salvar')}><Save />Salvar revisão</Button><Button variant="ghost" disabled={busy} onClick={() => setConfirm('descartar')}><Trash2 />Descartar</Button></div>}
    </> : <div className="mt-4 space-y-3"><p className="text-sm">{row.descricao} · R$ {Number(row.valor ?? 0).toFixed(2)} · {row.status === 'aprovado' ? (row.pago ? 'Saída paga' : 'Conta pendente') : 'Descartado'}</p>{row.status === 'aprovado' && row.lancamento_id && <Button type="button" variant="outline" size="sm" onClick={() => setEditingApproved(v => !v)}><Pencil />{editingApproved ? 'Fechar edição' : 'Editar lançamento'}</Button>}{editingApproved && row.status === 'aprovado' && <EditarLancamentoTelegram row={row} onCancel={() => setEditingApproved(false)} onSaved={() => { setEditingApproved(false); done(); }} />}</div>}
    {error && <p role="alert" className="mt-3 text-sm text-debit">{error}</p>}
  </article>;
}
function EditarLancamentoTelegram({ row, onCancel, onSaved }: {
  row: Tables<'telegram_reviews'>;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { data: launch, error } = useQuery({ queryKey: ['telegram-launch', row.lancamento_id], queryFn: async () => {
    const { data, error } = await supabase.from('lancamentos').select('*').eq('id', row.lancamento_id ?? '').single();
    if (error) throw error;
    return data;
  } });
  if (error) return <p role="alert" className="text-sm text-debit">Não foi possível abrir o lançamento.</p>;
  if (!launch) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!['credito', 'debito', 'aplicacao', 'resgate'].includes(launch.tipo) || !['dinheiro', 'alimentacao', 'refeicao'].includes(launch.conta)) return null;
  return <ul><EditarLinha item={{ ...launch, tipo: launch.tipo as 'credito'|'debito'|'aplicacao'|'resgate', conta: launch.conta as 'dinheiro'|'alimentacao'|'refeicao' }} onFechar={onSaved} /></ul>;
}