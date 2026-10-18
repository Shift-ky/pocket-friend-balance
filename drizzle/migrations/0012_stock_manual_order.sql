ALTER TABLE public.estoque ADD COLUMN ordem integer;
CREATE OR REPLACE FUNCTION public.ordenar_estoque(_grupo_id uuid, _ids uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE expected integer; changed integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.e_membro(_grupo_id) OR NOT public.module_access('estoque') THEN RAISE EXCEPTION 'Sem acesso ao estoque'; END IF;
 PERFORM id FROM public.estoque WHERE grupo_id = _grupo_id ORDER BY id FOR UPDATE;
 SELECT count(*) INTO expected FROM public.estoque WHERE grupo_id = _grupo_id;
 IF cardinality(_ids) IS DISTINCT FROM expected OR (SELECT count(DISTINCT id) FROM unnest(_ids) AS t(id)) <> expected THEN RAISE EXCEPTION 'O estoque mudou. Atualize e tente novamente.'; END IF;
 UPDATE public.estoque AS e SET ordem = t.position::integer FROM unnest(_ids) WITH ORDINALITY AS t(id, position) WHERE e.id = t.id AND e.grupo_id = _grupo_id;
 GET DIAGNOSTICS changed = ROW_COUNT;
 IF changed <> expected THEN RAISE EXCEPTION 'Não foi possível salvar a ordem'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.ordenar_estoque(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ordenar_estoque(uuid, uuid[]) TO authenticated;