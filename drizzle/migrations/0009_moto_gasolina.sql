ALTER TABLE public.lancamentos ADD COLUMN destino text NOT NULL DEFAULT 'geral' CHECK (destino IN ('geral', 'gasolina'));
ALTER TABLE public.lancamentos ADD CONSTRAINT lancamentos_gasolina_dinheiro CHECK (destino <> 'gasolina' OR (tipo = 'debito' AND conta = 'dinheiro' AND pago = true));
CREATE TABLE public.moto_despesas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 grupo_id uuid NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
 descricao text NOT NULL CHECK (length(trim(descricao)) > 0),
 valor numeric(12,2) NOT NULL CHECK (valor > 0),
 data date NOT NULL DEFAULT current_date,
 conta text NOT NULL DEFAULT 'dinheiro' CHECK (conta = 'dinheiro'),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moto_despesas TO authenticated;
GRANT ALL ON public.moto_despesas TO service_role;
ALTER TABLE public.moto_despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "membros leem moto" ON public.moto_despesas FOR SELECT TO authenticated USING (public.e_membro(grupo_id));
CREATE POLICY "membros registram moto" ON public.moto_despesas FOR INSERT TO authenticated WITH CHECK (public.e_membro(grupo_id));
CREATE POLICY "membros editam moto" ON public.moto_despesas FOR UPDATE TO authenticated USING (public.e_membro(grupo_id)) WITH CHECK (public.e_membro(grupo_id));
CREATE POLICY "admin exclui moto" ON public.moto_despesas FOR DELETE TO authenticated USING (public.e_membro(grupo_id) AND public.has_role(auth.uid(), 'admin'::public.app_role));
ALTER PUBLICATION supabase_realtime ADD TABLE public.moto_despesas;