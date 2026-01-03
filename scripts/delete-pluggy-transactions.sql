-- Script para deletar transações da Pluggy antes de testar novas melhorias
-- Execute este script no Supabase Dashboard (SQL Editor)

-- OPÇÃO 1: Deletar apenas transações importadas da Pluggy (RECOMENDADO)
DELETE FROM transacoes 
WHERE pluggy_transaction_id IS NOT NULL;

-- OPÇÃO 2: Se quiser deletar TODAS as transações (descomente a linha abaixo)
-- DELETE FROM transacoes;

-- Verificar quantas foram deletadas
SELECT 
  'Transações deletadas' as acao,
  COUNT(*) as total_restante
FROM transacoes;
