CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE TABLE public.contas_fixas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), grupo_id uuid NOT NULL REFERENCES public.grupos(id),
 criado_por uuid NOT NULL DEFAULT auth.uid(), descricao text NOT NULL,
 modalidade text NOT NULL CHECK (modalidade IN ('credito','debito','gasolina')),
 conta text NOT NULL DEFAULT 'dinheiro' CHECK (conta IN ('dinheiro','alimentacao','refeicao')),
 valor numeric(14,2) NOT NULL CHECK (valor > 0), dia integer NOT NULL CHECK (dia BETWEEN 1 AND 31),
 inicio date NOT NULL, fim date, ativa boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (fim IS NULL OR fim >= inicio), CHECK (modalidade <> 'gasolina' OR conta = 'dinheiro')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_fixas TO authenticated;
GRANT ALL ON public.contas_fixas TO service_role;
ALTER TABLE public.contas_fixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixas_read ON public.contas_fixas FOR SELECT TO authenticated USING (public.e_membro(grupo_id) AND public.module_access('financas') AND (modalidade <> 'gasolina' OR public.module_access('moto')));
CREATE POLICY fixas_insert ON public.contas_fixas FOR INSERT TO authenticated WITH CHECK (public.e_membro(grupo_id) AND criado_por = auth.uid() AND public.module_access('financas') AND (modalidade <> 'gasolina' OR public.module_access('moto')));
CREATE POLICY fixas_update ON public.contas_fixas FOR UPDATE TO authenticated USING (public.e_membro(grupo_id) AND public.module_access('financas') AND (modalidade <> 'gasolina' OR public.module_access('moto'))) WITH CHECK (public.e_membro(grupo_id) AND public.module_access('financas') AND (modalidade <> 'gasolina' OR public.module_access('moto')));
CREATE POLICY fixas_delete ON public.contas_fixas FOR DELETE TO authenticated USING (public.e_membro(grupo_id) AND public.module_access('financas') AND public.has_role(auth.uid(), 'admin') AND (modalidade <> 'gasolina' OR public.module_access('moto')));
CREATE TABLE public.contas_fixas_ocorrencias (
 fixa_id uuid NOT NULL REFERENCES public.contas_fixas(id) ON DELETE CASCADE,
 competencia date NOT NULL, lancamento_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (fixa_id, competencia)
);
GRANT SELECT ON public.contas_fixas_ocorrencias TO authenticated;
GRANT ALL ON public.contas_fixas_ocorrencias TO service_role;
ALTER TABLE public.contas_fixas_ocorrencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY ocorrencias_read ON public.contas_fixas_ocorrencias FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.contas_fixas f WHERE f.id = fixa_id));
CREATE FUNCTION public.data_conta_fixa(_mes date, _dia integer) RETURNS date LANGUAGE sql IMMUTABLE SET search_path = public AS $$
 SELECT date_trunc('month',_mes)::date + (least(_dia,extract(day FROM (date_trunc('month',_mes) + interval '1 month - 1 day'))::integer)-1);
$$;
CREATE FUNCTION public.gerar_contas_fixas(_id uuid DEFAULT NULL) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f record; mes date; vencimento date; lid uuid; n integer := 0; hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
 FOR f IN SELECT c.* FROM public.contas_fixas c WHERE c.ativa AND c.inicio <= hoje AND (_id IS NULL OR c.id = _id)
 AND EXISTS (SELECT 1 FROM public.grupo_membros m WHERE m.grupo_id = c.grupo_id AND m.user_id = c.criado_por)
 AND (c.criado_por = '3f3f6b62-d686-4451-b75f-a108adfb813d'::uuid OR COALESCE((SELECT a.financas AND (c.modalidade <> 'gasolina' OR a.moto) FROM public.user_access a WHERE a.user_id = c.criado_por), true))
 ORDER BY c.id FOR UPDATE LOOP
  FOR mes IN SELECT generate_series(date_trunc('month',f.inicio), date_trunc('month',least(hoje,coalesce(f.fim,hoje))),interval '1 month')::date LOOP
   vencimento := public.data_conta_fixa(mes,f.dia);
   IF vencimento < f.inicio OR vencimento > hoje OR (f.fim IS NOT NULL AND vencimento > f.fim) THEN CONTINUE; END IF;
   lid := gen_random_uuid();
   INSERT INTO public.contas_fixas_ocorrencias(fixa_id,competencia,lancamento_id) VALUES(f.id,mes,lid) ON CONFLICT DO NOTHING;
   IF NOT FOUND THEN CONTINUE; END IF;
   INSERT INTO public.lancamentos(id,grupo_id,tipo,descricao,valor,data,pago,conta,destino,origem_modulo,criado_por)
   VALUES(lid,f.grupo_id,CASE WHEN f.modalidade = 'credito' THEN 'credito' ELSE 'debito' END,f.descricao,f.valor,vencimento,f.modalidade <> 'debito',f.conta,CASE WHEN f.modalidade = 'gasolina' THEN 'gasolina' ELSE 'geral' END,'financas',f.criado_por);
   n := n + 1;
  END LOOP;
 END LOOP;
 RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.gerar_contas_fixas(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_contas_fixas(uuid) TO service_role;
CREATE FUNCTION public.validar_conta_fixa() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 NEW.descricao := btrim(NEW.descricao);
 IF NEW.descricao = '' THEN RAISE EXCEPTION 'Informe a descrição'; END IF;
 IF NEW.inicio < DATE '2000-01-01' THEN RAISE EXCEPTION 'Informe início a partir de 2000'; END IF;
 IF TG_OP = 'UPDATE' AND (NEW.grupo_id IS DISTINCT FROM OLD.grupo_id OR NEW.criado_por IS DISTINCT FROM OLD.criado_por OR NEW.id IS DISTINCT FROM OLD.id) THEN RAISE EXCEPTION 'Não é permitido mudar o grupo ou autor'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER validar_fixa BEFORE INSERT OR UPDATE ON public.contas_fixas FOR EACH ROW EXECUTE FUNCTION public.validar_conta_fixa();
CREATE FUNCTION public.processar_conta_fixa() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 PERFORM public.gerar_contas_fixas(NEW.id);
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.processar_conta_fixa() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER processar_fixa AFTER INSERT OR UPDATE ON public.contas_fixas FOR EACH ROW EXECUTE FUNCTION public.processar_conta_fixa();
COMMENT ON TABLE public.contas_fixas_ocorrencias IS 'Monthly immutable generation receipts prevent duplicates even after a generated entry is deleted. Schedule edits affect only ungenerated months.';