-- Remover a constraint antiga que estava limitando os tipos
ALTER TABLE public.centros_custo DROP CONSTRAINT IF EXISTS centros_custo_tipo_check;

-- Adicionar nova constraint com os tipos corretos usados no formulário
ALTER TABLE public.centros_custo ADD CONSTRAINT centros_custo_tipo_check 
CHECK (tipo IN ('operacional', 'administrativo', 'comercial', 'financeiro', 'departamento', 'projeto') OR tipo IS NULL);