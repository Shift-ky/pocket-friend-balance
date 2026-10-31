ALTER TABLE public.user_appearance
  ADD COLUMN dashboard_preferences jsonb NOT NULL DEFAULT '{}'::jsonb
  CHECK (jsonb_typeof(dashboard_preferences) = 'object');
