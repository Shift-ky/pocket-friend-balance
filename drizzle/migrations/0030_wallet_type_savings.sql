ALTER TABLE public.carteiras DROP CONSTRAINT IF EXISTS carteiras_tipo_check;
ALTER TABLE public.carteiras
  ADD CONSTRAINT carteiras_tipo_check
  CHECK (tipo IN ('financeiro', 'beneficio', 'poupanca'));

CREATE OR REPLACE FUNCTION public.validar_meta()
RETURNS trigger
LANGUAGE plpgsql
SET search_path=public
AS $$
DECLARE w public.carteiras;
BEGIN
  NEW.nome := btrim(NEW.nome);
  SELECT * INTO w
  FROM public.carteiras
  WHERE id = NEW.carteira_id AND grupo_id = NEW.grupo_id;

  IF w.id IS NULL
     OR w.tipo NOT IN ('financeiro', 'poupanca')
     OR w.legado IS NOT DISTINCT FROM 'gasolina'
     OR length(NEW.nome) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Escolha uma carteira financeira ou poupança para a meta';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.grupo_id IS DISTINCT FROM OLD.grupo_id THEN
    RAISE EXCEPTION 'Grupo não pode mudar';
  END IF;

  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION public.validar_carteira_lancamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE w public.carteiras;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.transferencia_id IS NOT NULL THEN
    RAISE EXCEPTION 'Transferência conciliada não pode ser editada isoladamente';
  END IF;

  IF NEW.carteira_id IS NULL THEN
    SELECT id INTO NEW.carteira_id
    FROM public.carteiras
    WHERE grupo_id = NEW.grupo_id AND legado = NEW.conta;
  END IF;

  SELECT * INTO w
  FROM public.carteiras
  WHERE id = NEW.carteira_id AND grupo_id = NEW.grupo_id;

  IF w.id IS NULL THEN
    RAISE EXCEPTION 'Carteira não pertence ao grupo';
  END IF;

  IF w.legado = 'gasolina' AND auth.uid() IS NOT NULL AND NOT public.module_access('moto') THEN
    RAISE EXCEPTION 'Sem acesso à Moto/Gasolina';
  END IF;

  IF NEW.conta IS DISTINCT FROM
    (CASE WHEN w.legado IN ('alimentacao', 'refeicao') THEN w.legado ELSE 'dinheiro' END) THEN
    RAISE EXCEPTION 'Carteira e conta incompatíveis';
  END IF;

  IF NEW.origem_modulo = 'feira' AND TG_OP = 'INSERT'
     AND (NOT w.na_feira OR w.moeda <> 'BRL' OR w.legado = 'gasolina'
          OR EXISTS (SELECT 1 FROM public.metas WHERE carteira_id = w.id)) THEN
    RAISE EXCEPTION 'Carteira não disponível na Feira';
  END IF;

  IF NEW.fonte = 'fixa'
     AND (NOT w.nas_fixas OR w.moeda <> 'BRL'
          OR EXISTS (SELECT 1 FROM public.metas WHERE carteira_id = w.id)) THEN
    RAISE EXCEPTION 'Carteira aceita somente lançamentos manuais';
  END IF;

  IF NEW.transferencia_id IS NOT NULL
     AND (w.tipo NOT IN ('financeiro', 'poupanca')
          OR w.moeda <> 'BRL'
          OR EXISTS (SELECT 1 FROM public.metas WHERE carteira_id = w.id)
          OR NEW.tipo NOT IN ('credito', 'debito')
          OR NOT NEW.pago
          OR NEW.destino <> 'geral'
          OR NEW.origem_modulo <> 'financas') THEN
    RAISE EXCEPTION 'Carteira não elegível para transferência';
  END IF;

  RETURN NEW;
END
$$;
