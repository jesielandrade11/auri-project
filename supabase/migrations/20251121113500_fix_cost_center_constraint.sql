-- Fix centros_custo tipo constraint to allow more types
ALTER TABLE public.centros_custo DROP CONSTRAINT IF EXISTS centros_custo_tipo_check;

-- Add new constraint with all possible types including 'departamento' used in install function
ALTER TABLE public.centros_custo ADD CONSTRAINT centros_custo_tipo_check 
CHECK (tipo IN ('operacional', 'administrativo', 'comercial', 'financeiro', 'departamento', 'projeto') OR tipo IS NULL);
