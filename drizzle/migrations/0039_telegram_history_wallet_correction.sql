CREATE OR REPLACE FUNCTION public.telegram_edit_approved_launch(_id uuid, _valor numeric, _data date, _descricao text, _conta text, _categoria text, _carteira_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.telegram_reviews; l public.lancamentos; w public.carteiras; target uuid; account text;
BEGIN
 SELECT * INTO r FROM public.telegram_reviews WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR r.user_id<>auth.uid() OR NOT public.e_membro(r.grupo_id) OR NOT public.module_access('financas') THEN RAISE EXCEPTION 'Sem acesso à edição deste lançamento'; END IF;
 IF r.status<>'aprovado' OR r.lancamento_id IS NULL THEN RAISE EXCEPTION 'Somente lançamentos aprovados podem ser editados'; END IF;
 IF _valor IS NULL OR _valor<=0 OR _valor>9999999999.99 OR _data IS NULL OR _data<DATE '2000-01-01' OR _data>DATE '2100-12-31' OR _descricao IS NULL OR length(btrim(_descricao)) NOT BETWEEN 1 AND 200 OR _conta IS NULL OR _conta NOT IN ('dinheiro','alimentacao','refeicao') OR _categoria IS NULL OR length(_categoria)>100 THEN RAISE EXCEPTION 'Revise descrição, valor, data, carteira e categoria'; END IF;
 SELECT * INTO l FROM public.lancamentos WHERE id=r.lancamento_id AND grupo_id=r.grupo_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lançamento vinculado não encontrado'; END IF;
 target:=_carteira_id;
 IF target IS NULL THEN
  IF l.conta=_conta AND l.carteira_id IS NOT NULL THEN target:=l.carteira_id;
  ELSE SELECT id INTO target FROM public.carteiras WHERE grupo_id=r.grupo_id AND legado=_conta; END IF;
 END IF;
 SELECT * INTO w FROM public.carteiras WHERE id=target AND grupo_id=r.grupo_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Carteira não pertence ao grupo'; END IF;
 IF target IS DISTINCT FROM l.carteira_id AND (w.moeda<>'BRL' OR w.legado='gasolina' OR EXISTS(SELECT 1 FROM public.metas WHERE carteira_id=w.id) OR (r.feira_historico_id IS NOT NULL AND NOT w.na_feira)) THEN RAISE EXCEPTION 'Carteira não disponível para este lançamento do Telegram'; END IF;
 account:=CASE WHEN w.legado IN ('alimentacao','refeicao') THEN w.legado ELSE 'dinheiro' END;
 UPDATE public.lancamentos SET descricao=btrim(_descricao),valor=round(_valor,2),data=_data,conta=account,carteira_id=target,categoria=_categoria WHERE id=l.id AND grupo_id=r.grupo_id;
 IF r.feira_historico_id IS NOT NULL THEN
  UPDATE public.feira_historico SET total=round(_valor,2),data_compra=_data,pagamento=account,carteira_id=target WHERE id=r.feira_historico_id AND grupo_id=r.grupo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Histórico da compra vinculada não encontrado'; END IF;
 END IF;
 UPDATE public.telegram_reviews SET valor=round(_valor,2),data=_data,descricao=btrim(_descricao),conta=account,categoria=_categoria WHERE id=r.id;
 RETURN l.id;
END; $$;
REVOKE ALL ON FUNCTION public.telegram_edit_approved_launch(uuid,numeric,date,text,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.telegram_edit_approved_launch(uuid,numeric,date,text,text,text,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.telegram_edit_approved_launch(_id uuid,_valor numeric,_data date,_descricao text,_conta text,_categoria text)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$ SELECT public.telegram_edit_approved_launch(_id,_valor,_data,_descricao,_conta,_categoria,NULL::uuid); $$;
REVOKE ALL ON FUNCTION public.telegram_edit_approved_launch(uuid,numeric,date,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.telegram_edit_approved_launch(uuid,numeric,date,text,text,text) TO authenticated;