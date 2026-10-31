import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { PainelCustomizer } from '@/components/painel-customizer';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CategoriasChart, CarteirasChart, FluxoChart } from '@/components/painel-analitico';
import { useGrupo, useTabelaAoVivo } from '@/lib/grupo';
import { useCarteiras } from '@/hooks/use-carteiras';
import { useAccess } from '@/lib/access-context';
import { moeda, resumoCarteiras, movimentosAnaliticos, termometro, progressoMeta, saldoCarteira, valorEmReais } from '@/lib/carteiras';
import { fluxoMensal, type LancamentoPainel } from '@/lib/painel';
import { normalizarPreferenciasPainel, PREFERENCIAS_PADRAO_PAINEL, FONTES_WIDGET, type AlturaCartaoPainel, type PreferenciasPainel, type SecaoPainel, type WidgetPainel } from '@/lib/painel-preferencias';
import type { DespesaMoto } from '@/lib/moto';
import { ArrowDownLeft, ArrowUpRight, BarChart3, CalendarClock, Landmark, Layers, PiggyBank, Settings2, Target, TrendingUp, Wallet } from 'lucide-react';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'MarIA — Painel estratégico' },
    { name: 'description', content: 'Crie dashboards com saldos, finanças, metas e gráficos do aplicativo.' },
    { property: 'og:title', content: 'MarIA — Painel estratégico' },
    { property: 'og:description', content: 'Monte seus dashboards com os dados do aplicativo.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Painel,
});

function chavePreferenciasLocais(userId: string) {
  return `pocket-friends:painel:${userId}`;
}

function lerPreferenciasLocais(userId: string): PreferenciasPainel | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(chavePreferenciasLocais(userId));
    return raw ? normalizarPreferenciasPainel(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

const classesGrade: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};
const classesLargura: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-1 sm:col-span-2 lg:col-span-2',
  3: 'col-span-1 sm:col-span-2 lg:col-span-3',
  4: 'col-span-1 sm:col-span-2 lg:col-span-4',
};
const classesAltura: Record<AlturaCartaoPainel, string> = {
  compacta: 'min-h-32',
  media: 'min-h-40',
  alta: 'min-h-52',
};
const escalaConteudo = {
  1: { padding: 'p-3', title: 'text-sm', value: 'text-xl sm:text-2xl', detail: 'mt-1 text-[11px] sm:text-xs', icon: 'h-4 w-4' },
  2: { padding: 'p-4 sm:p-5', title: 'text-sm sm:text-base', value: 'text-2xl sm:text-3xl', detail: 'mt-2 text-xs', icon: 'h-5 w-5' },
  3: { padding: 'p-5 sm:p-6', title: 'text-base sm:text-lg', value: 'text-3xl sm:text-4xl', detail: 'mt-3 text-sm', icon: 'h-5 w-5 sm:h-6 sm:w-6' },
  4: { padding: 'p-6 sm:p-7', title: 'text-base sm:text-xl', value: 'text-3xl sm:text-5xl', detail: 'mt-4 text-sm sm:text-base', icon: 'h-6 w-6' },
} as const;

