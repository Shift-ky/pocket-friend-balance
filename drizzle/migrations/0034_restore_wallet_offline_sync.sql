-- Repair the offline sync function after the Feira ordering migration replaced
-- its earlier wallet-aware allowlist with an older function body.

DO $wallet_sync$
DECLARE
  definition text;
BEGIN
  SELECT pg_get_functiondef('public.sync_offline_operation(uuid,uuid,jsonb)'::regprocedure)
    INTO definition;

  IF definition IS NULL THEN
    RAISE EXCEPTION 'sync_offline_operation(uuid,uuid,jsonb) was not found';
  END IF;

  -- Support the function body from 0031 and the older body from 0021/0028.
  definition := replace(
    definition,
    '''estoque_divisoes'',''despesas'')',
    '''estoque_divisoes'',''despesas'',''contas_fixas'',''carteiras'',''metas'')'
  );
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
    'WHEN ''estoque_divisoes'' THEN ARRAY[''nome''] ELSE ARRAY[''categoria'',''data'',''descricao'',''fornecedor'',''valor''] END;',
    'WHEN ''estoque_divisoes'' THEN ARRAY[''nome''] WHEN ''contas_fixas'' THEN ARRAY[''descricao'',''modalidade'',''conta'',''valor'',''dia'',''inicio'',''fim'',''ativa'',''carteira_id''] WHEN ''carteiras'' THEN ARRAY[''nome'',''tipo'',''moeda'',''cor'',''icone'',''na_feira'',''nas_fixas'',''no_painel''] WHEN ''metas'' THEN ARRAY[''nome'',''carteira_id'',''valor_alvo'',''data_limite'',''ativa''] ELSE ARRAY[''categoria'',''data'',''descricao'',''fornecedor'',''valor''] END;'
  );

  IF position('''carteira_id'',''transferencia_id'',''categoria'',''fonte'']' in definition) = 0
     OR position('WHEN ''contas_fixas'' THEN' in definition) = 0
     OR position('WHEN ''carteiras'' THEN' in definition) = 0
     OR position('WHEN ''metas'' THEN' in definition) = 0
     OR position('''carteiras'',''metas'')' in definition) = 0 THEN
    RAISE EXCEPTION 'Could not restore wallet support in sync_offline_operation; inspect its current definition before retrying';
  END IF;

  EXECUTE definition;
END
$wallet_sync$;
