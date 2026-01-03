-- Add closing_day column to contas_bancarias for credit card cutoff logic
ALTER TABLE contas_bancarias
ADD COLUMN closing_day int2 CHECK (closing_day >= 1 AND closing_day <= 31);

COMMENT ON COLUMN contas_bancarias.closing_day IS 'Day of month when credit card invoice closes (1-31). Only applicable for credit cards.';
