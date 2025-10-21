-- Adicionar colunas para integração com Pluggy na tabela contas_bancarias
ALTER TABLE public.contas_bancarias 
ADD COLUMN IF NOT EXISTS pluggy_item_id TEXT,
ADD COLUMN IF NOT EXISTS pluggy_account_id TEXT,
ADD COLUMN IF NOT EXISTS pluggy_connector_id TEXT,
ADD COLUMN IF NOT EXISTS auto_sync BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ultimo_erro_sync TEXT;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_contas_pluggy_item ON public.contas_bancarias(pluggy_item_id);
CREATE INDEX IF NOT EXISTS idx_contas_pluggy_account ON public.contas_bancarias(pluggy_account_id);