-- SCRIPT DE LIMPEZA DE DADOS FICTÍCIOS
-- ATENÇÃO: Este script deletará dados! Execute com cautela.

-- 1. Contar o que será deletado (para verificação)
SELECT 
  'Transações Fictícias' as tipo,
  COUNT(*) as quantidade
FROM transacoes 
WHERE pluggy_transaction_id IS NULL 
  AND origem != 'manual';

SELECT 
  'Contrapartes Sem Uso' as tipo,
  COUNT(*) as quantidade
FROM contrapartes c
WHERE NOT EXISTS (
  SELECT 1 FROM transacoes t WHERE t.contraparte_id = c.id
);

-- 2. Deletar transações fictícias (sem ID da Pluggy e não manuais)
DELETE FROM transacoes 
WHERE pluggy_transaction_id IS NULL 
  AND origem != 'manual';

-- 3. Deletar contrapartes órfãs (sem transações vinculadas)
DELETE FROM contrapartes
WHERE id NOT IN (
  SELECT DISTINCT contraparte_id 
  FROM transacoes 
  WHERE contraparte_id IS NOT NULL
);

-- 4. Verificar resultados finais
SELECT 'Transações Restantes' as tipo, COUNT(*) as qtd FROM transacoes;
SELECT 'Contrapartes Restantes' as tipo, COUNT(*) as qtd FROM contrapartes;
