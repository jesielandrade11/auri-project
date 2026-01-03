-- Add Pluggy fields to accounts
ALTER TABLE public.contas_bancarias
ADD COLUMN IF NOT EXISTS pluggy_item_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS pluggy_account_id VARCHAR(100);

-- Add Pluggy fields to transactions
ALTER TABLE public.transacoes
ADD COLUMN IF NOT EXISTS pluggy_transaction_id VARCHAR(100) UNIQUE;

-- Create sync_logs table
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'in_progress')),
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS for sync_logs
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync logs"
ON public.sync_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync logs"
ON public.sync_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);
