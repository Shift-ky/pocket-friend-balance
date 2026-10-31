import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Palette, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGrupo } from '@/lib/grupo';
import { TEMAS, CORES_CORINGA, coresValidas, visibilidadeValida, textoDoBotao, temaValido, validarImagemFundo, gerarPaletaCoringa, type Tema, type CoresCoringa } from '@/lib/aparencia';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cachedValue } from '@/lib/offline-store';

type Aparencia = { theme: Tema; background_path: string | null; imagem: string | null; background_visibility: number; custom_enabled: boolean; custom_colors: CoresCoringa };

function useAparencia() {
  const { session } = useGrupo();
  return useQuery({
    queryKey: ['aparencia', session.user.id],
    networkMode: 'always',
    queryFn: () => cachedValue(session.user.id, 'aparencia', async (): Promise<Aparencia> => {
      const { data, error } = await supabase.from('user_appearance').select('theme, background_path, background_visibility, custom_enabled, custom_colors').eq('user_id', session.user.id).maybeSingle();
      if (error) throw error;
      let imagem: string | null = null;
      if (data?.background_path) {
        const resultado = await supabase.storage.from('personal-backgrounds').createSignedUrl(data.background_path, 3600);
        if (resultado.error) throw resultado.error;
        imagem = resultado.data.signedUrl;
      }
      return { theme: temaValido(data?.theme), background_path: data?.background_path ?? null, imagem, background_visibility: visibilidadeValida(data?.background_visibility), custom_enabled: data?.custom_enabled ?? false, custom_colors: coresValidas(data?.custom_colors) };
    }),
    staleTime: 50 * 60 * 1000,
    refetchInterval: 50 * 60 * 1000,
  });
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { data } = useAparencia();
  const tema = data?.theme ?? 'original';
  useEffect(() => {
    document.documentElement.dataset['theme'] = tema;
    document.documentElement.classList.toggle('dark', tema === 'dark');
    return () => { delete document.documentElement.dataset['theme']; document.documentElement.classList.remove('dark'); };
  }, [tema]);
  useEffect(() => {
    const root = document.documentElement;
    const extras = ['input', 'ring', 'primary-foreground', 'credit-soft', 'debit-soft', 'saved-soft'];
    if (data?.custom_enabled) {
      const defaults = getComputedStyle(root);
      for (const { id } of CORES_CORINGA) root.style.setProperty(`--${id}`, data.custom_colors[id] ?? defaults.getPropertyValue(`--coringa-${id}`).trim());
      root.style.setProperty('--input', 'var(--border)');
      root.style.setProperty('--ring', 'var(--primary)');
      root.style.setProperty('--primary-foreground', textoDoBotao(data.custom_colors.primary ?? defaults.getPropertyValue('--coringa-primary').trim()));
      for (const id of ['credit', 'debit', 'saved']) root.style.setProperty(`--${id}-soft`, `color-mix(in srgb, var(--${id}) 12%, var(--card))`);
    }
    return () => { for (const id of [...CORES_CORINGA.map(c => c.id), ...extras]) root.style.removeProperty(`--${id}`); };
  }, [data?.custom_enabled, data?.custom_colors]);
  return <>
    {data?.imagem && <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url("${data.imagem}")`, opacity: data.background_visibility / 100 }} />}
    <div className="relative z-10">{children}</div>
  </>;
}

export function AppearanceMenu() {
  const { session } = useGrupo();
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useAparencia();
  const input = useRef<HTMLInputElement>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');
  const atual = data ?? { theme: 'original' as Tema, background_path: null, imagem: null, background_visibility: 10, custom_enabled: false, custom_colors: {} };
  const [cores, setCores] = useState<CoresCoringa>({});
  const [corBase, setCorBase] = useState('#22e1ff');
  const [coringaAberto, setCoringaAberto] = useState(false);
  const [visibilidade, setVisibilidade] = useState(10);
  useEffect(() => {
    const defaults = getComputedStyle(document.documentElement);
    const iniciais: CoresCoringa = {};
    for (const { id } of CORES_CORINGA) iniciais[id] = defaults.getPropertyValue(`--coringa-${id}`).trim();
    setCores({ ...iniciais, ...data?.custom_colors });
    setCorBase(data?.custom_colors?.primary ?? '#22e1ff');
    setVisibilidade(data?.background_visibility ?? 10);
  }, [data]);

  async function salvar(theme: Tema, background_path: string | null, ajustes: Partial<Pick<Aparencia, 'background_visibility' | 'custom_enabled' | 'custom_colors'>> = {}) {
    const { error } = await supabase.from('user_appearance').upsert({ user_id: session.user.id, theme, background_path, background_visibility: atual.background_visibility, custom_enabled: atual.custom_enabled, custom_colors: atual.custom_colors, ...ajustes });
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ['aparencia', session.user.id] });
  }
  async function executar(acao: () => Promise<void>, sucesso: string) {
    setSalvando(true); setMsg('');
    try { await acao(); setMsg(sucesso); } catch { setMsg('Não foi possível salvar sua aparência.'); }
    finally { setSalvando(false); }
  }
  async function enviar(arquivo?: File) {
    if (!arquivo) return;
    const validacao = validarImagemFundo(arquivo);
    if ('erro' in validacao) { setMsg(validacao.erro); return; }
    await executar(async () => {
      const caminho = `${session.user.id}/${Date.now()}.${validacao.extensao}`;
      const { error } = await supabase.storage.from('personal-backgrounds').upload(caminho, arquivo, { contentType: arquivo.type });
      if (error) throw error;
      try { await salvar(atual.theme, caminho); }
      catch (error) { await supabase.storage.from('personal-backgrounds').remove([caminho]); throw error; }
      if (atual.background_path) await supabase.storage.from('personal-backgrounds').remove([atual.background_path]);
    }, 'Imagem aplicada com proteção para manter os números legíveis.');
    if (input.current) input.current.value = '';
  }
  async function removerImagem() {
    await executar(async () => {
      await salvar(atual.theme, null);
      if (atual.background_path) await supabase.storage.from('personal-backgrounds').remove([atual.background_path]);
    }, 'Imagem removida.');
  }

  return <Dialog>
    <DialogTrigger asChild><Button variant="link" size="sm" className="shrink-0 px-0 text-xs text-muted-foreground"><Palette />Aparência</Button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] overflow-y-auto bg-card">
      <DialogHeader><DialogTitle className="font-display text-2xl">Sua aparência</DialogTitle><DialogDescription>Essa escolha vale somente para sua conta.</DialogDescription></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        {TEMAS.map(t => <Button key={t.id} type="button" variant="outline" disabled={salvando || isPending || isError} aria-pressed={!atual.custom_enabled && atual.theme === t.id} onClick={() => executar(() => salvar(t.id, atual.background_path, { custom_enabled: false }), 'Tema salvo.')} className={`h-auto flex-col items-stretch p-3 text-left ${!atual.custom_enabled && atual.theme === t.id ? 'ring-2 ring-ring' : ''}`}>
          <span data-theme={t.id} className="flex gap-1"><span className="h-6 flex-1 rounded border bg-background" /><span className="h-6 flex-1 rounded border bg-primary" /></span>{t.nome}
        </Button>)}
      </div>
      <Button type="button" variant="outline" disabled={salvando || isPending || isError} aria-pressed={atual.custom_enabled} aria-expanded={coringaAberto} aria-controls="coringa-palette" onClick={() => {
        if (!coringaAberto) setCores(gerarPaletaCoringa(corBase));
        setCoringaAberto(value => !value);
      }}><Palette />Coringa</Button>
      {coringaAberto && <section id="coringa-palette" className="space-y-3 rounded-lg border bg-muted/30 p-3" aria-label="Gerar paleta Coringa">
        <div><h3 className="font-semibold">Crie uma paleta com a sua cor</h3><p className="text-xs text-muted-foreground">Escolha uma cor-base; o app harmoniza fundos, textos, botões, entradas, saídas e reservas.</p></div>
        <label className="flex items-center justify-between gap-3 text-sm">Cor-base<input type="color" aria-label="Cor-base para sua paleta" value={corBase} disabled={salvando} onChange={event => {
          const cor = event.target.value;
          setCorBase(cor);
          setCores(gerarPaletaCoringa(cor));
        }} className="h-10 w-14 cursor-pointer rounded border bg-card p-1" /></label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[{ nome: 'Fundo', cor: cores.background }, { nome: 'Quadros', cor: cores.card }, { nome: 'Sua cor', cor: cores.primary }, { nome: 'Entradas', cor: cores.credit }, { nome: 'Saídas', cor: cores.debit }, { nome: 'Reservas', cor: cores.saved }].map(item => <div key={item.nome} className="min-w-0 text-center"><span className="block h-8 rounded border" style={{ backgroundColor: item.cor }} /><span className="text-[10px] text-muted-foreground">{item.nome}</span></div>)}
        </div>
        <Button type="button" disabled={salvando || isPending || isError} onClick={() => executar(() => salvar(atual.theme, atual.background_path, { custom_enabled: true, custom_colors: coresValidas(cores) }), 'Paleta harmonizada aplicada.')}><Palette />Gerar e aplicar paleta</Button>
      </section>}
      {atual.custom_enabled && <section className="space-y-3 border-t pt-4" aria-label="Personalizar cores da paleta"><div><h3 className="font-semibold">Ajustar cores individualmente</h3><p className="text-xs text-muted-foreground">Faça ajustes finos depois de aplicar sua paleta.</p></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{CORES_CORINGA.map(c => <label key={c.id} className="flex min-w-0 items-center justify-between gap-2 text-sm"><span>{c.nome}</span><input type="color" aria-label={c.nome} value={cores[c.id] ?? '#22e1ff'} disabled={salvando} onChange={event => {
        const cor = event.target.value;
        setCores(atual => ({ ...atual, [c.id]: cor }));
        if (c.id === 'primary') setCorBase(cor);
      }} className="h-9 w-12 shrink-0 cursor-pointer rounded border bg-card p-1" /></label>)}</div><Button type="button" disabled={salvando} onClick={() => executar(() => salvar(atual.theme, atual.background_path, { custom_enabled: true, custom_colors: coresValidas(cores) }), 'Cores salvas.')}><Palette />Salvar cores</Button></section>}
      <section className="space-y-3 border-t pt-4">
        <div><h3 className="font-semibold">Imagem de fundo</h3><p className="text-xs text-muted-foreground">Fica suave atrás das informações e os quadros continuam com fundo sólido.</p></div>
        {atual.imagem && <img src={atual.imagem} alt="Sua imagem de fundo atual" className="h-28 w-full rounded-lg object-cover" />}
        <div className="space-y-3"><label id="visibilidade-foto" className="flex justify-between gap-2 text-sm"><span>Visibilidade da foto</span><span>{visibilidade}%</span></label><Slider aria-labelledby="visibilidade-foto" min={0} max={100} step={1} value={[visibilidade]} disabled={salvando || isPending || isError} onValueChange={valores => setVisibilidade(valores[0] ?? 10)} onValueCommit={valores => executar(() => salvar(atual.theme, atual.background_path, { background_visibility: visibilidadeValida(valores[0]) }), 'Visibilidade salva.')} /></div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => enviar(e.target.files?.[0])} />
        <div className="flex flex-wrap gap-2"><Button type="button" disabled={salvando || isPending || isError} onClick={() => input.current?.click()}><ImagePlus />{atual.imagem ? 'Trocar imagem' : 'Escolher imagem'}</Button>{atual.imagem && <Button type="button" variant="outline" disabled={salvando} onClick={removerImagem}><Trash2 />Remover</Button>}</div>
      </section>
      {msg && <p role="status" className="text-sm text-muted-foreground">{msg}</p>}
      {isError && <p role="alert" className="text-sm text-debit">Não foi possível carregar sua aparência. Tente novamente mais tarde.</p>}
    </DialogContent>
  </Dialog>;
}