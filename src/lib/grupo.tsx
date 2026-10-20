import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/offline-client";
import { readIdentity, rememberIdentity, forgetIdentity } from '@/lib/offline-store';
import { useAccess } from "@/lib/access-context";
import { moduleForTable, visibleEntries } from "@/lib/access";
import { Button } from '@/components/ui/button';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sprout } from 'lucide-react';
import loginDreams from '@/assets/login-dreams.jpg';
import { LoginWelcome } from '@/components/login-welcome';

type Grupo = { id: string; nome: string; codigo: string };
type Ctx = { session: Session; grupo: Grupo; sair: () => Promise<void> };
// Shared on globalThis so hot reloads don't create a second, empty context.
const g = globalThis as unknown as { __grupoCtx?: React.Context<Ctx | null> };
const GrupoCtx = (g.__grupoCtx ??= createContext<Ctx | null>(null));

export function useGrupo() {
  const c = useContext(GrupoCtx);
  if (!c) throw new Error("useGrupo fora do provider");
  return c;
}

const campo = "w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring";
const botao = "w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50";

function Caixa({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <h1 className="mb-6 font-display text-4xl">{titulo}</h1>
      <div className="space-y-4 rounded-xl border bg-card p-6">{children}</div>
    </main>
  );
}

function Login({ aoEntrar }: { aoEntrar: () => void }) {
  const [modo, setModo] = useState<"entrar" | "criar" | "recuperar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    if (h.get("error")) {
      setModo("recuperar");
      setMsg("Esse link expirou ou já foi usado. Peça um novo link abaixo e abra-o logo em seguida.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true); setMsg("");
    if (modo === "recuperar") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      setMsg(error ? error.message : "Enviamos um link para seu e-mail. Abra-o para criar uma nova senha.");
    } else if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) setMsg("E-mail ou senha incorretos.");
      else aoEntrar();
    } else {
      const { error } = await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin } });
      setMsg(error ? error.message : "Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre.");
    }
    setCarregando(false);
  }

  return (
    <main data-login className="relative isolate bg-background text-foreground">
      <img src={loginDreams} alt="Moedas guardadas ao lado de fotografias de uma casa e de uma viagem à praia" width={1536} height={1024} fetchPriority="high" className="absolute inset-x-0 top-0 -z-10 h-[290px] w-full object-cover object-bottom lg:h-full lg:object-center" />
      <div className="mx-auto grid max-w-7xl lg:min-h-[calc(100dvh-65px)] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <header className="flex h-[290px] flex-col px-6 pt-7 lg:h-auto lg:px-12 lg:py-14">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase"><Sprout className="h-4 w-4" />Um passo de cada vez</p>
          <h1 className="mt-4 font-display text-4xl lg:mt-8 lg:text-5xl">Minhas Finanças</h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed lg:text-base">Cuide do seu dinheiro.<br />Dê espaço aos seus sonhos.</p>
          <p className="mt-auto hidden max-w-xs border-l-2 border-primary pl-4 text-sm leading-relaxed lg:block">A sua próxima conquista começa<br />com o cuidado de hoje.</p>
        </header>
        <section aria-label="Acesso à sua conta" className="flex items-center bg-card px-6 py-9 lg:bg-card/95 lg:px-12 lg:py-14">
          <div className="mx-auto w-full max-w-sm">
            <span className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-primary"><Sprout className="h-5 w-5" /></span>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Seu futuro, com carinho</p>
            <h2 className="mt-2 font-display text-3xl">{modo === 'entrar' ? 'Que bom ter você aqui.' : modo === 'criar' ? 'Comece a cuidar dos seus sonhos.' : 'Vamos recuperar seu acesso.'}</h2>
            <p className="mb-7 mt-3 text-sm leading-relaxed text-muted-foreground">{modo === 'entrar' ? 'Entre na sua conta e continue construindo suas conquistas.' : modo === 'criar' ? 'Crie sua conta para começar uma nova etapa.' : 'Receba por e-mail um link para criar uma nova senha.'}</p>
            <form onSubmit={enviar} className="space-y-5">
              <label className="block space-y-2 text-sm font-semibold"><span>E-mail</span><div className="relative"><Mail aria-hidden className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className={`${campo} h-11 pl-10 font-normal`} /></div></label>
              {modo !== 'recuperar' && <label className="block space-y-2 text-sm font-semibold"><span>Senha</span><div className="relative"><LockKeyhole aria-hidden className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><input type={mostrarSenha ? 'text' : 'password'} autoComplete={modo === 'criar' ? 'new-password' : 'current-password'} required minLength={6} value={senha} onChange={e => setSenha(e.target.value)} placeholder="Sua senha" className={`${campo} h-11 pl-10 pr-12 font-normal`} /><Button type="button" variant="ghost" size="icon" aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setMostrarSenha(atual => !atual)} className="absolute right-1 top-1 h-9 w-9 text-muted-foreground">{mostrarSenha ? <EyeOff /> : <Eye />}</Button></div></label>}
              {modo === 'entrar' && <div className="flex justify-end"><Button type="button" variant="link" disabled={carregando} onClick={() => { setModo('recuperar'); setMsg(''); }} className="h-auto px-0 py-0 text-xs">Esqueci minha senha</Button></div>}
              <Button type="submit" disabled={carregando} className="h-12 w-full justify-between px-5">{carregando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : modo === 'criar' ? 'Criar conta' : 'Enviar link de recuperação'}<ArrowRight className="h-4 w-4" /></Button>
            </form>
            {msg && <p role="status" className="mt-4 text-sm text-muted-foreground">{msg}</p>}
            <div className="mt-7 border-t pt-5 text-center text-sm"><span className="text-muted-foreground">{modo === 'entrar' ? 'Ainda não tem uma conta? ' : ''}</span><Button type="button" variant="link" disabled={carregando} onClick={() => { setModo(modo === 'entrar' ? 'criar' : 'entrar'); setMsg(''); }} className="h-auto px-0 py-0">{modo === 'entrar' ? 'Criar conta' : 'Voltar para entrar'}</Button></div>
          </div>
        </section>
      </div>
    </main>
  );
}

