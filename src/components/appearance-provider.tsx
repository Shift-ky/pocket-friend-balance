import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Palette, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGrupo } from '@/lib/grupo';
import { TEMAS, temaValido, validarImagemFundo, type Tema } from '@/lib/aparencia';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type Aparencia = { theme: Tema; background_path: string | null; imagem: string | null };

function useAparencia() {
  const { session } = useGrupo();
  return useQuery({
    queryKey: ['aparencia', session.user.id],
    queryFn: async (): Promise<Aparencia> => {
      const { data, error } = await supabase.from('user_appearance').select('theme, background_path').eq('user_id', session.user.id).maybeSingle();
      if (error) throw error;
      let imagem: string | null = null;
      if (data?.background_path) {
        const resultado = await supabase.storage.from('personal-backgrounds').createSignedUrl(data.background_path, 3600);
        if (resultado.error) throw resultado.error;
        imagem = resultado.data.signedUrl;
      }
      return { theme: temaValido(data?.theme), background_path: data?.background_path ?? null, imagem };
    },
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
  return <>
    {data?.imagem && <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url("${data.imagem}")` }}><div className="absolute inset-0 bg-background/90 backdrop-blur-[2px]" /></div>}
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
  const atual = data ?? { theme: 'original' as Tema, background_path: null, imagem: null };

  async function salvar(theme: Tema, background_path: string | null) {
    const { error } = await supabase.from('user_appearance').upsert({ user_id: session.user.id, theme, background_path });
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
        {TEMAS.map(t => <Button key={t.id} type="button" variant="outline" disabled={salvando || isPending || isError} aria-pressed={atual.theme === t.id} onClick={() => executar(() => salvar(t.id, atual.background_path), 'Tema salvo.')} className={`h-auto flex-col items-stretch p-3 text-left ${atual.theme === t.id ? 'ring-2 ring-ring' : ''}`}>
          <span data-theme={t.id} className="flex gap-1"><span className="h-6 flex-1 rounded border bg-background" /><span className="h-6 flex-1 rounded border bg-primary" /></span>{t.nome}
        </Button>)}
      </div>
      <section className="space-y-3 border-t pt-4">
        <div><h3 className="font-semibold">Imagem de fundo</h3><p className="text-xs text-muted-foreground">Fica suave atrás das informações e os quadros continuam com fundo sólido.</p></div>
        {atual.imagem && <img src={atual.imagem} alt="Sua imagem de fundo atual" className="h-28 w-full rounded-lg object-cover" />}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => enviar(e.target.files?.[0])} />
        <div className="flex flex-wrap gap-2"><Button type="button" disabled={salvando || isPending || isError} onClick={() => input.current?.click()}><ImagePlus />{atual.imagem ? 'Trocar imagem' : 'Escolher imagem'}</Button>{atual.imagem && <Button type="button" variant="outline" disabled={salvando} onClick={removerImagem}><Trash2 />Remover</Button>}</div>
      </section>
      {msg && <p role="status" className="text-sm text-muted-foreground">{msg}</p>}
      {isError && <p role="alert" className="text-sm text-debit">Não foi possível carregar sua aparência. Tente novamente mais tarde.</p>}
    </DialogContent>
  </Dialog>;
}