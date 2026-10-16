ALTER TABLE public.feira_historico ADD COLUMN pagamento text NOT NULL DEFAULT 'nenhum';
ALTER TABLE public.feira_historico ADD COLUMN lancamento_id uuid;