-- Remover constraint antiga da coluna origem
ALTER TABLE public.transacoes DROP CONSTRAINT IF EXISTS transacoes_origem_check;

-- Adicionar nova constraint incluindo 'importacao'
ALTER TABLE public.transacoes ADD CONSTRAINT transacoes_origem_check
CHECK (origem IN ('api', 'upload', 'manual', 'importacao'));