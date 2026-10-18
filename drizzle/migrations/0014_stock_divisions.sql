CREATE TABLE public.estoque_divisoes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 grupo_id uuid NOT NULL REFERENCES public.grupos(id),
 nome text NOT NULL CHECK (length(btrim(nome)) BETWEEN 1 AND 60),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (id, grupo_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_divisoes TO authenticated;
GRANT ALL ON public.estoque_divisoes TO service_role;
ALTER TABLE public.estoque_divisoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members stock divisions" ON public.estoque_divisoes FOR ALL TO authenticated USING (public.e_membro(grupo_id)) WITH CHECK (public.e_membro(grupo_id));
CREATE POLICY "stock module divisions" ON public.estoque_divisoes AS RESTRICTIVE FOR ALL TO authenticated USING (public.module_access('estoque')) WITH CHECK (public.module_access('estoque'));
CREATE UNIQUE INDEX estoque_divisoes_nome ON public.estoque_divisoes (grupo_id, lower(btrim(nome)));
ALTER TABLE public.estoque ADD COLUMN divisao_id uuid;
ALTER TABLE public.estoque ADD CONSTRAINT estoque_divisao_grupo FOREIGN KEY (divisao_id, grupo_id) REFERENCES public.estoque_divisoes(id, grupo_id) ON DELETE SET NULL (divisao_id);
CREATE INDEX estoque_divisao_idx ON public.estoque (divisao_id, grupo_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.estoque_divisoes;