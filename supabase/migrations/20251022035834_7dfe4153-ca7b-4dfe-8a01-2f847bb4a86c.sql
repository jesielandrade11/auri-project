-- Adicionar campos para rastrear transferências entre contas
ALTER TABLE public.transacoes
ADD COLUMN IF NOT EXISTS transferencia_vinculada_id uuid,
ADD COLUMN IF NOT EXISTS tipo_transferencia text CHECK (tipo_transferencia IN ('origem', 'destino'));

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.transacoes.transferencia_vinculada_id IS 'ID da transação correspondente na outra conta (origem ou destino da transferência)';
COMMENT ON COLUMN public.transacoes.tipo_transferencia IS 'Se é a conta de origem (saída) ou destino (entrada) da transferência';

-- Criar índice para melhorar performance nas consultas de transferências
CREATE INDEX IF NOT EXISTS idx_transacoes_transferencia_vinculada 
ON public.transacoes(transferencia_vinculada_id) 
WHERE transferencia_vinculada_id IS NOT NULL;