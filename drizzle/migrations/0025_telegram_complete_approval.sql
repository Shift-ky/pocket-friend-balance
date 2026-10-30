ALTER TABLE public.telegram_reviews ADD COLUMN feira_historico_id uuid, ADD COLUMN moto_despesa_id uuid;
ALTER TABLE public.feira_historico ADD COLUMN data_compra date, ADD COLUMN local text NOT NULL DEFAULT '';
ALTER TABLE public.estoque ADD CONSTRAINT estoque_group_id_unique UNIQUE(grupo_id,id);
CREATE TABLE public.telegram_product_links (
 grupo_id uuid NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
 nome_cupom text NOT NULL CHECK(length(nome_cupom) BETWEEN 1 AND 200),
 estoque_id uuid NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(grupo_id,nome_cupom),
 FOREIGN KEY(grupo_id,estoque_id) REFERENCES public.estoque(grupo_id,id) ON DELETE CASCADE
);
GRANT SELECT ON public.telegram_product_links TO authenticated;
GRANT ALL ON public.telegram_product_links TO service_role;
ALTER TABLE public.telegram_product_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY telegram_product_links_read ON public.telegram_product_links FOR SELECT TO authenticated USING(public.e_membro(grupo_id) AND public.module_access('financas') AND public.module_access('estoque'));
DO $block$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef('public.sync_offline_operation(uuid,uuid,jsonb)'::regprocedure) INTO d;
 IF position('ARRAY[''total'',''itens'',''pagamento'',''lancamento_id'']' IN d)=0 THEN RAISE EXCEPTION 'Whitelist da Feira não encontrada'; END IF;
 d:=replace(d,'ARRAY[''total'',''itens'',''pagamento'',''lancamento_id'']','ARRAY[''total'',''itens'',''pagamento'',''lancamento_id'',''data_compra'',''local'']');
 EXECUTE d;
