import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function StockNameEditor({ nome, disabled, salvar }: { nome: string; disabled: boolean; salvar: (nome: string) => Promise<string | null> }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nome);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!valor.trim()) { setErro('Informe o nome do produto.'); return; }
    setSalvando(true);
    try {
      const mensagem = await salvar(valor.trim());
      if (mensagem) setErro(mensagem); else { setEditando(false); setErro(''); }
    } catch { setErro('Não foi possível salvar o nome. Tente novamente.'); }
    finally { setSalvando(false); }
  }
  if (!editando) return <div className="flex min-w-0 flex-1 items-center gap-1"><p className="min-w-0 flex-1 truncate font-semibold" title={nome}>{nome}</p><Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" disabled={disabled} aria-label={`Corrigir nome de ${nome}`} title="Corrigir nome" onClick={() => { setValor(nome); setErro(''); setEditando(true); }}><Pencil className="h-3.5 w-3.5" /></Button></div>;
  return <form onSubmit={enviar} className="min-w-0 flex-1">
    <div className="flex min-w-0 items-center gap-1"><input autoFocus aria-label={`Novo nome de ${nome}`} value={valor} onChange={e => setValor(e.target.value)} disabled={salvando} className="min-w-0 w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" /><Button type="submit" variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={salvando} aria-label="Salvar nome" title="Salvar nome"><Check className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={salvando} onClick={() => setEditando(false)} aria-label="Cancelar correção" title="Cancelar"><X className="h-4 w-4" /></Button></div>
    {erro && <p role="alert" className="mt-1 text-xs text-debit">{erro}</p>}
  </form>;
}