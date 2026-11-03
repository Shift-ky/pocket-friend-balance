CREATE OR REPLACE FUNCTION public.editar_pagamento_historico(_lancamento_id uuid,_valor numeric,_data date,_descricao text,_categoria text,_carteira_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.lancamentos; w public.carteiras; r public.telegram_reviews; account text;
BEGIN
 SELECT * INTO l FROM public.lancamentos WHERE id=_lancamento_id FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR NOT public.e_membro(l.grupo_id) OR NOT public.module_access('financas') OR (l.origem_modulo='feira' AND NOT public.module_access('feira')) THEN RAISE EXCEPTION 'Sem acesso à edição deste lançamento'; END IF;
 IF l.transferencia_id IS NOT NULL OR l.destino='gasolina' OR l.tipo NOT IN ('credito','debito') THEN RAISE EXCEPTION 'Este lançamento não permite trocar a forma de pagamento'; END IF;
 IF _valor IS NULL OR _valor<=0 OR _valor>9999999999.99 OR _data IS NULL OR _data<DATE '2000-01-01' OR _data>DATE '2100-12-31' OR _descricao IS NULL OR length(btrim(_descricao)) NOT BETWEEN 1 AND 200 OR _categoria IS NULL OR length(_categoria)>100 THEN RAISE EXCEPTION 'Revise descrição, valor, data e categoria'; END IF;
 SELECT * INTO w FROM public.carteiras WHERE id=_carteira_id AND grupo_id=l.grupo_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Carteira não pertence ao grupo'; END IF;
 SELECT * INTO r FROM public.telegram_reviews WHERE lancamento_id=l.id AND status='aprovado' FOR UPDATE;
 IF w.id IS DISTINCT FROM l.carteira_id AND (w.legado='gasolina' OR ((r.id IS NOT NULL OR l.origem_modulo='feira') AND (w.moeda<>'BRL' OR EXISTS(SELECT 1 FROM public.metas WHERE carteira_id=w.id))) OR (l.origem_modulo='feira' AND NOT w.na_feira)) THEN RAISE EXCEPTION 'Carteira não disponível para este pagamento'; END IF;
 account:=CASE WHEN w.legado IN ('alimentacao','refeicao') THEN w.legado ELSE 'dinheiro' END;
 UPDATE public.lancamentos SET descricao=btrim(_descricao),valor=round(_valor,2),data=_data,conta=account,carteira_id=w.id,categoria=_categoria WHERE id=l.id;
 UPDATE public.feira_historico SET total=round(_valor,2),data_compra=_data,pagamento=account,carteira_id=w.id WHERE grupo_id=l.grupo_id AND lancamento_id=l.id;
 IF r.id IS NOT NULL THEN UPDATE public.telegram_reviews SET valor=round(_valor,2),data=_data,descricao=btrim(_descricao),conta=account,categoria=_categoria WHERE id=r.id; END IF;
 RETURN l.id;
END; $$;
REVOKE ALL ON FUNCTION public.editar_pagamento_historico(uuid,numeric,date,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.editar_pagamento_historico(uuid,numeric,date,text,text,uuid) TO authenticated;