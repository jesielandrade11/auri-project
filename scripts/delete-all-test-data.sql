-- ============================================
-- SCRIPT PARA DELETAR TODOS OS DADOS DE TESTE
-- ============================================
-- ATENÇÃO: Este script deletará TODOS os dados das tabelas de transações e contrapartes!
-- Execute com MUITO CUIDADO e apenas em ambiente de testes.
-- 
-- Para executar: Copie e cole no Supabase Dashboard > SQL Editor

-- 1. VERIFICAR QUANTOS REGISTROS EXISTEM (antes de deletar)
SELECT 
  'ANTES DA DELEÇÃO' as momento,
  'Transações' as tabela,
  COUNT(*) as total
FROM transacoes
UNION ALL
SELECT 
  'ANTES DA DELEÇÃO',
  'Contrapartes',
  COUNT(*)
FROM contrapartes
UNION ALL
SELECT 
  'ANTES DA DELEÇÃO',
  'Pending Contrapartes',
  COUNT(*)
FROM pending_contrapartes;

-- ============================================
-- 2. DELETAR DADOS (descomente as linhas abaixo para executar)
-- ============================================

-- Deletar todas as transações (isso automaticamente remove as referências a contrapartes)
-- DELETE FROM transacoes;

-- Deletar todas as contrapartes pendentes
-- DELETE FROM pending_contrapartes;

-- Deletar todas as contrapartes
-- DELETE FROM contrapartes;


-- ============================================
-- 3. VERIFICAR RESULTADOS (após deletar)
-- ============================================

-- SELECT 
--   'APÓS DELEÇÃO' as momento,
--   'Transações' as tabela,
--   COUNT(*) as total
-- FROM transacoes
-- UNION ALL
-- SELECT 
--   'APÓS DELEÇÃO',
--   'Contrapartes',
--   COUNT(*)
-- FROM contrapartes
-- UNION ALL
-- SELECT 
--   'APÓS DELEÇÃO',
--   'Pending Contrapartes',
--   COUNT(*)
-- FROM pending_contrapartes;

-- ============================================
-- ALTERNATIVA: Deletar apenas dados de um usuário específico
-- ============================================
-- Substitua 'SEU_USER_ID_AQUI' pelo ID do usuário

-- DELETE FROM transacoes 
-- WHERE user_id = 'SEU_USER_ID_AQUI';

-- DELETE FROM pending_contrapartes 
-- WHERE user_id = 'SEU_USER_ID_AQUI';

-- DELETE FROM contrapartes 
-- WHERE user_id = 'SEU_USER_ID_AQUI';
