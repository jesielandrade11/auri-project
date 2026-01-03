-- Add protection to prevent deletion of cost centers with linked categories

-- Create a function to check if a cost center has linked categories
CREATE OR REPLACE FUNCTION public.check_cost_center_has_categories()
RETURNS TRIGGER AS $$
DECLARE
  category_count INTEGER;
BEGIN
  -- Count categories linked to this cost center
  SELECT COUNT(*) INTO category_count
  FROM public.categorias
  WHERE centro_custo_id = OLD.id
    AND ativo = true;
  
  -- If there are linked categories, prevent deletion
  IF category_count > 0 THEN
    RAISE EXCEPTION 'Não é possível deletar este Centro de Custo pois ele possui % categoria(s) vinculada(s). Remova ou reatribua as categorias primeiro.', category_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before delete on centros_custo
DROP TRIGGER IF EXISTS prevent_cost_center_deletion_with_categories ON public.centros_custo;

CREATE TRIGGER prevent_cost_center_deletion_with_categories
  BEFORE DELETE ON public.centros_custo
  FOR EACH ROW
  EXECUTE FUNCTION public.check_cost_center_has_categories();

-- Also add a check for updates that set ativo = false (soft delete)
CREATE OR REPLACE FUNCTION public.check_cost_center_deactivation()
RETURNS TRIGGER AS $$
DECLARE
  category_count INTEGER;
BEGIN
  -- Only check if we're deactivating (setting ativo to false)
  IF NEW.ativo = false AND OLD.ativo = true THEN
    -- Count active categories linked to this cost center
    SELECT COUNT(*) INTO category_count
    FROM public.categorias
    WHERE centro_custo_id = OLD.id
      AND ativo = true;
    
    -- If there are linked active categories, prevent deactivation
    IF category_count > 0 THEN
      RAISE EXCEPTION 'Não é possível desativar este Centro de Custo pois ele possui % categoria(s) ativa(s) vinculada(s). Desative ou reatribua as categorias primeiro.', category_count;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before update on centros_custo
DROP TRIGGER IF EXISTS prevent_cost_center_deactivation_with_categories ON public.centros_custo;

CREATE TRIGGER prevent_cost_center_deactivation_with_categories
  BEFORE UPDATE ON public.centros_custo
  FOR EACH ROW
  EXECUTE FUNCTION public.check_cost_center_deactivation();
