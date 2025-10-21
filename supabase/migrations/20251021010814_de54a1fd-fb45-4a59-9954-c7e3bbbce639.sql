-- Adicionar campos separados para dados bancários
ALTER TABLE public.contas_bancarias 
ADD COLUMN IF NOT EXISTS banco VARCHAR(100),
ADD COLUMN IF NOT EXISTS agencia VARCHAR(20),
ADD COLUMN IF NOT EXISTS conta VARCHAR(20),
ADD COLUMN IF NOT EXISTS digito VARCHAR(5);

-- Migrar dados existentes do numero_conta se houver
UPDATE public.contas_bancarias 
SET conta = numero_conta 
WHERE conta IS NULL AND numero_conta IS NOT NULL;