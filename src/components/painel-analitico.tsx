import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownLeft, ArrowUpRight, CalendarClock, Layers } from "lucide-react";
import { brl } from "@/lib/painel";
import { descendingValues } from "@/lib/finance-history-edit";

type Kpis = { consolidado: number; entradasMes: number; saidasPagasMes: number; aVencer7: number; qtdAVencer7: number };
type Fluxo = { mes: string; entradas: number; saidas: number }[];
type Carteira = { nome: string; valor: number; cor: string }[];

const mesCurto = (m: string) => new Date(m + "-01T00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
const compacto = (n: number) => n.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const dica = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)", fontSize: 12 }, cursor: { fill: "var(--muted)" } };

export function KpiCards({ k }: { k: Kpis }) {
  const cards = [
    { nome: "Saldo consolidado", valor: k.consolidado, Icon: Layers, destaque: true, extra: "Todas as carteiras" },
    { nome: "Entradas do mês", valor: k.entradasMes, Icon: ArrowDownLeft, cor: "text-credit" },
    { nome: "Saídas pagas", valor: k.saidasPagasMes, Icon: ArrowUpRight, cor: "text-debit", extra: "No mês" },
    { nome: "A vencer · 7 dias", valor: k.aVencer7, Icon: CalendarClock, cor: "text-debit", extra: `${k.qtdAVencer7} ${k.qtdAVencer7 === 1 ? "conta" : "contas"}` },
  ];
  return <section aria-label="Indicadores" className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
    {cards.map(({ nome, valor, Icon, destaque, cor, extra }) => (
      <div key={nome} className={`min-w-0 rounded-xl border p-3 sm:p-4 ${destaque ? "border-primary/60 bg-primary text-primary-foreground shadow-[0_0_28px_-8px_var(--primary)]" : "bg-card"}`}>
        <div className="mb-2 flex items-center justify-between"><p className={`text-xs ${destaque ? "opacity-80" : "text-muted-foreground"}`}>{nome}</p><Icon className={`h-4 w-4 ${destaque ? "opacity-80" : cor}`} /></div>
        <p className={`break-words font-display text-lg font-bold sm:text-2xl ${destaque ? "" : cor}`}>{brl(valor)}</p>
        {extra && <p className={`mt-1 text-[11px] ${destaque ? "opacity-70" : "text-muted-foreground"}`}>{extra}</p>}
      </div>
    ))}
  </section>;
}

export function FluxoChart({ dados, tipo = "barras" }: { dados: Fluxo; tipo?: "barras" | "linhas" | "area" }) {
  if (!dados.length) return <p className="py-10 text-center text-sm text-muted-foreground">Sem movimentações neste período.</p>;
  return <div className="h-56 w-full">
    <ResponsiveContainer>
      {tipo === "barras" ? <BarChart data={dados} maxBarSize={48} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="mes" tickFormatter={mesCurto} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={compacto} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip {...dica} labelFormatter={l => mesCurto(String(l))} formatter={(v: number, n) => [brl(v), n === "entradas" ? "Entradas" : "Saídas pagas"]} />
        <Bar dataKey="entradas" fill="var(--credit)" radius={[6, 6, 0, 0]} />
        <Bar dataKey="saidas" fill="var(--debit)" radius={[6, 6, 0, 0]} />
      </BarChart> : tipo === "linhas" ? <LineChart data={dados} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="mes" tickFormatter={mesCurto} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={compacto} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip {...dica} labelFormatter={l => mesCurto(String(l))} formatter={(v: number, n) => [brl(v), n === "entradas" ? "Entradas" : "Saídas pagas"]} />
        <Line dataKey="entradas" name="Entradas" stroke="var(--credit)" strokeWidth={3} dot={{ r: 3 }} />
        <Line dataKey="saidas" name="Saídas pagas" stroke="var(--debit)" strokeWidth={3} dot={{ r: 3 }} />
      </LineChart> : <AreaChart data={dados} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="mes" tickFormatter={mesCurto} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={compacto} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip {...dica} labelFormatter={l => mesCurto(String(l))} formatter={(v: number, n) => [brl(v), n === "entradas" ? "Entradas" : "Saídas pagas"]} />
        <Area dataKey="entradas" name="Entradas" stroke="var(--credit)" fill="var(--credit)" fillOpacity={0.18} strokeWidth={2} />
        <Area dataKey="saidas" name="Saídas pagas" stroke="var(--debit)" fill="var(--debit)" fillOpacity={0.18} strokeWidth={2} />
      </AreaChart>}
    </ResponsiveContainer>
  </div>;
}

export function CategoriasChart({ dados, tipo = "rosca" }: { dados: { nome: string; valor: number }[]; tipo?: "pizza" | "rosca" | "barras" }) {
  if (!dados.length) return <p className="py-10 text-left text-sm text-muted-foreground">Nenhuma saída paga neste mês.</p>;
  const ordenados = descendingValues(dados);
  const cores = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
  const total = ordenados.reduce((sum, item) => sum + item.valor, 0);
  return <div className="min-w-0 w-full space-y-4 text-left">
    {tipo !== "barras" && <div className="aspect-square max-h-64 w-full max-w-64 self-start"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={ordenados} dataKey="valor" nameKey="nome" innerRadius={tipo === "rosca" ? "48%" : 0} outerRadius="80%" paddingAngle={3}>{ordenados.map((c, i) => <Cell key={c.nome} fill={cores[i % cores.length]} />)}</Pie><Tooltip contentStyle={dica.contentStyle} formatter={(v: number) => [brl(v)]} /></PieChart></ResponsiveContainer></div>}
    <div role="list" aria-label="Legenda de gastos por categoria" className="min-w-0 space-y-3 text-xs text-muted-foreground">
      {ordenados.map((c, i) => <div key={c.nome} role="listitem" className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
          <span aria-hidden="true" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cores[i % cores.length] }} />
          <span className="min-w-0 flex-1 break-words text-foreground">{c.nome}</span>
          <span className="ml-auto break-words font-semibold tabular-nums text-foreground">{brl(c.valor)}</span>
        </div>
        {tipo === "barras" && <div className="h-2 w-full overflow-hidden rounded-sm bg-muted"><div className="h-full rounded-sm" style={{ width: `${c.valor / (ordenados[0]?.valor || 1) * 100}%`, backgroundColor: cores[i % cores.length] }} /></div>}
        <p className="pl-4">{total ? (c.valor / total * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : 0}%</p>
      </div>)}
    </div>
  </div>;
}

export function CarteirasChart({ dados }: { dados: Carteira }) {
  if (!dados.length) return null;
  return <div className="h-52 min-w-0 w-full">
    <ResponsiveContainer>
      <BarChart data={descendingValues(dados)} layout="vertical" maxBarSize={28} margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" tickFormatter={compacto} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="nome" width={90} tick={{ fill: "var(--foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip {...dica} formatter={(v: number) => [brl(v), "Saldo"]} />
        <Bar dataKey="valor" radius={[0, 6, 6, 0]}>{dados.map(d => <Cell key={d.nome} fill={d.cor} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>;
}
