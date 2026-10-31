import { useState } from "react";
import { supabase } from "@/lib/offline-client";
import { Button } from "@/components/ui/button";
import { CATEGORIAS_SAIDA } from "@/lib/categorias-financas";
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

export function EditarLinha({ item, onFechar }: { item: Lancamento; onFechar: () => void }) {
  const [descricao, setDescricao] = useState(item.descricao);
  const [valor, setValor] = useState(String(item.valor).replace(".", ","));
  const [data, setData] = useState(item.data);
  const [conta, setConta] = useState<Conta>(item.conta ?? "dinheiro");
  const [categoria, setCategoria] = useState(item.categoria || "Outros");
  const comConta = !item.carteira_id && item.destino !== "gasolina" && (item.tipo === "credito" || item.tipo === "debito");
  async function salvar() {
    const v = parseFloat(valor.replace(",", "."));
    if (!descricao.trim() || !v || v <= 0) return alert("Preencha descrição e valor.");
    const { error } = await supabase.from("lancamentos").update({ descricao: descricao.trim(), valor: v, data, conta: comConta ? conta : "dinheiro", ...(item.tipo === "debito" ? { categoria } : {}) }).eq("id", item.id);
    if (error) return alert("Não foi possível salvar.");
    onFechar();
  }
  const campo = "min-w-0 w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring";
  return (
    <li className="space-y-3 rounded-lg border-2 border-primary bg-card p-4">
      <p className="text-sm font-semibold">Editar {INFO[item.tipo].label.toLowerCase()}</p>
      <input value={descricao} onChange={(e) => setDescricao(e.target.value)} className={`w-full ${campo}`} />
      {item.tipo === "debito" && <label className="block text-sm">Tipo de saída<select aria-label="Tipo de saída" value={categoria} onChange={e => setCategoria(e.target.value)} className={`mt-1 ${campo}`}>
        {!CATEGORIAS_SAIDA.includes(categoria as typeof CATEGORIAS_SAIDA[number]) && categoria && <option value={categoria}>{categoria} (atual)</option>}
        {CATEGORIAS_SAIDA.map(c => <option key={c} value={c}>{c}</option>)}
      </select></label>}
      <div className="grid grid-cols-2 gap-3">
        <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" className={campo} />
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
      </div>
      {comConta && (
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(CONTAS) as Conta[]).map((c) => (
            <Button key={c} variant="ghost" type="button" onClick={() => setConta(c)}
              className={`rounded-lg border py-2 text-sm font-semibold ${conta === c ? "bg-foreground text-background" : "text-muted-foreground"}`}>
              {CONTAS[c]}
            </Button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Button onClick={salvar} className="flex-1 rounded-lg bg-primary py-2 font-semibold text-primary-foreground">Salvar</Button>
        <Button variant="outline" onClick={onFechar} className="flex-1 rounded-lg border py-2 font-semibold">Cancelar</Button>
      </div>
    </li>
  );
}
