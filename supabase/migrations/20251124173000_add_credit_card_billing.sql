-- Migration: Add billing cycle fields for credit cards
-- Date: 2024-11-24
-- Purpose: Support credit card billing cycle management

-- Add billing cycle fields to contas_bancarias
ALTER TABLE contas_bancarias
ADD COLUMN IF NOT EXISTS billing_close_day INTEGER DEFAULT 21,
ADD COLUMN IF NOT EXISTS billing_due_day INTEGER DEFAULT 28;

-- Add comments
COMMENT ON COLUMN contas_bancarias.billing_close_day IS 'Day of month when credit card billing closes (only relevant for credit cards)';
COMMENT ON COLUMN contas_bancarias.billing_due_day IS 'Day of month when credit card payment is due (only relevant for credit cards)';

-- Add constraint to ensure valid days
ALTER TABLE contas_bancarias
ADD CONSTRAINT billing_close_day_valid CHECK (billing_close_day >= 1 AND billing_close_day <= 31),
ADD CONSTRAINT billing_due_day_valid CHECK (billing_due_day >= 1 AND billing_due_day <= 31);
