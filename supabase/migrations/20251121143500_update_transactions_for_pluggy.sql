-- Migração para atualizar tabela de transações para integração com Pluggy
-- Adiciona campos para contraparte, datas de vencimento/agendamento/baixa e controle de duplicatas

-- Adicionar campo contraparte para fornecedores/clientes
ALTER TABLE public.transacoes 
ADD COLUMN IF NOT EXISTS contraparte TEXT;

-- Adicionar data de vencimento
ALTER TABLE public.transacoes 
ADD COLUMN IF NOT EXISTS data_vencimento DATE;

-- Adicionar data de agendamento
ALTER TABLE public.transacoes 
ADD COLUMN IF NOT EXISTS data_agendamento DATE;

-- Adicionar campos para controle de baixa
ALTER TABLE public.transacoes 
ADD COLUMN IF NOT EXISTS data_baixa DATE;

ALTER TABLE public.transacoes 
ADD COLUMN IF NOT EXISTS conta_baixa_id UUID REFERENCES public.contas_bancarias(id) ON DELETE SET NULL;

-- Adicionar campo para ID da transação Pluggy (evitar duplicatas)
ALTER TABLE public.transacoes 
ADD COLUMN IF NOT EXISTS pluggy_transaction_id TEXT;

-- Criar índice único para pluggy_transaction_id (permitindo NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_transacoes_pluggy_id_unique 
ON public.transacoes(pluggy_transaction_id) 
WHERE pluggy_transaction_id IS NOT NULL;

-- Criar índice para busca rápida de duplicatas
CREATE INDEX IF NOT EXISTS idx_transacoes_pluggy_id 
ON public.transacoes(pluggy_transaction_id);

-- Criar índice para data de vencimento (usado em queries de "a vencer")
CREATE INDEX IF NOT EXISTS idx_transacoes_data_vencimento 
ON public.transacoes(user_id, data_vencimento) 
WHERE data_vencimento IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.transacoes.contraparte IS 'Nome do fornecedor/cliente (preenchido via Pluggy ou manualmente)';
COMMENT ON COLUMN public.transacoes.data_vencimento IS 'Data de vencimento da transação';
COMMENT ON COLUMN public.transacoes.data_agendamento IS 'Data de agendamento do pagamento';
COMMENT ON COLUMN public.transacoes.data_baixa IS 'Data em que a baixa foi realizada';
COMMENT ON COLUMN public.transacoes.conta_baixa_id IS 'Conta bancária onde a baixa foi realizada';
COMMENT ON COLUMN public.transacoes.pluggy_transaction_id IS 'ID da transação no Pluggy para evitar duplicatas';