function NovaSenha({ aoConcluir }: { aoConcluir: () => void }) {
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) return setMsg(error.message);
    window.history.replaceState(null, "", "/");
    aoConcluir();
  }
  return (
    <Caixa titulo="Nova senha">
      <form onSubmit={salvar} className="space-y-4">
        <input type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Nova senha (mín. 6)" className={campo} />
        <button className={botao}>Salvar nova senha</button>
      </form>
      {msg && <p className="text-sm text-debit">{msg}</p>}
    </Caixa>
  );
}

function EscolherGrupo({ aoEntrar }: { aoEntrar: () => void }) {
  const [nome, setNome] = useState("Minha família");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");

  async function criar() {
    const { error } = await supabase.rpc("criar_grupo", { _nome: nome });
    error ? setErro(error.message) : aoEntrar();
  }
  async function entrar() {
    const { error } = await supabase.rpc("entrar_grupo", { _codigo: codigo });
    error ? setErro("Código inválido.") : aoEntrar();
  }

  return (
    <Caixa titulo="Seu grupo">
      <p className="text-sm text-muted-foreground">Crie um grupo e passe o código para os outros celulares, ou entre com um código recebido.</p>
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do grupo" className={campo} />
      <button onClick={criar} className={botao}>Criar grupo</button>
      <div className="border-t pt-4" />
      <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código (ex: A1B2C3)" className={`${campo} uppercase`} />
      <button onClick={entrar} className={botao}>Entrar com código</button>
      {erro && <p className="text-sm text-debit">{erro}</p>}
      <button onClick={() => supabase.auth.signOut()} className="text-sm underline">Sair da conta</button>
    </Caixa>
  );
}

