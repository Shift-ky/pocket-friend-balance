import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CloudCheck, CloudOff, RefreshCw, Trash2 } from 'lucide-react';
import { useGrupo } from '@/lib/grupo';
import { closeOffline, discardPending, offlineStatus, openOffline, refreshOffline, subscribeOffline, syncOffline } from '@/lib/offline-client';
import { Button } from '@/components/ui/button';

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { session, grupo } = useGrupo();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const qc = useQueryClient();
  useEffect(() => {
    let active = true;
    setReady(false);
    openOffline(session.user.id, grupo.id).then(() => { if (active) setReady(true); }).catch(() => { if (active) setError('Não foi possível abrir os dados guardados neste aparelho.'); });
    const reconnect = () => { void qc.invalidateQueries(); void syncOffline(); };
    const offline = () => { void syncOffline(); };
    const refresh = () => { if (navigator.onLine) void refreshOffline(); };
    window.addEventListener('online', reconnect); window.addEventListener('offline', offline);
    const timer = window.setInterval(() => { if (navigator.onLine) void syncOffline(); }, 15000);
    const channel = supabaseChannel(grupo.id, refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('online', reconnect); window.removeEventListener('offline', offline); channel(); closeOffline(); qc.clear(); };
  }, [session.user.id, grupo.id, qc]);
  if (error) return <p role="alert" className="px-5 py-12 text-center text-debit">{error}</p>;
  if (!ready) return <p className="py-20 text-center text-muted-foreground">Carregando dados do aparelho…</p>;
  return <><OfflineStatus />{children}</>;
}

import { supabase as remote } from '@/integrations/supabase/client';
function supabaseChannel(group: string, refresh: () => void) {
  const channel = remote.channel(`offline-refresh-${group}`).on('postgres_changes', { event: '*', schema: 'public', filter: `grupo_id=eq.${group}` }, refresh).subscribe();
  return () => { void remote.removeChannel(channel); };
}
function OfflineStatus() {
  const state = useSyncExternalStore(subscribeOffline, offlineStatus, offlineStatus);
  return <div role="status" className="border-b bg-card px-5 py-2 text-xs text-muted-foreground"><div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
    {state.online ? <CloudCheck className="h-4 w-4 text-credit" /> : <CloudOff className="h-4 w-4" />}
    <span>{state.syncing ? 'Sincronizando…' : !state.online ? 'Sem internet · dados neste aparelho' : state.pending ? 'Alterações aguardando sincronização' : 'Sincronizado'}</span>
    {state.pending > 0 && <span>· {state.pending} pendente(s)</span>}
    {state.online && state.pending > 0 && <Button variant="ghost" size="icon" className="h-7 w-7" disabled={state.syncing} aria-label="Tentar sincronizar" title="Tentar sincronizar" onClick={() => { void syncOffline(); }}><RefreshCw className="h-4 w-4" /></Button>}
    {state.error && <div className="flex w-full flex-wrap items-center gap-2 text-debit"><span>{state.error}</span><Button variant="outline" size="sm" disabled={state.syncing || !state.online} onClick={() => { if (confirm('Descartar somente a primeira alteração pendente? Ela não será enviada.')) void discardPending(); }}><Trash2 />Descartar alteração</Button></div>}
  </div></div>;
}