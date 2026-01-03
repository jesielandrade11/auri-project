-- Drop legacy billing columns from contas_bancarias
ALTER TABLE contas_bancarias
DROP COLUMN IF EXISTS billing_close_day,
DROP COLUMN IF EXISTS billing_due_day;
