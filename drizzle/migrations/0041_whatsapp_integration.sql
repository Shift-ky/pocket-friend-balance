ALTER TABLE public.telegram_reviews
  ADD COLUMN source_channel text NOT NULL DEFAULT 'telegram' CHECK (source_channel IN ('telegram','whatsapp')),
  ADD COLUMN source_message_id text,
  ADD COLUMN sender_phone text;

CREATE UNIQUE INDEX telegram_reviews_source_message_unique
  ON public.telegram_reviews(source_channel, source_message_id)
  WHERE source_message_id IS NOT NULL;

CREATE TABLE public.whatsapp_links (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  grupo_id uuid NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  wa_id text UNIQUE,
  code_hash text UNIQUE,
  code_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_links_wa_id_format CHECK (wa_id IS NULL OR wa_id ~ '^[1-9][0-9]{6,14}$')
);

ALTER TABLE public.whatsapp_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_links FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.whatsapp_links TO service_role;

CREATE FUNCTION public.whatsapp_bind(_hash text, _wa_id text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.whatsapp_links;
BEGIN
  IF _wa_id !~ '^[1-9][0-9]{6,14}$' THEN RETURN false; END IF;
  SELECT * INTO l FROM public.whatsapp_links
    WHERE code_hash=_hash AND code_expires_at>now() FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS(
    SELECT 1 FROM public.grupo_membros WHERE user_id=l.user_id AND grupo_id=l.grupo_id
  ) THEN RETURN false; END IF;
  UPDATE public.whatsapp_links SET wa_id=_wa_id,code_hash=NULL,code_expires_at=NULL
    WHERE user_id=l.user_id;
  RETURN true;
EXCEPTION WHEN unique_violation THEN RETURN false;
END $$;

REVOKE ALL ON FUNCTION public.whatsapp_bind(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_bind(text,text) TO service_role;

