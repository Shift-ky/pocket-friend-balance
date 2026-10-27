REVOKE UPDATE ON public.telegram_reviews FROM authenticated;
ALTER FUNCTION public.telegram_review_action(uuid,text,numeric,date,text,text,text,boolean) SECURITY DEFINER;
CREATE FUNCTION public.telegram_sender_allowed(_user uuid,_grupo uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.grupo_membros WHERE user_id=_user AND grupo_id=_grupo) AND (_user='3f3f6b62-d686-4451-b75f-a108adfb813d'::uuid OR COALESCE((SELECT financas FROM public.user_access WHERE user_id=_user),true)); $$;
REVOKE ALL ON FUNCTION public.telegram_sender_allowed(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_sender_allowed(uuid,uuid) TO service_role;