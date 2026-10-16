CREATE TABLE public.estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  qtd numeric NOT NULL DEFAULT 0,
  padrao numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque TO authenticated;
GRANT ALL ON public.estoque TO service_role;
ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "membros estoque" ON public.estoque FOR ALL TO authenticated USING (public.e_membro(grupo_id)) WITH CHECK (public.e_membro(grupo_id));
ALTER PUBLICATION supabase_realtime ADD TABLE public.estoque;