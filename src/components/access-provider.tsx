import { useEffect, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useLocation } from '@tanstack/react-router';
import { useGrupo } from '@/lib/grupo';
import { meusAcessos } from '@/lib/admin.functions';
import { AccessContext } from '@/lib/access-context';
import { MODULES, type Module } from '@/lib/access';
import { supabase } from '@/integrations/supabase/client';
import { cachedValue } from '@/lib/offline-store';

export function AccessProvider({ children }: { children: ReactNode }) {
  const { session } = useGrupo();
  const qc = useQueryClient();
  const read = useServerFn(meusAcessos);
  const { data, isError } = useQuery({ queryKey: ['acessos', session.user.id], networkMode: 'always', queryFn: () => cachedValue(session.user.id, 'acessos', () => read()), refetchInterval: 3000, staleTime: 0 });
  useEffect(() => {
    const channel = supabase.channel(`access-${session.user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'user_access', filter: `user_id=eq.${session.user.id}` }, () => { void qc.invalidateQueries({ queryKey: ['acessos', session.user.id] }); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [session.user.id, qc]);
  if (isError) return <p role="alert" className="py-20 text-center text-debit">Não foi possível verificar seus acessos.</p>;
  if (!data) return <p className="py-20 text-center text-muted-foreground">Carregando…</p>;
  return <AccessContext.Provider value={data}>{children}</AccessContext.Provider>;
}

export function AccessSurface({ children }: { children: ReactNode }) {
  const pathname = useLocation({ select: location => location.pathname });
  return <AccessContext.Consumer>{access => {
    const section = ['contas-fixas', 'conferencia'].includes(pathname.split('/')[1] ?? '') ? 'financas' : pathname.split('/')[1];
    const module = MODULES.find(m => m === section) as Module | undefined;
    return module && !access[module] ? <main className="mx-auto max-w-3xl px-5 py-12"><p role="alert" className="text-muted-foreground">Você não tem acesso a esta página.</p></main> : children;
  }}</AccessContext.Consumer>;
}