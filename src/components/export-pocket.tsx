import { useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGrupo } from '@/lib/grupo';
import { supabase } from '@/integrations/supabase/client';
import { offlineStatus } from '@/lib/offline-client';

const TABLES = [
  'lancamentos', 'moto_despesas', 'feira_itens', 'feira_historico', 'estoque',
  'estoque_divisoes', 'despesas', 'contas_fixas', 'contas_fixas_ocorrencias',
  'carteiras', 'metas', 'cotacoes',
] as const;

export function ExportPocket() {
  const { grupo, session } = useGrupo();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function exportar() {
    setMessage('');
    if (offlineStatus().pending) {
      setMessage('Sincronize as alterações pendentes antes de exportar.');
      return;
    }
    setBusy(true);
    try {
      const tables: Record<string, unknown[]> = {};
      for (const table of TABLES) {
        const rows: unknown[] = [];
        const fixedIds = table === 'contas_fixas_ocorrencias'
          ? (tables.contas_fixas as any[] || []).map(row => row.id)
          : [];
        if (table === 'contas_fixas_ocorrencias' && fixedIds.length === 0) {
          tables[table] = rows;
          continue;
        }
        for (let start = 0; ; start += 500) {
          let query: any = supabase.from(table).select('*');
          if (table === 'cotacoes') {
            // Exchange rates are shared reference data and have no grupo_id.
          } else if (table === 'contas_fixas_ocorrencias') {
            query = query.in('fixa_id', fixedIds);
          } else {
            query = query.eq('grupo_id', grupo.id);
          }
          const { data, error } = await query.range(start, start + 499);
          if (error) throw error;
          rows.push(...(data ?? []));
          if (!data || data.length < 500) break;
        }
        tables[table] = rows;
      }
      const { data: appearance, error: appearanceError } = await supabase
        .from('user_appearance').select('*').eq('user_id', session.user.id).maybeSingle();
      if (appearanceError) throw appearanceError;
      const payload = {
        application: 'Pocket Friends',
        format: 'pocket-friends-export',
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        sourceGroup: { id: grupo.id, name: grupo.nome },
        sourceUser: { id: session.user.id, email: session.user.email },
        tables,
        userAppearance: appearance,
        notes: ['Dados lidos usando a sessão autenticada e as políticas de acesso do Pocket Friends.', 'Imagens de fundo e credenciais de integrações externas não são copiadas neste arquivo.'],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `pocket-friends-${grupo.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Exportação concluída. Guarde o arquivo para importar no MAR IA.');
    } catch (error) {
      setMessage(error instanceof Error ? `Não foi possível exportar: ${error.message}` : 'Não foi possível exportar os dados.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="flex flex-col items-start gap-2">
    <Button type="button" variant="outline" onClick={() => void exportar()} disabled={busy}>
      {busy ? <LoaderCircle className="animate-spin" /> : <Download />}
      {busy ? 'Preparando exportação…' : 'Exportar dados para MAR IA'}
    </Button>
    {message && <p role="status" className="max-w-lg text-xs text-muted-foreground">{message}</p>}
  </div>;
}
