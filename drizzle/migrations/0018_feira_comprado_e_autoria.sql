ALTER TABLE public.feira_itens ADD COLUMN qtd_comprada numeric NOT NULL DEFAULT 0;
UPDATE public.feira_itens SET qtd_comprada = qtd WHERE pego;
ALTER TABLE public.lancamentos ADD COLUMN criado_por uuid DEFAULT auth.uid();
ALTER TABLE public.moto_despesas ADD COLUMN criado_por uuid DEFAULT auth.uid();