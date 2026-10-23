CREATE OR REPLACE FUNCTION public.sync_offline_operation(_id uuid, _grupo_id uuid, _commands jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE cmd jsonb; r jsonb; previous jsonb; current_row jsonb; t text; action text; cols text; vals text; assignments text; allowed text[]; rid uuid; affected integer; total integer:=0; key text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.e_membro(_grupo_id) THEN RAISE EXCEPTION 'Sem acesso ao grupo'; END IF;
 IF jsonb_typeof(_commands)<>'array' OR jsonb_array_length(_commands)>500 OR octet_length(_commands::text)>2000000 THEN RAISE EXCEPTION 'Alteração inválida'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||_id::text,0));
 SELECT payload INTO previous FROM public.offline_operations WHERE user_id=auth.uid() AND id=_id;
 IF FOUND THEN
  IF previous IS DISTINCT FROM jsonb_build_object('group',_grupo_id,'commands',_commands) THEN RAISE EXCEPTION 'Identificador já utilizado'; END IF;
  RETURN jsonb_build_object('ok',true,'replayed',true);
 END IF;
 INSERT INTO public.offline_operations(user_id,id,payload) VALUES(auth.uid(),_id,jsonb_build_object('group',_grupo_id,'commands',_commands));
 FOR cmd IN SELECT value FROM jsonb_array_elements(_commands) LOOP
  t:=cmd->>'table'; action:=cmd->>'action';
  IF t NOT IN ('lancamentos','moto_despesas','feira_itens','feira_historico','estoque','estoque_divisoes','despesas') THEN RAISE EXCEPTION 'Tabela inválida'; END IF;
  allowed:=CASE t
   WHEN 'lancamentos' THEN ARRAY['tipo','descricao','valor','data','pago','conta','destino','origem_modulo']
   WHEN 'moto_despesas' THEN ARRAY['descricao','valor','data','conta']
   WHEN 'feira_itens' THEN ARRAY['nome','qtd','qtd_comprada','preco','pego']
   WHEN 'feira_historico' THEN ARRAY['total','itens','pagamento','lancamento_id']
   WHEN 'estoque' THEN ARRAY['nome','qtd','padrao','divisao_id','ordem']
   WHEN 'estoque_divisoes' THEN ARRAY['nome']
   ELSE ARRAY['categoria','data','descricao','fornecedor','valor'] END;
  IF action='order' AND t='estoque' THEN
   PERFORM public.ordenar_estoque(_grupo_id,ARRAY(SELECT value::uuid FROM jsonb_array_elements_text(cmd->'ids')));
  ELSIF action='insert' THEN
   FOR r IN SELECT value FROM jsonb_array_elements(cmd->'rows') LOOP
    IF (r->>'grupo_id')::uuid IS DISTINCT FROM _grupo_id OR EXISTS(SELECT 1 FROM jsonb_object_keys(r) k WHERE NOT(k=ANY(allowed||ARRAY['id','grupo_id','created_at']))) THEN RAISE EXCEPTION 'Campos inválidos'; END IF;
    SELECT string_agg(format('%I',k),','),string_agg(format('x.%I',k),',') INTO cols,vals FROM jsonb_object_keys(r) k;
    EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) x',t,cols,vals,t) USING r;
    total:=total+1;
   END LOOP;
  ELSIF action IN ('update','delete') THEN
   IF action='update' THEN
    IF EXISTS(SELECT 1 FROM jsonb_object_keys(cmd->'patch') k WHERE NOT(k=ANY(allowed))) THEN RAISE EXCEPTION 'Campos inválidos'; END IF;
    SELECT string_agg(format('%I=x.%I',k,k),',') INTO assignments FROM jsonb_object_keys(cmd->'patch') k;
    IF assignments IS NULL THEN RAISE EXCEPTION 'Alteração vazia'; END IF;
   END IF;
   FOR rid IN SELECT value::uuid FROM jsonb_array_elements_text(cmd->'ids') LOOP
    EXECUTE format('SELECT to_jsonb(x) FROM public.%I x WHERE id=$1 AND grupo_id=$2 FOR UPDATE',t) INTO current_row USING rid,_grupo_id;
    IF current_row IS NULL THEN RAISE EXCEPTION 'Registro removido ou acesso alterado. Revise a alteração pendente.'; END IF;
    SELECT value INTO r FROM jsonb_array_elements(COALESCE(cmd->'before','[]'::jsonb)) WHERE value->>'id'=rid::text;
    IF r IS NULL THEN RAISE EXCEPTION 'Versão anterior ausente'; END IF;
    FOR key IN SELECT jsonb_object_keys(CASE WHEN action='update' THEN cmd->'patch' ELSE r-'id'-'grupo_id'-'created_at' END) LOOP
     IF current_row->key IS DISTINCT FROM r->key THEN RAISE EXCEPTION 'Este registro mudou em outro aparelho. Revise a alteração pendente.'; END IF;
    END LOOP;
    IF action='update' THEN
     EXECUTE format('UPDATE public.%I d SET %s FROM jsonb_populate_record(NULL::public.%I,$1) x WHERE d.id=$2 AND d.grupo_id=$3',t,assignments,t) USING cmd->'patch',rid,_grupo_id;
    ELSE
     EXECUTE format('DELETE FROM public.%I WHERE id=$1 AND grupo_id=$2',t) USING rid,_grupo_id;
    END IF;
    GET DIAGNOSTICS affected=ROW_COUNT;
    IF affected<>1 THEN RAISE EXCEPTION 'Sem permissão para alterar este registro'; END IF;
    total:=total+affected;
   END LOOP;
  ELSE RAISE EXCEPTION 'Ação inválida'; END IF;
 END LOOP;
 RETURN jsonb_build_object('ok',true,'count',total);
END $function$;