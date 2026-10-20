import { useState } from 'react';
import { FolderPlus, Pencil, Trash2, X, Check, Settings2 } from 'lucide-react';
import { supabase } from '@/lib/offline-client';
import { Button } from '@/components/ui/button';
import type { DivisaoEstoque } from '@/lib/divisoes-estoque';

export function StockDivisions({ grupoId, divisoes, atualizar }: { grupoId: string; divisoes: DivisaoEstoque[]; atualizar: () => Promise<void> }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [gerenciando, setGerenciando] = useState(false);
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
  return <section className="mt-2" aria-label="Divisões do estoque">
    <div className="flex items-center justify-end gap-1"><Button type="button" variant="ghost" size="icon" className="text-muted-foreground" disabled={salvando} aria-label="Nova divisão" title="Nova divisão" onClick={() => {setEditando(''); setNome(''); setErro('');}}><FolderPlus /></Button>{divisoes.length > 0 && <Button type="button" variant="ghost" size="icon" className="text-muted-foreground" disabled={salvando} aria-label="Gerenciar divisões" title="Gerenciar divisões" aria-expanded={gerenciando} aria-controls="gerenciar-divisoes" onClick={() => setGerenciando(atual => !atual)}><Settings2 /></Button>}</div>
    {editando !== null && <form onSubmit={salvar} className="mt-3 flex gap-2">
      <input autoFocus required maxLength={60} aria-label="Nome da divisão" placeholder="Nome da divisão" value={nome} onChange={e => setNome(e.target.value)} className="min-w-0 flex-1 rounded-md border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
      <Button disabled={salvando} type="submit" size="icon" aria-label="Salvar divisão" title="Salvar divisão"><Check /></Button><Button type="button" variant="ghost" size="icon" aria-label="Cancelar" title="Cancelar" onClick={() => setEditando(null)}><X /></Button>
    </form>}
    {gerenciando && divisoes.length > 0 && <ul id="gerenciar-divisoes" className="mt-2 divide-y">{divisoes.map(d => <li key={d.id} className="flex items-center gap-2 py-1"><span className="min-w-0 flex-1 break-words text-sm">{d.nome}</span><Button type="button" size="icon" variant="ghost" disabled={salvando} title="Renomear divisão" aria-label={`Renomear divisão ${d.nome}`} onClick={() => {setEditando(d.id); setNome(d.nome); setErro('');}}><Pencil /></Button><Button type="button" size="icon" variant="ghost" disabled={salvando} title="Excluir divisão" aria-label={`Excluir divisão ${d.nome}`} onClick={() => excluir(d)}><Trash2 /></Button></li>)}</ul>}
    {erro && <p role="alert" className="mt-2 text-sm text-debit">{erro}</p>}
  </section>;
}