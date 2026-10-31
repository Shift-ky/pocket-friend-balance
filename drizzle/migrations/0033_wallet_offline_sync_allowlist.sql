-- Keep the offline sync allowlist aligned with wallet-aware finance entries.
-- Reapply the 0028 RPC changes for deployments where that migration was missed.

DO $wallet_sync$
DECLARE
  definition text;
BEGIN
  SELECT pg_get_functiondef('public.sync_offline_operation(uuid,uuid,jsonb)'::regprocedure)
    INTO definition;

  IF definition IS NULL THEN
    RAISE EXCEPTION 'sync_offline_operation(uuid,uuid,jsonb) was not found';
  END IF;

  definition := replace(
    definition,
    '''despesas'',''contas_fixas'')',
    '''despesas'',''contas_fixas'',''carteiras'',''metas'')'
  );
  definition := replace(
    definition,
    '''destino'',''origem_modulo'']',
    '''destino'',''origem_modulo'',''carteira_id'',''transferencia_id'',''categoria'',''fonte'']'
  );
  definition := replace(
    definition,
    '''total'',''itens'',''pagamento'',''lancamento_id'']',
    '''total'',''itens'',''pagamento'',''lancamento_id'',''carteira_id'']'
  );
  definition := replace(
    definition,
    '''fim'',''ativa'']',
    '''fim'',''ativa'',''carteira_id'']'
  );
  definition := replace(
    definition,
    'WHEN ''contas_fixas'' THEN',
    'WHEN ''carteiras'' THEN ARRAY[''nome'',''tipo'',''moeda'',''cor'',''icone'',''na_feira'',''nas_fixas'',''no_painel''] WHEN ''metas'' THEN ARRAY[''nome'',''carteira_id'',''valor_alvo'',''data_limite'',''ativa''] WHEN ''contas_fixas'' THEN'
  );

  IF position('''carteira_id'',''transferencia_id'',''categoria'',''fonte'' ]' in definition) > 0 THEN
    -- pg_get_functiondef formatting can vary; the exact array check below is authoritative.
    NULL;
  END IF;

  IF position('''carteira_id'',''transferencia_id'',''categoria'',''fonte'']' in definition) = 0
     OR position('''carteiras'',''metas'')' in definition) = 0
     OR position('WHEN ''carteiras'' THEN' in definition) = 0
     OR position('WHEN ''metas'' THEN' in definition) = 0 THEN
    RAISE EXCEPTION 'Could not update the offline sync wallet allowlist; inspect sync_offline_operation before retrying';
  END IF;

  EXECUTE definition;
END
$wallet_sync$;
