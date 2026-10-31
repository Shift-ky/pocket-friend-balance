CREATE OR REPLACE FUNCTION public.telegram_edit_approved_launch(
  _id uuid, _valor numeric, _data date, _descricao text, _conta text, _categoria text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.telegram_reviews;
BEGIN
  SELECT * INTO r FROM public.telegram_reviews WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR r.user_id <> auth.uid()
     OR NOT public.e_membro(r.grupo_id) OR NOT public.module_access('financas') THEN
    RAISE EXCEPTION 'Sem acesso à edição deste lançamento';
  END IF;
  IF r.status <> 'aprovado' OR r.lancamento_id IS NULL THEN
    RAISE EXCEPTION 'Somente lançamentos aprovados podem ser editados';
  END IF;
  IF _valor IS NULL OR _valor <= 0 OR _valor > 9999999999.99
     OR _data IS NULL OR _data < DATE '2000-01-01' OR _data > DATE '2100-12-31'
     OR _descricao IS NULL OR length(btrim(_descricao)) NOT BETWEEN 1 AND 200
     OR _conta IS NULL OR _conta NOT IN ('dinheiro', 'alimentacao', 'refeicao')
     OR _categoria IS NULL OR length(_categoria) > 100 THEN
    RAISE EXCEPTION 'Revise descrição, valor, data, carteira e categoria';
  END IF;
  UPDATE public.lancamentos
  SET descricao = btrim(_descricao), valor = round(_valor, 2), data = _data, conta = _conta, categoria = _categoria
  WHERE id = r.lancamento_id AND grupo_id = r.grupo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lançamento vinculado não encontrado'; END IF;
  IF r.feira_historico_id IS NOT NULL THEN
    UPDATE public.feira_historico
    SET total = round(_valor, 2), data_compra = _data, pagamento = _conta
    WHERE id = r.feira_historico_id AND grupo_id = r.grupo_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Histórico da compra vinculada não encontrado'; END IF;
  END IF;
  UPDATE public.telegram_reviews
  SET valor = round(_valor, 2), data = _data, descricao = btrim(_descricao), conta = _conta, categoria = _categoria
  WHERE id = r.id;
  RETURN r.lancamento_id;
END;
$$;
REVOKE ALL ON FUNCTION public.telegram_edit_approved_launch(uuid, numeric, date, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.telegram_edit_approved_launch(uuid, numeric, date, text, text, text) TO authenticated;
