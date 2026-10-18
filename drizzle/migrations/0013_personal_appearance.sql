CREATE TABLE public.user_appearance (
  user_id uuid PRIMARY KEY,
  theme text NOT NULL DEFAULT 'original' CHECK (theme IN ('original', 'light', 'dark', 'rose')),
  background_path text,
  CONSTRAINT own_background_path CHECK (background_path IS NULL OR background_path LIKE user_id::text || '/%')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_appearance TO authenticated;
GRANT ALL ON public.user_appearance TO service_role;
ALTER TABLE public.user_appearance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own appearance" ON public.user_appearance FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Insert own appearance" ON public.user_appearance FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Update own appearance" ON public.user_appearance FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Delete own appearance" ON public.user_appearance FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Read own personal background" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'personal-backgrounds' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "Upload own personal background" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'personal-backgrounds' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp'));
CREATE POLICY "Remove own personal background" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'personal-backgrounds' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);