DO $block$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef('public.telegram_products_action(uuid,text,jsonb)'::regprocedure) INTO d;
 d:=replace(d,'IF r.status=''descartado'' THEN','IF r.status=''pendente'' AND r.produtos_destino IS NULL AND (r.documento=''cupom'' OR jsonb_array_length(r.produtos)>0) THEN RAISE EXCEPTION ''Revise os produtos pela compra completa no MAR IA''; END IF; IF r.status=''descartado'' THEN');
 EXECUTE d;
END $block$;