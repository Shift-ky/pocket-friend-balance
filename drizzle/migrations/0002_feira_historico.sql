CREATE TABLE public.feira_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  total numeric NOT NULL DEFAULT 0,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feira_historico TO authenticated;
GRANT ALL ON public.feira_historico TO service_role;
ALTER TABLE public.feira_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "membros historico" ON public.feira_historico FOR ALL TO authenticated USING (public.e_membro(grupo_id)) WITH CHECK (public.e_membro(grupo_id));
ALTER PUBLICATION supabase_realtime ADD TABLE public.feira_historico;