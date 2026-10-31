ALTER TABLE public.user_appearance
  ADD COLUMN dashboard_order text[] NOT NULL DEFAULT ARRAY[]::text[];
