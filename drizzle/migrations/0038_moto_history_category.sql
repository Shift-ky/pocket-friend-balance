ALTER TABLE public.moto_despesas ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'Moto/Gasolina';
DO $category_sync$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.sync_offline_operation(uuid,uuid,jsonb)'::regprocedure) INTO definition;
 IF definition IS NULL THEN RAISE EXCEPTION 'Offline sync unavailable'; END IF;
 IF position('WHEN ''moto_despesas'' THEN ARRAY[''descricao'',''valor'',''data'',''conta'']' in definition) > 0 THEN
  definition := replace(definition, 'WHEN ''moto_despesas'' THEN ARRAY[''descricao'',''valor'',''data'',''conta'']', 'WHEN ''moto_despesas'' THEN ARRAY[''descricao'',''valor'',''data'',''conta'',''categoria'']');
  EXECUTE definition;
 ELSIF position('WHEN ''moto_despesas'' THEN ARRAY[''descricao'',''valor'',''data'',''conta'',''categoria'']' in definition) = 0 THEN
  RAISE EXCEPTION 'Unexpected Moto offline allowlist';
 END IF;
END $category_sync$;