END $block$;
CREATE OR REPLACE FUNCTION public.sync_stock_purchase() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE i jsonb; product_id uuid; name text; quantity numeric;
BEGIN
 IF NEW.pagamento='nenhum' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN IF OLD.pagamento<>'nenhum' THEN RETURN NEW; END IF; END IF;
 FOR i IN SELECT value FROM jsonb_array_elements(NEW.itens) LOOP
  IF i ? 'estoque_incluir' AND (i->>'estoque_incluir')::boolean=false THEN CONTINUE; END IF;
  name:=btrim(i->>'nome'); quantity:=COALESCE((i->>'qtd')::numeric,0);
  IF name='' OR quantity<=0 THEN CONTINUE; END IF;
  product_id:=NULL;
  IF i->>'estoque_id' IS NOT NULL THEN
   SELECT id INTO product_id FROM public.estoque WHERE id=(i->>'estoque_id')::uuid AND grupo_id=NEW.grupo_id FOR UPDATE;
   IF product_id IS NULL THEN RAISE EXCEPTION 'Produto não pertence ao grupo'; END IF;
  ELSE
   IF (SELECT count(*) FROM public.estoque WHERE grupo_id=NEW.grupo_id AND lower(btrim(nome))=lower(name))>1 THEN RAISE EXCEPTION 'Nomes duplicados no estoque'; END IF;
   SELECT id INTO product_id FROM public.estoque WHERE grupo_id=NEW.grupo_id AND lower(btrim(nome))=lower(name) FOR UPDATE;
  END IF;
  IF product_id IS NULL THEN INSERT INTO public.estoque(grupo_id,nome,qtd,padrao) VALUES(NEW.grupo_id,name,quantity,quantity);
  ELSE UPDATE public.estoque SET qtd=qtd+quantity WHERE id=product_id; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.telegram_receipt_action(_id uuid,_action text,_valor numeric,_data date,_descricao text,_local text,_conta text,_categoria text,_produtos jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.telegram_reviews; i jsonb; pid uuid; name text; receipt_name text; quantity numeric; price numeric; include_stock boolean; history_items jsonb:='[]'; reviewed_items jsonb:='[]'; lid uuid; hid uuid;
BEGIN
 SELECT * INTO r FROM public.telegram_reviews WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR r.user_id<>auth.uid() OR NOT public.e_membro(r.grupo_id) OR NOT public.module_access('financas') THEN RAISE EXCEPTION 'Sem acesso à conferência'; END IF;
 IF r.status='aprovado' THEN RETURN r.lancamento_id; END IF;
 IF r.status<>'pendente' THEN RAISE EXCEPTION 'Documento descartado'; END IF;
 IF r.produtos_destino IS NOT NULL THEN RAISE EXCEPTION 'Produtos já importados; revise este documento separadamente'; END IF;
 IF r.extraction_status IN ('aguardando','processando') THEN RAISE EXCEPTION 'Aguarde a leitura'; END IF;
 IF _action NOT IN ('salvar','aprovar') OR _valor IS NULL OR _valor<=0 OR _valor>9999999999.99 OR _data IS NULL OR _data<DATE '2000-01-01' OR _data>DATE '2100-12-31' OR length(btrim(_descricao)) NOT BETWEEN 1 AND 200 OR length(_local)>200 OR _conta NOT IN ('dinheiro','alimentacao','refeicao') OR length(_categoria)>100 THEN RAISE EXCEPTION 'Revise valor, data, estabelecimento e carteira'; END IF;
 IF _produtos IS NULL OR jsonb_typeof(_produtos)<>'array' OR jsonb_array_length(_produtos) NOT BETWEEN 1 AND 200 OR octet_length(_produtos::text)>150000 THEN RAISE EXCEPTION 'Revise os produtos'; END IF;
 IF _action='aprovar' AND NOT public.module_access('feira') THEN RAISE EXCEPTION 'Sem acesso ao histórico da Feira'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('telegram-products:'||r.grupo_id::text,0));
 FOR i IN SELECT value FROM jsonb_array_elements(_produtos) LOOP
  IF jsonb_typeof(i)<>'object' OR jsonb_typeof(i->'nome') IS DISTINCT FROM 'string' OR length(btrim(i->>'nome')) NOT BETWEEN 1 AND 200 OR jsonb_typeof(i->'novo') IS DISTINCT FROM 'boolean' OR (jsonb_typeof(i->'qtd') IS DISTINCT FROM 'number' AND jsonb_typeof(i->'qtd') IS DISTINCT FROM 'null') OR (jsonb_typeof(i->'preco') IS DISTINCT FROM 'number' AND jsonb_typeof(i->'preco') IS DISTINCT FROM 'null') THEN RAISE EXCEPTION 'Revise nome, quantidade e preço'; END IF;
  receipt_name:=btrim(i->>'nome'); name:=receipt_name; quantity:=(i->>'qtd')::numeric; price:=(i->>'preco')::numeric; pid:=NULL;
  IF (quantity IS NOT NULL AND (quantity<=0 OR quantity>1000000)) OR (price IS NOT NULL AND (price<0 OR price>9999999999.99)) OR (_action='aprovar' AND (quantity IS NULL OR price IS NULL)) THEN RAISE EXCEPTION 'Informe quantidade e preço de cada item'; END IF;
  include_stock:=COALESCE((i->>'novo')::boolean,false) OR i->>'estoque_id' IS NOT NULL;
  IF include_stock AND NOT public.module_access('estoque') THEN RAISE EXCEPTION 'Sem acesso ao Estoque'; END IF;
  IF i->>'estoque_id' IS NOT NULL THEN
   IF (i->>'novo')::boolean THEN RAISE EXCEPTION 'Escolha associação ou novo produto'; END IF;
   SELECT id,nome INTO pid,name FROM public.estoque WHERE id=(i->>'estoque_id')::uuid AND grupo_id=r.grupo_id FOR UPDATE;
   IF pid IS NULL THEN RAISE EXCEPTION 'Produto não pertence ao grupo'; END IF;
  ELSIF (i->>'novo')::boolean THEN
   name:=btrim(COALESCE(i->>'nome_estoque',receipt_name));
   IF length(name) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Informe o nome do novo produto'; END IF;
   IF EXISTS(SELECT 1 FROM public.estoque WHERE grupo_id=r.grupo_id AND lower(btrim(nome))=lower(name)) THEN RAISE EXCEPTION 'Produto já existe; associe ao Estoque'; END IF;
   IF _action='aprovar' THEN INSERT INTO public.estoque(grupo_id,nome,qtd,padrao) VALUES(r.grupo_id,name,0,quantity) RETURNING id INTO pid; END IF;
  END IF;
  reviewed_items:=reviewed_items||jsonb_build_array(i||jsonb_build_object('estoque_id',pid,'nome_estoque',name));
  history_items:=history_items||jsonb_build_array(jsonb_build_object('nome',name,'nome_cupom',receipt_name,'qtd',quantity,'preco',price,'estoque_id',pid,'estoque_incluir',include_stock));
  IF _action='aprovar' AND pid IS NOT NULL THEN
   INSERT INTO public.telegram_product_links(grupo_id,nome_cupom,estoque_id) VALUES(r.grupo_id,lower(btrim(receipt_name)),pid) ON CONFLICT(grupo_id,nome_cupom) DO UPDATE SET estoque_id=EXCLUDED.estoque_id,updated_at=now();
  END IF;
 END LOOP;
 IF _action='aprovar' THEN
  INSERT INTO public.lancamentos(grupo_id,tipo,descricao,valor,data,pago,conta,destino,origem_modulo,criado_por) VALUES(r.grupo_id,'debito',btrim(_descricao),round(_valor,2),_data,true,_conta,'geral','feira',auth.uid()) RETURNING id INTO lid;
  INSERT INTO public.feira_historico(grupo_id,total,itens,pagamento,lancamento_id,data_compra,local) VALUES(r.grupo_id,round(_valor,2),history_items,_conta,lid,_data,btrim(_local)) RETURNING id INTO hid;
 END IF;
 UPDATE public.telegram_reviews SET valor=round(_valor,2),data=_data,descricao=btrim(_descricao),beneficiario=btrim(_local),conta=_conta,categoria=_categoria,produtos=reviewed_items,pago=(_action='aprovar'),status=CASE WHEN _action='aprovar' THEN 'aprovado' ELSE 'pendente' END,lancamento_id=lid,feira_historico_id=hid,produtos_destino=CASE WHEN _action='aprovar' THEN 'estoque' ELSE NULL END,produtos_importados_at=CASE WHEN _action='aprovar' THEN now() ELSE NULL END,reviewed_at=CASE WHEN _action='aprovar' THEN now() ELSE NULL END WHERE id=_id;
 RETURN lid;
