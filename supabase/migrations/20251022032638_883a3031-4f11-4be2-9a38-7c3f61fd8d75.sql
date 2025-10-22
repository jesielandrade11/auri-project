-- Renomear coluna conta_id para conta_bancaria_id na tabela transacoes
ALTER TABLE public.transacoes 
RENAME COLUMN conta_id TO conta_bancaria_id;