function Painel() {
  const { grupo, session } = useGrupo();
  const access = useAccess();
  const queryClient = useQueryClient();
  const preferencesKey = ['painel-preferencias', session.user.id] as const;
  const { data: preferenciasSalvas = PREFERENCIAS_PADRAO_PAINEL } = useQuery({
    queryKey: preferencesKey,
    initialData: lerPreferenciasLocais(session.user.id) ?? PREFERENCIAS_PADRAO_PAINEL,
    queryFn: async () => {
      const { data, error } = await supabase.from('user_appearance').select('dashboard_preferences').eq('user_id', session.user.id).maybeSingle();
      if (error) {
        const local = lerPreferenciasLocais(session.user.id);
        if (local) return local;
        throw error;
      }
      const remoto = (data as unknown as { dashboard_preferences?: unknown } | null)?.dashboard_preferences;
      const existePreferenciaRemota = remoto && typeof remoto === 'object' && Object.keys(remoto).length > 0;
      return normalizarPreferenciasPainel(existePreferenciaRemota ? remoto : lerPreferenciasLocais(session.user.id) ?? remoto);
    },
  });
  const [rascunho, setRascunho] = useState<PreferenciasPainel | null>(null);
  const [customizadorAberto, setCustomizadorAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState('');
  const [statusSalvar, setStatusSalvar] = useState('');
  const [month, setMonth] = useState(new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date()).slice(0, 7));
  const preferencias = rascunho ?? preferenciasSalvas;
  const dashboard = preferencias.dashboards.find(item => item.id === preferencias.dashboardAtualId) ?? preferencias.dashboards[0];

  const { carteiras, metas, cotacoes, erroCotacao } = useCarteiras();
  const { linhas } = useTabelaAoVivo<LancamentoPainel>('lancamentos', grupo.id);
  const { linhas: moto } = useTabelaAoVivo<DespesaMoto>('moto_despesas', grupo.id);
  const totais = resumoCarteiras(carteiras, linhas, moto, cotacoes);
  const movimentos = movimentosAnaliticos(carteiras, linhas, moto, cotacoes);
  const mes = termometro(movimentos, month);
  const goal = metas.find(meta => meta.ativa && carteiras.some(wallet => wallet.id === meta.carteira_id && wallet.no_painel));
  const goalWallet = carteiras.find(wallet => wallet.id === goal?.carteira_id);
  const goalRate = goalWallet?.moeda === 'BRL' ? 1 : Number(cotacoes.find(rate => rate.moeda === goalWallet?.moeda)?.valor_brl ?? 0);
  const goalProgress = goal && goalWallet ? progressoMeta(goal, saldoCarteira(goalWallet, linhas, moto), goalRate ? termometro(movimentos, new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date()).slice(0, 7)).livre / goalRate : 0) : null;
  const gruposCategoria = new Map<string, number>();
  movimentos.filter(item => item.data.startsWith(month) && !item.entrada && !item.pendente).forEach(item => gruposCategoria.set(item.categoria, (gruposCategoria.get(item.categoria) ?? 0) + item.valor));
  const categorias = [...gruposCategoria].map(([nome, valor]) => ({ nome, valor }));
  const cores = ['var(--primary)', 'var(--credit)', 'var(--debit)', 'var(--saved)', 'var(--muted-foreground)'];
  const saldosCarteiras = carteiras.filter(wallet => wallet.no_painel).flatMap((wallet, index) => {
    const value = valorEmReais(wallet, saldoCarteira(wallet, linhas, moto), cotacoes);
    return value === null ? [] : [{ nome: wallet.nome, valor: value, cor: cores[index % cores.length] }];
  });
  const dadosFluxo = fluxoMensal(movimentos);
  const hojeMes = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date()).slice(0, 7);
  const livreAtual = termometro(movimentos, hojeMes).livre;

  async function salvarPreferencias(next?: PreferenciasPainel) {
    const candidato = next ?? rascunho;
    if (!candidato || salvando) return;
    setSalvando(true);
    setErroSalvar('');
    setStatusSalvar('');
    const normalizadas = normalizarPreferenciasPainel(candidato);
    try {
      window.localStorage.setItem(chavePreferenciasLocais(session.user.id), JSON.stringify(normalizadas));
    } catch {
      setErroSalvar('O navegador bloqueou o armazenamento local. Verifique as permissões de dados deste site.');
      setSalvando(false);
      return;
    }
    queryClient.setQueryData(preferencesKey, normalizadas);
    if (rascunho) setRascunho(normalizadas);
    try {
      const { error } = await supabase.from('user_appearance').upsert({ user_id: session.user.id, dashboard_preferences: normalizadas as unknown as Json });
      if (error) setStatusSalvar('Salvo neste aparelho. A sincronização com sua conta ainda não foi concluída.');
      else setStatusSalvar('Alterações salvas na sua conta.');
    } catch {
      setStatusSalvar('Salvo neste aparelho. A sincronização com sua conta ainda não foi concluída.');
    } finally {
      setSalvando(false);
    }
  }

  function renderWidget(widget: WidgetPainel, section: SecaoPainel): ReactNode {
    const source = FONTES_WIDGET.find(item => item.id === widget.fonte)!;
    const width = Math.max(1, Math.min(section.colunas, widget.largura)) as 1 | 2 | 3 | 4;
    const heightLevel = widget.altura === 'alta' ? 3 : widget.altura === 'media' ? 2 : 1;
    const scale = Math.min(4, Math.max(width, heightLevel)) as 1 | 2 | 3 | 4;
    const style = escalaConteudo[scale];
    const titleStyle = { fontSize: 'clamp(0.875rem, 4cqi, 1.25rem)' };
    const valueStyle = { fontSize: 'clamp(1.25rem, 9cqi, 3rem)' };
    const detailStyle = { fontSize: 'clamp(0.6875rem, 3cqi, 0.875rem)' };
    const iconStyle = { width: 'clamp(1rem, 4cqi, 1.5rem)', height: 'clamp(1rem, 4cqi, 1.5rem)' };
    const cardStyle = { containerType: 'inline-size' as const, ...(widget.cor ? { backgroundColor: `color-mix(in srgb, ${widget.cor} 11%, transparent)`, borderTopWidth: '3px', borderTopColor: widget.cor } : {}) };
    const span = classesLargura[width];
    const title = widget.titulo.trim() || source.nome;
    const article = `flex min-w-0 flex-col rounded-xl border bg-card p-3 sm:p-4 ${span} ${classesAltura[widget.altura]} ${widget.altura === 'alta' ? 'justify-between' : ''}`;

    if (['patrimonio', 'financeiro', 'beneficios', 'poupanca', 'entradas_mes', 'saidas_pagas_mes', 'contas_pendentes_mes', 'previsao_sobra', 'sobra_financeira'].includes(widget.fonte)) {
      const metrics: Record<string, { value: number; Icon: typeof Layers; detail: string; color?: string }> = {
        patrimonio: { value: totais.patrimonio, Icon: Layers, detail: 'Todas as carteiras visíveis' },
        financeiro: { value: totais.financeiro, Icon: Wallet, detail: 'Carteiras financeiras' },
        beneficios: { value: totais.beneficios, Icon: PiggyBank, detail: 'Carteiras de benefícios' },
        poupanca: { value: totais.poupanca, Icon: Landmark, detail: 'Carteiras de poupança' },
        entradas_mes: { value: mes.entradas, Icon: ArrowDownLeft, detail: `Entradas · ${month}`, color: 'text-credit' },
        saidas_pagas_mes: { value: mes.saidas, Icon: ArrowUpRight, detail: `Saídas pagas · ${month}`, color: 'text-debit' },
        contas_pendentes_mes: { value: mes.pendentes, Icon: CalendarClock, detail: `Contas pendentes · ${month}`, color: 'text-debit' },
        previsao_sobra: { value: mes.sobra, Icon: TrendingUp, detail: `Entradas − saídas − pendências · ${month}`, color: mes.sobra >= 0 ? 'text-primary' : 'text-debit' },
        sobra_financeira: { value: mes.livre, Icon: Wallet, detail: `Variação financeira · ${month}`, color: mes.livre >= 0 ? 'text-primary' : 'text-debit' },
      };
      const metric = metrics[widget.fonte];
      return <article key={widget.id} className={article} style={cardStyle}>
        <div className="flex items-start justify-between gap-2"><h2 className={`min-w-0 break-words font-medium ${style.title}`} style={titleStyle}>{title}</h2><metric.Icon className={`shrink-0 ${style.icon} ${metric.color ?? ''}`} style={iconStyle} /></div>
        <p className={`mt-auto break-words pt-4 font-display font-bold leading-tight ${style.value} ${metric.color ?? ''}`} style={valueStyle}>{moeda(metric.value)}</p>
        <p className={`opacity-75 ${style.detail}`} style={detailStyle}>{metric.detail}</p>
      </article>;
    }

    if (widget.fonte === 'meta_ativa') return <article key={widget.id} className={`${article} justify-start`} style={{ containerType: 'inline-size' }}>
      <div className="flex items-start justify-between gap-2"><h2 className={`font-medium ${style.title}`} style={titleStyle}>{title}</h2><Target className={`shrink-0 ${style.icon} text-primary`} style={iconStyle} /></div>
      {goal && goalWallet && goalProgress ? <>
        <p className={`mt-5 break-words font-display font-semibold ${style.title}`} style={titleStyle}>{goal.nome}</p>
        <p className={`mt-1 break-words text-muted-foreground ${style.detail}`} style={detailStyle}>{goalWallet.nome} · Alvo de {moeda(Number(goal.valor_alvo), goalWallet.moeda)}</p>
        <progress aria-label="Progresso da meta ativa" value={goalProgress.percentual} max={100} className="mt-4 h-3 w-full accent-primary" />
        <div className={`mt-2 flex flex-wrap justify-between gap-2 ${style.detail}`} style={detailStyle}><span>{moeda(goalProgress.guardado, goalWallet.moeda)} guardado</span><strong className="text-primary">{goalProgress.percentual.toFixed(0)}%</strong></div>
        <p className={`mt-auto pt-3 text-credit ${style.detail}`} style={detailStyle}>Aporte sugerido: {moeda(goalProgress.aporte, goalWallet.moeda)}</p>
      </> : <p className="mt-5 text-sm text-muted-foreground">{access.financas ? 'Nenhuma meta ativa nas carteiras visíveis.' : 'Sem acesso ao módulo Finanças.'}</p>}
      {access.financas && <Button asChild variant="link" size="sm" className="mt-2 w-fit px-0"><Link to="/metas">Ver metas →</Link></Button>}
    </article>;

    if (widget.fonte === 'gastos_categoria') return <article key={widget.id} className={`${article} ${widget.altura === 'alta' ? '' : 'justify-start'}`} style={{ containerType: 'inline-size' }}>
      <h2 className={`mb-3 font-medium ${style.title}`} style={titleStyle}>{title}</h2>
      {access.financas ? <CategoriasChart dados={categorias} tipo={widget.grafico === 'pizza' || widget.grafico === 'barras' ? widget.grafico : 'rosca'} /> : <p className="py-8 text-sm text-muted-foreground">Sem acesso ao módulo Finanças.</p>}
    </article>;

    if (widget.fonte === 'fluxo_mensal') return <article key={widget.id} className={`${article} ${widget.altura === 'alta' ? '' : 'justify-start'}`} style={{ containerType: 'inline-size' }}>
      <h2 className={`mb-3 font-medium ${style.title}`} style={titleStyle}>{title}</h2>
      {access.financas ? <FluxoChart dados={dadosFluxo} tipo={widget.grafico === 'linhas' || widget.grafico === 'area' ? widget.grafico : 'barras'} /> : <p className="py-8 text-sm text-muted-foreground">Sem acesso ao módulo Finanças.</p>}
      <div className="mt-2 flex justify-center gap-5 text-xs"><span className="text-credit">Entradas</span><span className="text-debit">Saídas pagas</span></div>
    </article>;

    return <article key={widget.id} className={`${article} ${widget.altura === 'alta' ? '' : 'justify-start'}`} style={{ containerType: 'inline-size' }}>
      <h2 className={`mb-3 font-medium ${style.title}`} style={titleStyle}>{title}</h2>
      {access.financas ? <CarteirasChart dados={saldosCarteiras} /> : <p className="py-8 text-sm text-muted-foreground">Sem acesso ao módulo Finanças.</p>}
    </article>;
  }

  const activeDashboard = dashboard ?? PREFERENCIAS_PADRAO_PAINEL.dashboards[0];

  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-xs uppercase text-muted-foreground">MarIA · {grupo.nome}</p><h1 className="font-display text-4xl sm:text-5xl">Meu Painel</h1></div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="painel-dashboard-select">Dashboard aberto</label>
        <select id="painel-dashboard-select" value={activeDashboard.id} onChange={event => void salvarPreferencias({ ...preferencias, dashboardAtualId: event.target.value })} className="max-w-52 rounded-md border bg-background px-3 py-2 text-sm">
          {preferencias.dashboards.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground"><span>Mês</span><input aria-label="Mês para os indicadores" type="month" value={month} onChange={event => setMonth(event.target.value)} className="min-w-0 rounded-md border bg-background px-2 py-2 text-sm text-foreground" /></label>
        <Button type="button" variant="ghost" size="icon" aria-label={customizadorAberto ? 'Fechar personalização do painel' : 'Personalizar dashboards'} title={customizadorAberto ? 'Fechar personalização' : 'Personalizar dashboards'} aria-pressed={customizadorAberto} onClick={() => {
          if (!customizadorAberto) setRascunho(preferenciasSalvas);
          setCustomizadorAberto(value => !value);
        }}><Settings2 className="h-4 w-4" /><span className="sr-only">Personalizar dashboards</span></Button>
        {access.financas && <Button asChild variant="outline"><Link to="/financas"><Wallet />Finanças</Link></Button>}
      </div>
    </header>

    <Dialog open={customizadorAberto} onOpenChange={open => {
      setCustomizadorAberto(open);
      if (!open) { setRascunho(null); setErroSalvar(''); setStatusSalvar(''); }
    }}>
      {customizadorAberto && rascunho && <DialogContent className="block max-h-[92dvh] w-[calc(100vw-1rem)] max-w-6xl overflow-y-auto p-3 sm:p-6">
        <DialogHeader className="sr-only"><DialogTitle>Personalizar painel</DialogTitle><DialogDescription>Configure dashboards, seções, caixas e cores.</DialogDescription></DialogHeader>
        <PainelCustomizer value={preferencias} onChange={next => { setRascunho(next); setStatusSalvar(''); }} saving={salvando} error={erroSalvar} status={statusSalvar}
          onSave={() => void salvarPreferencias()} onCancel={() => { setCustomizadorAberto(false); setRascunho(null); setErroSalvar(''); setStatusSalvar(''); }} />
      </DialogContent>}
    </Dialog>

    {(totais.semCotacao || erroCotacao) && carteiras.some(wallet => wallet.moeda !== 'BRL' && wallet.no_painel) &&
      <p role="status" className="mb-5 text-sm text-muted-foreground">{totais.semCotacao ? 'Carteiras sem cotação não estão incluídas no consolidado.' : erroCotacao}</p>}

    {!activeDashboard.secoes.length && <div className="rounded-xl border border-dashed p-10 text-center"><p className="font-medium">Este dashboard ainda não tem seções.</p><p className="mt-1 text-sm text-muted-foreground">Abra a personalização para criar uma seção e adicionar caixas.</p></div>}
    <div className="space-y-8">
      {activeDashboard.secoes.map(section => <section key={section.id} aria-label={section.nome} className="rounded-xl border bg-card/40 p-4 sm:p-5">
        <h2 className="mb-4 font-display text-2xl">{section.nome}</h2>
        {!section.widgets.length ? <p className="rounded-md bg-muted/40 p-4 text-sm text-muted-foreground">Sem caixas nesta seção. Use Personalizar para adicionar uma.</p> :
          <div className={`grid min-w-0 items-stretch gap-4 ${classesGrade[section.colunas] ?? classesGrade[2]}`}>
            {section.widgets.map(widget => renderWidget(widget, section))}
          </div>}
      </section>)}
    </div>
  </main>;
}