END $$;
REVOKE ALL ON FUNCTION public.telegram_receipt_action(uuid,text,numeric,date,text,text,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.telegram_receipt_action(uuid,text,numeric,date,text,text,text,text,jsonb) TO authenticated;
CREATE FUNCTION public.telegram_quick_action(_id uuid,_telegram bigint,_chat bigint,_action text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.telegram_reviews; l public.telegram_links; lid uuid; mid uuid; today date:=(now() AT TIME ZONE 'America/Fortaleza')::date; paid boolean; wallet text;
BEGIN
 SELECT * INTO l FROM public.telegram_links WHERE telegram_user_id=_telegram AND chat_id=_chat;
 IF NOT FOUND OR NOT public.telegram_sender_allowed(l.user_id,l.grupo_id) THEN RAISE EXCEPTION 'Conta não vinculada ou acesso removido'; END IF;
 SELECT * INTO r FROM public.telegram_reviews WHERE id=_id AND user_id=l.user_id AND grupo_id=l.grupo_id AND chat_id=_chat FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Documento indisponível'; END IF;
 IF _action NOT IN ('dinheiro','alimentacao','refeicao','moto','pendencia','descartar') THEN RAISE EXCEPTION 'Ação inválida'; END IF;
 IF r.status<>'pendente' THEN RETURN jsonb_build_object('status',r.status,'conta',r.conta,'pago',r.pago); END IF;
 IF _action='descartar' THEN UPDATE public.telegram_reviews SET status='descartado',reviewed_at=now() WHERE id=_id; RETURN jsonb_build_object('status','descartado'); END IF;
 IF r.documento='cupom' OR jsonb_array_length(r.produtos)>0 THEN RAISE EXCEPTION 'Confirme os produtos no MAR IA'; END IF;
 IF r.extraction_status<>'concluido' OR r.valor IS NULL OR r.valor<=0 OR r.valor>9999999999.99 OR r.data IS NULL OR r.data<DATE '2000-01-01' OR r.data>DATE '2100-12-31' OR length(btrim(r.descricao)) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Revise os dados no MAR IA'; END IF;
 IF r.documento='boleto' AND r.data>today AND _action<>'pendencia' THEN RAISE EXCEPTION 'Boleto futuro deve ser salvo como pendência'; END IF;
 IF _action='pendencia' AND (r.documento<>'boleto' OR r.data<=today) THEN RAISE EXCEPTION 'Pendência rápida disponível para boleto futuro'; END IF;
 paid:=_action<>'pendencia'; wallet:=CASE WHEN _action IN ('pendencia','moto') THEN 'dinheiro' ELSE _action END;
 IF _action='moto' THEN
  IF NOT (l.user_id='3f3f6b62-d686-4451-b75f-a108adfb813d'::uuid OR COALESCE((SELECT moto FROM public.user_access WHERE user_id=l.user_id),true)) THEN RAISE EXCEPTION 'Sem acesso à Moto'; END IF;
  INSERT INTO public.moto_despesas(grupo_id,descricao,valor,data,conta,criado_por) VALUES(r.grupo_id,r.descricao,r.valor,r.data,'dinheiro',l.user_id) RETURNING id INTO mid;
 ELSE
  INSERT INTO public.lancamentos(grupo_id,tipo,descricao,valor,data,pago,conta,destino,origem_modulo,criado_por) VALUES(r.grupo_id,'debito',r.descricao,r.valor,r.data,paid,wallet,'geral','financas',l.user_id) RETURNING id INTO lid;
 END IF;
 UPDATE public.telegram_reviews SET status='aprovado',pago=paid,conta=wallet,lancamento_id=lid,moto_despesa_id=mid,reviewed_at=now() WHERE id=_id;
 RETURN jsonb_build_object('status','aprovado','conta',CASE WHEN mid IS NOT NULL THEN 'moto' ELSE wallet END,'pago',paid);
END $$;
REVOKE ALL ON FUNCTION public.telegram_quick_action(uuid,bigint,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_quick_action(uuid,bigint,bigint,text) TO service_role;
DO $block$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef('public.telegram_review_action(uuid,text,numeric,date,text,text,text,boolean)'::regprocedure) INTO d;
 d:=replace(d,'IF _action=''aprovar'' THEN INSERT','IF _action=''aprovar'' AND (jsonb_array_length(r.produtos)>0 OR r.documento=''cupom'') AND r.produtos_destino IS NULL THEN RAISE EXCEPTION ''Confirme a compra completa e seus produtos''; END IF; IF _action=''aprovar'' THEN INSERT');
 EXECUTE d;
 SELECT pg_get_functiondef('public.telegram_products_action(uuid,text,jsonb)'::regprocedure) INTO d;
 d:=replace(d,'IF _action<>''salvar'' THEN','IF _action<>''salvar'' AND r.status=''pendente'' THEN RAISE EXCEPTION ''Aprove a compra completa no MAR IA''; END IF; IF _action<>''salvar'' THEN');
 EXECUTE d;
END $block$;