export function GrupoGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [grupo, setGrupo] = useState<Grupo | null | undefined>(undefined);

  const [recuperando, setRecuperando] = useState(false);
  const [boasVindas, setBoasVindas] = useState(false);
  const concluirBoasVindas = useCallback(() => setBoasVindas(false), []);

  useEffect(() => {
    if (window.location.pathname === "/reset-password" || window.location.hash.includes("type=recovery")) setRecuperando(true);
    const restore = async () => {
      if (!navigator.onLine) {
        const identity = await readIdentity();
        if (identity) {
          setGrupo(identity.grupo);
          setSession({ user: identity.user, access_token: '', refresh_token: '', expires_in: 0, token_type: 'bearer' });
          return;
        }
      }
      const { data } = await supabase.auth.getSession(); setSession(data.session);
    };
    void restore();
    window.addEventListener('online', restore);
    const { data } = supabase.auth.onAuthStateChange((e, s) => { if (e === "PASSWORD_RECOVERY") setRecuperando(true); if (navigator.onLine || s || e === 'SIGNED_OUT') setSession(s); });
    return () => { data.subscription.unsubscribe(); window.removeEventListener('online', restore); };
  }, []);

  const carregarGrupo = useCallback(async () => {
    if (!navigator.onLine) {
      const identity = await readIdentity();
      if (identity && identity.user.id === session?.user.id) setGrupo(identity.grupo);
      return;
    }
    const { data } = await supabase.from("grupos").select("id, nome, codigo").order("created_at").limit(1).maybeSingle();
    setGrupo(data ?? null);
    if (data && session) await rememberIdentity({ user: session.user, grupo: data });
  }, [session?.user.id]);

  useEffect(() => {
    if (session) carregarGrupo(); else setGrupo(undefined);
  }, [session?.user.id, carregarGrupo]);

  if (recuperando && session) return <NovaSenha aoConcluir={() => setRecuperando(false)} />;
  if (boasVindas && session) return <LoginWelcome aoConcluir={concluirBoasVindas} />;
  if (session === undefined || (session && grupo === undefined))
    return <p className="py-20 text-center text-muted-foreground">Carregando…</p>;
  if (!session) return <Login aoEntrar={() => setBoasVindas(true)} />;
  if (!grupo) return <EscolherGrupo aoEntrar={carregarGrupo} />;

  return (
    <GrupoCtx.Provider value={{ session, grupo, sair: async () => { await forgetIdentity(); await supabase.auth.signOut({ scope: 'local' }); } }}>
      {children}
    </GrupoCtx.Provider>
  );
}

export function useTabelaAoVivo<T>(tabela: "lancamentos" | "feira_itens" | "despesas" | "feira_historico" | "estoque" | "estoque_divisoes" | "moto_despesas", grupoId: string) {
  const access = useAccess();
  const allowed = tabela === "lancamentos" ? access.financas || access.moto : access[moduleForTable(tabela)];
  const [linhas, setLinhas] = useState<T[]>([]);
  const recarregar = useCallback(async () => {
    if (!allowed) { setLinhas([]); return; }
    const { data } = await supabase.from(tabela).select("*").eq("grupo_id", grupoId).order("created_at");
    setLinhas((data ?? []) as T[]);
  }, [tabela, grupoId, allowed, access]);

  useEffect(() => {
    recarregar();
    window.addEventListener('offline-data', recarregar);
    const canal = supabase
      .channel(`${tabela}-${grupoId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: tabela, filter: `grupo_id=eq.${grupoId}` }, () => recarregar())
      .subscribe();
    return () => { window.removeEventListener('offline-data', recarregar); supabase.removeChannel(canal); };
  }, [tabela, grupoId, recarregar]);

  return { linhas: !allowed ? [] : tabela === "lancamentos" ? visibleEntries(linhas as (T & { destino?: string; origem_modulo?: string })[], access) : linhas, recarregar };
}
