CREATE TABLE public.user_access (
 user_id uuid PRIMARY KEY,
 financas boolean NOT NULL DEFAULT true,
 moto boolean NOT NULL DEFAULT true,
 feira boolean NOT NULL DEFAULT true,
 estoque boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.user_access TO authenticated;
GRANT ALL ON public.user_access TO service_role;
ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_access ON public.user_access FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE OR REPLACE FUNCTION public.module_access(_module text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT auth.uid() IS NOT NULL AND CASE WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN true ELSE COALESCE((SELECT CASE _module WHEN 'financas' THEN a.financas WHEN 'moto' THEN a.moto WHEN 'feira' THEN a.feira WHEN 'estoque' THEN a.estoque ELSE false END FROM public.user_access a WHERE a.user_id = auth.uid()), _module IN ('financas','moto','feira','estoque')) END
$$;
REVOKE ALL ON FUNCTION public.module_access(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.module_access(text) TO authenticated;
CREATE POLICY access_lancamentos_read ON public.lancamentos AS RESTRICTIVE FOR SELECT TO authenticated USING (CASE WHEN destino = 'gasolina' THEN public.module_access('moto') ELSE public.module_access('financas') END);
CREATE POLICY access_lancamentos_insert ON public.lancamentos AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.module_access('financas') AND (destino <> 'gasolina' OR public.module_access('moto')));
CREATE POLICY access_lancamentos_update ON public.lancamentos AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.module_access('financas') AND (destino <> 'gasolina' OR public.module_access('moto'))) WITH CHECK (public.module_access('financas') AND (destino <> 'gasolina' OR public.module_access('moto')));
CREATE POLICY access_lancamentos_delete ON public.lancamentos AS RESTRICTIVE FOR DELETE TO authenticated USING (public.module_access('financas') AND (destino <> 'gasolina' OR public.module_access('moto')));
CREATE POLICY access_moto ON public.moto_despesas AS RESTRICTIVE FOR ALL TO authenticated USING (public.module_access('moto')) WITH CHECK (public.module_access('moto'));
CREATE POLICY access_feira ON public.feira_itens AS RESTRICTIVE FOR ALL TO authenticated USING (public.module_access('feira')) WITH CHECK (public.module_access('feira'));
CREATE POLICY access_history ON public.feira_historico AS RESTRICTIVE FOR ALL TO authenticated USING (public.module_access('feira')) WITH CHECK (public.module_access('feira'));
CREATE POLICY access_stock ON public.estoque AS RESTRICTIVE FOR ALL TO authenticated USING (public.module_access('estoque')) WITH CHECK (public.module_access('estoque'));
CREATE POLICY access_despesas ON public.despesas AS RESTRICTIVE FOR ALL TO authenticated USING (public.module_access('financas')) WITH CHECK (public.module_access('financas'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_access;
CREATE OR REPLACE FUNCTION public.sync_stock_purchase() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i jsonb; product_id uuid;
BEGIN
 IF NEW.pagamento = 'nenhum' THEN RETURN NEW; END IF;
 IF TG_OP = 'UPDATE' THEN IF OLD.pagamento <> 'nenhum' THEN RETURN NEW; END IF; END IF;
 FOR i IN SELECT value FROM jsonb_array_elements(NEW.itens) LOOP
  IF trim(i->>'nome') = '' OR COALESCE((i->>'qtd')::numeric,0) <= 0 THEN CONTINUE; END IF;
  SELECT id INTO product_id FROM public.estoque WHERE grupo_id=NEW.grupo_id AND lower(trim(nome))=lower(trim(i->>'nome')) LIMIT 1 FOR UPDATE;
  IF product_id IS NULL THEN INSERT INTO public.estoque(grupo_id,nome,qtd,padrao) VALUES(NEW.grupo_id,trim(i->>'nome'),(i->>'qtd')::numeric,(i->>'qtd')::numeric);
  ELSE UPDATE public.estoque SET qtd=qtd+(i->>'qtd')::numeric WHERE id=product_id; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER purchase_stock AFTER INSERT OR UPDATE ON public.feira_historico FOR EACH ROW EXECUTE FUNCTION public.sync_stock_purchase();
CREATE OR REPLACE FUNCTION public.sync_stock_list() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE missing numeric; list_id uuid; last_price numeric;
BEGIN
 missing=NEW.padrao-NEW.qtd;
 SELECT id INTO list_id FROM public.feira_itens WHERE grupo_id=NEW.grupo_id AND lower(trim(nome))=lower(trim(NEW.nome)) LIMIT 1;
 IF missing<=0 THEN IF list_id IS NOT NULL THEN DELETE FROM public.feira_itens WHERE id=list_id; END IF;
 ELSIF list_id IS NOT NULL THEN UPDATE public.feira_itens SET qtd=missing WHERE id=list_id;
 ELSE
 SELECT (i.value->>'preco')::numeric INTO last_price FROM public.feira_historico h CROSS JOIN LATERAL jsonb_array_elements(h.itens) i WHERE h.grupo_id=NEW.grupo_id AND h.pagamento<>'nenhum' AND lower(trim(i.value->>'nome'))=lower(trim(NEW.nome)) ORDER BY h.created_at DESC LIMIT 1;
 INSERT INTO public.feira_itens(grupo_id,nome,qtd,preco) VALUES(NEW.grupo_id,NEW.nome,missing,COALESCE(last_price,0));
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER stock_list AFTER UPDATE OF qtd,padrao ON public.estoque FOR EACH ROW EXECUTE FUNCTION public.sync_stock_list();
