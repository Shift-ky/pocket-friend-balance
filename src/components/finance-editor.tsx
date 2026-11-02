import { useState } from "react";
import { supabase } from "@/lib/offline-client";
import { Button } from "@/components/ui/button";
import { CATEGORIAS_SAIDA, GRUPOS_CATEGORIAS_SAIDA } from "@/lib/categorias-financas";
import { historyEditPayload } from '@/lib/finance-history-edit';
import { supabase as onlineClient } from '@/integrations/supabase/client';
type Tipo = "credito" | "debito" | "aplicacao" | "resgate";
type Conta = "dinheiro" | "alimentacao" | "refeicao";
type Lancamento = { id: string; tipo: Tipo; descricao: string; valor: number; data: string; pago: boolean; conta: Conta; destino?: string; carteira_id?:string|null; categoria?:string };
const CONTAS: Record<Conta, string> = { dinheiro: "Dinheiro", alimentacao: "Alimentação", refeicao: "Refeição" };

const INFO: Record<Tipo, { label: string; sinal: string; ativo: string; icone: string; texto: string }> = {
  credito: { label: "Crédito", sinal: "+", ativo: "bg-credit text-primary-foreground", icone: "bg-credit-soft text-credit", texto: "text-credit" },
  debito: { label: "Débito", sinal: "−", ativo: "bg-debit text-primary-foreground", icone: "bg-debit-soft text-debit", texto: "text-debit" },
  aplicacao: { label: "Aplicação", sinal: "↑", ativo: "bg-saved text-primary-foreground", icone: "bg-saved-soft text-saved", texto: "text-saved" },
  resgate: { label: "Resgate", sinal: "↓", ativo: "bg-saved text-primary-foreground", icone: "bg-saved-soft text-saved", texto: "text-saved" },
};

export function EditarLinha({ item, onFechar, moto = false }: { item: Lancamento; onFechar: () => void; moto?: boolean }) {
  const [descricao, setDescricao] = useState(item.descricao);
  const [valor, setValor] = useState(String(item.valor).replace(".", ","));
  const [data, setData] = useState(item.data);
  const [conta, setConta] = useState<Conta>(item.conta ?? "dinheiro");
  const [categoria, setCategoria] = useState(item.categoria || (moto ? 'Moto/Gasolina' : 'Outros'));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const comConta = !moto && !item.carteira_id && item.destino !== "gasolina" && (item.tipo === "credito" || item.tipo === "debito");
  async function salvar() {
    const v = parseFloat(valor.replace(",", "."));
    if (!descricao.trim() || !Number.isFinite(v) || v <= 0 || !data) { setErro('Preencha descrição, valor e data.'); return; }
    setSalvando(true);
    setErro('');
    try {
      const payload = historyEditPayload(item, { descricao, valor: v, data, conta, categoria }, moto);
      const { data: review, error: reviewError } = moto ? { data: null, error: null } : await onlineClient.from('telegram_reviews').select('id').eq('lancamento_id', item.id).eq('status', 'aprovado').maybeSingle();
      if (reviewError && navigator.onLine) throw reviewError;
      if (review) {
        const { error } = await onlineClient.rpc('telegram_edit_approved_launch', { _id: review.id, _valor: v, _data: data, _descricao: descricao.trim(), _conta: comConta ? conta : item.conta, _categoria: categoria });
        if (error) throw error;
      } else {
        const { error, count } = await supabase.from(moto ? 'moto_despesas' : 'lancamentos').update(payload, { count: 'exact' }).eq('id', item.id);
        if (error || count === 0) throw error ?? new Error('Lançamento não encontrado');
      }
      onFechar();
    } catch {
      setErro('Não foi possível salvar esta movimentação. Confira sua conexão e tente novamente.');
    } finally { setSalvando(false); }
  }
  const campo = "min-w-0 w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring";
  return (
    <li className="space-y-3 rounded-lg border-2 border-primary bg-card p-4">
      <p className="text-sm font-semibold">Editar {moto ? 'despesa Moto' : INFO[item.tipo].label.toLowerCase()}</p>
      <label className="block text-sm">Descrição<input aria-label="Descrição da movimentação" value={descricao} onChange={(e) => setDescricao(e.target.value)} className={`mt-1 ${campo}`} /></label>
      {item.tipo === "debito" && <label className="block text-sm">Categoria da movimentação<select aria-label="Categoria da movimentação" value={categoria} onChange={e => setCategoria(e.target.value)} className={`mt-1 ${campo}`}>
        {!CATEGORIAS_SAIDA.includes(categoria as typeof CATEGORIAS_SAIDA[number]) && categoria && <option value={categoria}>{categoria} (atual)</option>}
        {GRUPOS_CATEGORIAS_SAIDA.map(grupo => <optgroup key={grupo.nome} label={grupo.nome}>{grupo.categorias.map(c => <option key={c} value={c}>{c}</option>)}</optgroup>)}
      </select></label>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="min-w-0 text-sm">Valor<input aria-label="Valor da movimentação" value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" className={`mt-1 ${campo}`} /></label>
        <label className="min-w-0 text-sm">Data<input aria-label="Data da movimentação" type="date" value={data} onChange={(e) => setData(e.target.value)} className={`mt-1 ${campo}`} /></label>
      </div>
      {comConta && (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CONTAS) as Conta[]).map((c) => (
            <Button key={c} variant="ghost" type="button" onClick={() => setConta(c)}
              className={`rounded-lg border py-2 text-sm font-semibold ${conta === c ? "bg-foreground text-background" : "text-muted-foreground"}`}>
              {CONTAS[c]}
            </Button>
          ))}
        </div>
      )}
      {erro && <p role="alert" className="text-sm text-debit">{erro}</p>}
      <div className="flex gap-2">
        <Button disabled={salvando} onClick={salvar} className="flex-1 rounded-lg bg-primary py-2 font-semibold text-primary-foreground">{salvando ? 'Salvando…' : 'Salvar'}</Button>
        <Button disabled={salvando} variant="outline" onClick={onFechar} className="flex-1 rounded-lg border py-2 font-semibold">Cancelar</Button>
      </div>
    </li>
  );
}
