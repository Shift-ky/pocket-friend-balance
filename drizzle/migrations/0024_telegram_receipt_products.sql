ALTER TABLE public.telegram_reviews ADD COLUMN produtos jsonb NOT NULL DEFAULT '[]'::jsonb, ADD COLUMN produtos_destino text, ADD COLUMN produtos_importados_at timestamptz;
ALTER TABLE public.telegram_reviews ADD CONSTRAINT telegram_products_array CHECK (jsonb_typeof(produtos) = 'array'), ADD CONSTRAINT telegram_products_destination CHECK (produtos_destino IN ('feira','estoque'));
CREATE OR REPLACE FUNCTION public.telegram_products_action(_id uuid, _action text, _produtos jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.telegram_reviews; i jsonb; pid uuid; price numeric; quantity numeric; name text;
BEGIN
 SELECT * INTO r FROM public.telegram_reviews WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR r.user_id<>auth.uid() OR NOT public.e_membro(r.grupo_id) OR NOT public.module_access('financas') THEN RAISE EXCEPTION 'Sem acesso à conferência'; END IF;
 IF r.status='descartado' THEN RAISE EXCEPTION 'Documento descartado'; END IF;
 IF _action NOT IN ('salvar','feira','estoque') THEN RAISE EXCEPTION 'Destino inválido'; END IF;
 IF _action IN ('feira','estoque') AND NOT public.module_access(_action) THEN RAISE EXCEPTION 'Sem acesso ao destino'; END IF;
 IF r.produtos_destino IS NOT NULL THEN RETURN r.produtos_destino; END IF;
 IF r.extraction_status IN ('aguardando','processando') THEN RAISE EXCEPTION 'Aguarde a leitura do documento'; END IF;
 IF _produtos IS NULL OR jsonb_typeof(_produtos)<>'array' OR jsonb_array_length(_produtos)>200 OR octet_length(_produtos::text)>100000 THEN RAISE EXCEPTION 'Produtos inválidos'; END IF;
 IF _action<>'salvar' AND jsonb_array_length(_produtos)=0 THEN RAISE EXCEPTION 'Selecione pelo menos um produto'; END IF;
 FOR i IN SELECT value FROM jsonb_array_elements(_produtos) LOOP
  IF jsonb_typeof(i)<>'object' OR jsonb_typeof(i->'nome') IS DISTINCT FROM 'string' OR length(btrim(i->>'nome')) NOT BETWEEN 1 AND 200 OR (jsonb_typeof(i->'qtd') IS DISTINCT FROM 'number' AND jsonb_typeof(i->'qtd') IS DISTINCT FROM 'null') THEN RAISE EXCEPTION 'Revise nome e quantidade dos produtos'; END IF;
  quantity := (i->>'qtd')::numeric;
  IF quantity IS NOT NULL AND (quantity<=0 OR quantity>1000000) THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  IF _action<>'salvar' AND quantity IS NULL THEN RAISE EXCEPTION 'Informe a quantidade de todos os produtos'; END IF;
 END LOOP;
 IF _action<>'salvar' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('telegram-products:'||r.grupo_id::text,0));
  FOR i IN SELECT value FROM jsonb_array_elements(_produtos) LOOP
   name:=btrim(i->>'nome'); quantity:=(i->>'qtd')::numeric; pid:=NULL;
   IF _action='estoque' THEN
    IF (SELECT count(*) FROM public.estoque WHERE grupo_id=r.grupo_id AND lower(btrim(nome))=lower(name))>1 THEN RAISE EXCEPTION 'Nomes duplicados no estoque. Corrija antes de importar.'; END IF;
    SELECT id INTO pid FROM public.estoque WHERE grupo_id=r.grupo_id AND lower(btrim(nome))=lower(name) FOR UPDATE;
    IF pid IS NULL THEN INSERT INTO public.estoque(grupo_id,nome,qtd,padrao) VALUES(r.grupo_id,name,quantity,quantity);
    ELSE UPDATE public.estoque SET qtd=qtd+quantity WHERE id=pid; END IF;
   ELSE
    IF (SELECT count(*) FROM public.feira_itens WHERE grupo_id=r.grupo_id AND lower(btrim(nome))=lower(name))>1 THEN RAISE EXCEPTION 'Nomes duplicados na Feira. Corrija antes de importar.'; END IF;
    SELECT id INTO pid FROM public.feira_itens WHERE grupo_id=r.grupo_id AND lower(btrim(nome))=lower(name) FOR UPDATE;
    IF pid IS NULL THEN
     SELECT (p.value->>'preco')::numeric INTO price FROM public.feira_historico h CROSS JOIN LATERAL jsonb_array_elements(h.itens) p WHERE h.grupo_id=r.grupo_id AND h.pagamento<>'nenhum' AND lower(btrim(p.value->>'nome'))=lower(name) ORDER BY h.created_at DESC LIMIT 1;
     INSERT INTO public.feira_itens(grupo_id,nome,qtd,preco) VALUES(r.grupo_id,name,quantity,coalesce(price,0));
    ELSE UPDATE public.feira_itens SET qtd=qtd+quantity WHERE id=pid; END IF;
   END IF;
  END LOOP;
 END IF;
 UPDATE public.telegram_reviews SET produtos=_produtos, produtos_destino=CASE WHEN _action='salvar' THEN NULL ELSE _action END, produtos_importados_at=CASE WHEN _action='salvar' THEN NULL ELSE now() END WHERE id=_id;
 RETURN CASE WHEN _action='salvar' THEN 'salvo' ELSE _action END;
END $$;
REVOKE ALL ON FUNCTION public.telegram_products_action(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.telegram_products_action(uuid,text,jsonb) TO authenticated;