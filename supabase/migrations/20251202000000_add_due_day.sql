-- Add due_day column to contas_bancarias
ALTER TABLE contas_bancarias
ADD COLUMN due_day int2;

COMMENT ON COLUMN contas_bancarias.due_day IS 'Day of the month when the credit card bill is due (vencimento)';
