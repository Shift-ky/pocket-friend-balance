DROP POLICY IF EXISTS "membros historico" ON public.feira_historico;
CREATE POLICY "membros leem historico" ON public.feira_historico FOR SELECT TO authenticated USING (public.e_membro(grupo_id));
CREATE POLICY "membros criam historico" ON public.feira_historico FOR INSERT TO authenticated WITH CHECK (public.e_membro(grupo_id));
CREATE POLICY "editar historico" ON public.feira_historico FOR UPDATE TO authenticated
  USING (public.e_membro(grupo_id) AND (pagamento = 'nenhum' OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (public.e_membro(grupo_id));
CREATE POLICY "excluir historico" ON public.feira_historico FOR DELETE TO authenticated
  USING (public.e_membro(grupo_id) AND (pagamento = 'nenhum' OR public.has_role(auth.uid(), 'admin')));