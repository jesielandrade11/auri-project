-- Adicionar campos de conciliação à tabela transacoes
ALTER TABLE public.transacoes 
ADD COLUMN IF NOT EXISTS conciliado boolean DEFAULT false;

ALTER TABLE public.transacoes 
ADD COLUMN IF NOT EXISTS data_conciliacao timestamp with time zone;

ALTER TABLE public.transacoes 
ADD COLUMN IF NOT EXISTS usuario_conciliacao uuid REFERENCES auth.users(id);

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_transacoes_conciliado 
ON public.transacoes(conciliado);

-- Atualizar transações existentes com status 'pago' para conciliado = true
UPDATE public.transacoes 
SET conciliado = true, 
    data_conciliacao = updated_at
WHERE status = 'pago' AND conciliado = false;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.transacoes.conciliado IS 'Indica se a transação foi conciliada com extrato bancário';
COMMENT ON COLUMN public.transacoes.data_conciliacao IS 'Data e hora em que a transação foi conciliada';
COMMENT ON COLUMN public.transacoes.usuario_conciliacao IS 'Usuário que realizou a conciliação';