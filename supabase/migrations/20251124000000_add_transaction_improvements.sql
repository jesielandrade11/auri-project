-- Migration: Add fields for transaction improvements
-- Date: 2024-11-24
-- Purpose: Support credit card differentiation, duplicate detection, and category mapping

-- Add is_credit_card flag to contas_bancarias
ALTER TABLE contas_bancarias 
ADD COLUMN IF NOT EXISTS is_credit_card BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN contas_bancarias.is_credit_card IS 'True if this account is a credit card, false for regular bank accounts';

-- Add categoria_original to transacoes (to store original category from bank)
ALTER TABLE transacoes
ADD COLUMN IF NOT EXISTS categoria_original TEXT;

-- Add possivel_duplicata flag to transacoes
ALTER TABLE transacoes
ADD COLUMN IF NOT EXISTS possivel_duplicata BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN transacoes.categoria_original IS 'Original category name from the bank/Pluggy API';
COMMENT ON COLUMN transacoes.possivel_duplicata IS 'True if this transaction might be a duplicate based on pluggy_transaction_id';

-- Update existing credit card accounts based on tipo_conta
-- This is a one-time data migration for existing records
UPDATE contas_bancarias
SET is_credit_card = true
WHERE nome_banco ILIKE '%cartão%' 
   OR nome_banco ILIKE '%cartao%'
   OR nome_banco ILIKE '%card%'
   OR nome_banco ILIKE '%credit%';

-- Create index for faster queries on credit card flag
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_credit_card 
ON contas_bancarias(is_credit_card);

-- Create index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_transacoes_duplicata 
ON transacoes(possivel_duplicata) 
WHERE possivel_duplicata = true;
