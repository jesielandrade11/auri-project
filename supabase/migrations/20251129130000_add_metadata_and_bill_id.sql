-- Add metadata and bill_id columns to transacoes table
ALTER TABLE transacoes
ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb,
ADD COLUMN bill_id text;

COMMENT ON COLUMN transacoes.metadata IS 'Stores additional metadata from providers (e.g., creditCardMetadata from Pluggy)';
COMMENT ON COLUMN transacoes.bill_id IS 'Stores the bill ID for credit card transactions to group by invoice';

-- Create index on bill_id for faster queries
CREATE INDEX idx_transacoes_bill_id ON transacoes(bill_id);
