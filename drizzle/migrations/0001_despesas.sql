CREATE TABLE public.despesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  fornecedor text NOT NULL DEFAULT '',
  categoria text NOT NULL DEFAULT 'Outros',
  descricao text NOT NULL DEFAULT '',
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas TO authenticated;
GRANT ALL ON public.despesas TO service_role;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "membros despesas" ON public.despesas FOR ALL TO authenticated USING (public.e_membro(grupo_id)) WITH CHECK (public.e_membro(grupo_id));
ALTER PUBLICATION supabase_realtime ADD TABLE public.despesas;