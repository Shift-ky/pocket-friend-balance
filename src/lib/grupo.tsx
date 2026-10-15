import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Grupo = { id: string; nome: string; codigo: string };
type Ctx = { session: Session; grupo: Grupo; sair: () => Promise<void> };
const GrupoCtx = createContext<Ctx | null>(null);

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

function Login() {
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true); setMsg("");
    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) setMsg("E-mail ou senha incorretos.");
    } else {
      const { error } = await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin } });
      setMsg(error ? error.message : "Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre.");
    }
    setCarregando(false);
  }

  return (
    <Caixa titulo={modo === "entrar" ? "Entrar" : "Criar conta"}>
      <form onSubmit={enviar} className="space-y-4">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className={campo} />
        <input type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha" className={campo} />
        <button disabled={carregando} className={botao}>{modo === "entrar" ? "Entrar" : "Criar conta"}</button>
      </form>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      <button onClick={() => { setModo(modo === "entrar" ? "criar" : "entrar"); setMsg(""); }} className="text-sm underline">
        {modo === "entrar" ? "Não tem conta? Criar conta" : "Já tenho conta"}
      </button>
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const carregarGrupo = useCallback(async () => {
    const { data } = await supabase.from("grupos").select("id, nome, codigo").order("created_at").limit(1).maybeSingle();
    setGrupo(data ?? null);
  }, []);

  useEffect(() => {
    if (session) carregarGrupo(); else setGrupo(undefined);
  }, [session?.user.id, carregarGrupo]);

  if (session === undefined || (session && grupo === undefined))
    return <p className="py-20 text-center text-muted-foreground">Carregando…</p>;
  if (!session) return <Login />;
  if (!grupo) return <EscolherGrupo aoEntrar={carregarGrupo} />;

  return (
    <GrupoCtx.Provider value={{ session, grupo, sair: async () => { await supabase.auth.signOut(); } }}>
      {children}
    </GrupoCtx.Provider>
  );
}

export function useTabelaAoVivo<T>(tabela: "lancamentos" | "feira_itens" | "despesas", grupoId: string) {
  const [linhas, setLinhas] = useState<T[]>([]);
  const recarregar = useCallback(async () => {
    const { data } = await supabase.from(tabela).select("*").eq("grupo_id", grupoId).order("created_at");
    setLinhas((data ?? []) as T[]);
  }, [tabela, grupoId]);

  useEffect(() => {
    recarregar();
    const canal = supabase
      .channel(`${tabela}-${grupoId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: tabela, filter: `grupo_id=eq.${grupoId}` }, () => recarregar())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [tabela, grupoId, recarregar]);

  return { linhas, recarregar };
}
