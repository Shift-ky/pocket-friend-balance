CREATE OR REPLACE FUNCTION public.sync_stock_name() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 NEW.nome := btrim(NEW.nome);
 IF NEW.nome = '' THEN RAISE EXCEPTION 'Informe o nome do produto.'; END IF;
 IF NEW.nome IS NOT DISTINCT FROM OLD.nome THEN RETURN NEW; END IF;
 IF EXISTS (SELECT 1 FROM public.estoque WHERE grupo_id = NEW.grupo_id AND id <> NEW.id AND lower(btrim(nome)) = lower(NEW.nome)) THEN
  RAISE EXCEPTION 'Já existe um produto com esse nome no estoque.';
 END IF;
 IF lower(btrim(NEW.nome)) <> lower(btrim(OLD.nome)) AND EXISTS (SELECT 1 FROM public.feira_itens WHERE grupo_id = NEW.grupo_id AND lower(btrim(nome)) = lower(NEW.nome)) THEN
  RAISE EXCEPTION 'Já existe um produto com esse nome na cesta de compras.';
 END IF;
 UPDATE public.feira_itens SET nome = NEW.nome WHERE grupo_id = NEW.grupo_id AND lower(btrim(nome)) = lower(btrim(OLD.nome));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_stock_name() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER stock_name_sync BEFORE UPDATE OF nome ON public.estoque FOR EACH ROW EXECUTE FUNCTION public.sync_stock_name();