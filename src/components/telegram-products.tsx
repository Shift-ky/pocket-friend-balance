import { useState } from 'react';
import { Package, Plus, Save, ShoppingBasket, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccess } from '@/lib/access-context';
import { reviewTelegramProducts } from '@/lib/telegram.functions';
import { produtosExtraidos } from '@/lib/telegram/model';
import type { Tables } from '@/integrations/supabase/types';

const field = 'mt-1 w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';
export function TelegramProducts({ row, done }: { row: Tables<'telegram_reviews'>; done: () => void }) {
  const access = useAccess(); const act = reviewTelegramProducts;
  const [items, setItems] = useState(() => produtosExtraidos(row.produtos).map((p, id) => ({ id, nome: p.nome, qtd: String(p.qtd ?? ''), selected: true })));
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState<'feira' | 'estoque' | null>(null);
  const reading = row.extraction_status === 'aguardando' || row.extraction_status === 'processando';
  const locked = Boolean(row.produtos_destino) || row.status === 'descartado' || reading;
  const selected = items.filter(i => i.selected);
  function change(id: number, patch: Partial<(typeof items)[number]>) { setNotice(''); setConfirm(null); setItems(current => current.map(i => i.id === id ? { ...i, ...patch } : i)); }
  async function submit(action: 'salvar' | 'feira' | 'estoque') {
    setBusy(true); setError(''); setNotice('');
    try {
      const produtos = (action === 'salvar' ? items : selected).map(i => ({ nome: i.nome, qtd: i.qtd.trim() ? Number(i.qtd.replace(',', '.')) : null }));
      await act({ data: { id: row.id, action, produtos } });
      setConfirm(null); setNotice(action === 'salvar' ? 'Produtos revisados e salvos.' : 'Produtos adicionados.'); done();
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar os produtos.'); }
    finally { setBusy(false); }
  }
  return <section aria-label="Produtos do cupom" className="mt-5 border-t pt-4">
    <h3 className="flex items-center gap-2 font-semibold"><Package className="h-4 w-4 text-primary" />Produtos do cupom <span className="text-xs font-normal text-muted-foreground">{items.length}</span></h3>
    {row.produtos_destino && <p role="status" className="mt-2 text-sm text-credit">Adicionados {row.produtos_destino === 'feira' ? 'à Feira' : 'ao Estoque'} · {new Date(row.produtos_importados_at ?? row.created_at).toLocaleString('pt-BR')}</p>}
    {!items.length && <p className="mt-3 text-sm text-muted-foreground">{reading ? 'Aguardando leitura dos produtos…' : 'Nenhum produto identificado.'}</p>}
    <div className="mt-3 space-y-3">{items.map((item, index) => <div key={item.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-2 border-b pb-3">
      <input aria-label={`Selecionar produto ${index + 1}`} type="checkbox" className="mb-3" checked={item.selected} disabled={locked || busy} onChange={e => change(item.id, { selected: e.target.checked })} />
      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_7rem]">
        <label className="min-w-0 text-xs text-muted-foreground">Produto<input aria-label={`Produto ${index + 1}`} value={item.nome} maxLength={200} disabled={locked || busy} onChange={e => change(item.id, { nome: e.target.value })} className={field} /></label>
        <label className="min-w-0 text-xs text-muted-foreground">Quantidade<input aria-label={`Quantidade ${index + 1}`} inputMode="decimal" value={item.qtd} placeholder="Conferir" disabled={locked || busy} onChange={e => change(item.id, { qtd: e.target.value })} className={field} /></label>
      </div>
      {!locked && <Button variant="ghost" size="icon" disabled={busy} aria-label={`Remover produto ${index + 1}`} title="Remover produto" onClick={() => { setConfirm(null); setItems(current => current.filter(i => i.id !== item.id)); }}><Trash2 /></Button>}
    </div>)}</div>
    {!locked && <>
      <div className="mt-3 flex flex-wrap gap-2"><Button variant="ghost" disabled={busy} onClick={() => { setConfirm(null); setItems(current => [...current, { id: Math.max(-1, ...current.map(i => i.id)) + 1, nome: '', qtd: '', selected: true }]); }}><Plus />Produto</Button><Button variant="outline" disabled={busy} onClick={() => submit('salvar')}><Save />Salvar produtos</Button></div>
      {confirm ? <div role="alertdialog" aria-label="Confirmar produtos" className="mt-4 border-l-2 border-primary pl-4"><p className="text-sm">Adicionar {selected.length} produto(s) {confirm === 'feira' ? 'à lista da Feira' : 'ao Estoque'}?</p><p className="mt-1 text-xs text-muted-foreground">{confirm === 'feira' ? 'Quantidades somadas à previsão; carrinho e pagamentos preservados.' : 'Quantidades somadas ao estoque; reposição atualizada.'} Nenhum débito será criado.</p><div className="mt-3 flex flex-wrap gap-2"><Button disabled={busy} onClick={() => submit(confirm)}>Confirmar produtos</Button><Button variant="outline" disabled={busy} onClick={() => setConfirm(null)}>Cancelar</Button></div></div> : <div className="mt-4 flex flex-wrap gap-2">{access.feira && <Button disabled={busy || !selected.length} onClick={() => setConfirm('feira')}><ShoppingBasket />Adicionar à Feira</Button>}{access.estoque && <Button variant="outline" disabled={busy || !selected.length} onClick={() => setConfirm('estoque')}><Package />Adicionar ao Estoque</Button>}</div>}
    </>}
    {notice && <p role="status" className="mt-3 text-sm text-credit">{notice}</p>}{error && <p role="alert" className="mt-3 break-words text-sm text-debit">{error}</p>}
  </section>;
}