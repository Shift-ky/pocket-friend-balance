ALTER TABLE public.user_appearance
  DROP CONSTRAINT IF EXISTS user_appearance_theme_check;

ALTER TABLE public.user_appearance
  ADD CONSTRAINT user_appearance_theme_check
  CHECK (theme IN (
    'original',
    'light',
    'dark',
    'rose',
    'elegante',
    'lavanda',
    'sage',
    'praia',
    'alegre'
  ));
