-- Add tipo_operacao column to centros_custo
ALTER TABLE public.centros_custo 
ADD COLUMN IF NOT EXISTS tipo_operacao VARCHAR(20) DEFAULT 'despesa';

-- Add check constraint for valid values
ALTER TABLE public.centros_custo DROP CONSTRAINT IF EXISTS centros_custo_tipo_operacao_check;

ALTER TABLE public.centros_custo ADD CONSTRAINT centros_custo_tipo_operacao_check 
CHECK (tipo_operacao IN ('receita', 'despesa', 'ambos'));

-- Update existing records to have a default value if null (though default is set above)
UPDATE public.centros_custo SET tipo_operacao = 'despesa' WHERE tipo_operacao IS NULL;

-- Make it not null
ALTER TABLE public.centros_custo ALTER COLUMN tipo_operacao SET NOT NULL;

-- Add comment
COMMENT ON COLUMN public.centros_custo.tipo_operacao IS 'Classificação do centro de custo: receita (entrada), despesa (saída) ou ambos';
