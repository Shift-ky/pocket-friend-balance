import { useState } from 'react';
import { FolderPlus, Pencil, Trash2, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import type { DivisaoEstoque } from '@/lib/divisoes-estoque';

export function StockDivisions({ grupoId, divisoes, atualizar }: { grupoId: string; divisoes: DivisaoEstoque[]; atualizar: () => Promise<void> }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || editando === null) return;
    setSalvando(true); setErro('');
    const { error } = editando === ''
      ? await supabase.from('estoque_divisoes').insert({ grupo_id: grupoId, nome: nome.trim() })
      : await supabase.from('estoque_divisoes').update({ nome: nome.trim() }).eq('id', editando).eq('grupo_id', grupoId);
    if (error) setErro(error.code === '23505' ? 'Já existe uma divisão com esse nome.' : 'Não foi possível salvar a divisão.');
    else { await atualizar(); setEditando(null); setNome(''); }
    setSalvando(false);
  }
  async function excluir(d: DivisaoEstoque) {
    if (!confirm(`Excluir a divisão "${d.nome}"? Os produtos serão mantidos em Sem divisão.`)) return;
    setSalvando(true); setErro('');
    const { error } = await supabase.from('estoque_divisoes').delete().eq('id', d.id).eq('grupo_id', grupoId);
    if (error) setErro('Não foi possível excluir a divisão.'); else await atualizar();
    setSalvando(false);
  }
  return <section className="mt-6 border-y py-4" aria-label="Divisões do estoque">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-xl">Divisões</h2><Button type="button" variant="outline" size="sm" disabled={salvando} onClick={() => {setEditando(''); setNome(''); setErro('');}}><FolderPlus />Nova divisão</Button></div>
    {editando !== null && <form onSubmit={salvar} className="mt-3 flex gap-2">
      <input autoFocus required maxLength={60} aria-label="Nome da divisão" placeholder="Nome da divisão" value={nome} onChange={e => setNome(e.target.value)} className="min-w-0 flex-1 rounded-md border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
      <Button disabled={salvando} type="submit" size="icon" aria-label="Salvar divisão" title="Salvar divisão"><Check /></Button><Button type="button" variant="ghost" size="icon" aria-label="Cancelar" title="Cancelar" onClick={() => setEditando(null)}><X /></Button>
    </form>}
    {divisoes.length > 0 && <ul className="mt-3 divide-y">{divisoes.map(d => <li key={d.id} className="flex items-center gap-2 py-1"><span className="min-w-0 flex-1 break-words text-sm">{d.nome}</span><Button type="button" size="icon" variant="ghost" disabled={salvando} title="Renomear divisão" aria-label={`Renomear divisão ${d.nome}`} onClick={() => {setEditando(d.id); setNome(d.nome); setErro('');}}><Pencil /></Button><Button type="button" size="icon" variant="ghost" disabled={salvando} title="Excluir divisão" aria-label={`Excluir divisão ${d.nome}`} onClick={() => excluir(d)}><Trash2 /></Button></li>)}</ul>}
    {erro && <p role="alert" className="mt-2 text-sm text-debit">{erro}</p>}
  </section>;
}