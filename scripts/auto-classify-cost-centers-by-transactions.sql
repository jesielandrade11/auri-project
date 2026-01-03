-- Alternative: If you want to do it based on actual transaction data
-- This analyzes existing transactions to determine if a cost center is entrada or saída

-- Step 1: Analyze transaction patterns for each cost center
WITH centro_analysis AS (
  SELECT 
    cc.id,
    cc.codigo,
    cc.nome,
    cc.tipo_operacao as tipo_atual,
    COUNT(CASE WHEN t.tipo = 'entrada' THEN 1 END) as count_entradas,
    COUNT(CASE WHEN t.tipo = 'saída' THEN 1 END) as count_saidas,
    SUM(CASE WHEN t.tipo = 'entrada' THEN t.valor ELSE 0 END) as valor_entradas,
    SUM(CASE WHEN t.tipo = 'saída' THEN t.valor ELSE 0 END) as valor_saidas
  FROM centros_custo cc
  LEFT JOIN transacoes t ON t.centro_custo_id = cc.id
  WHERE cc.ativo = true
  GROUP BY cc.id, cc.codigo, cc.nome, cc.tipo_operacao
)
SELECT 
  id,
  codigo,
  nome,
  tipo_atual,
  count_entradas,
  count_saidas,
  valor_entradas,
  valor_saidas,
  CASE 
    -- If has more entrada transactions, classify as entrada
    WHEN count_entradas > count_saidas THEN 'entrada'
    -- If has more saída transactions, classify as saída
    WHEN count_saidas > count_entradas THEN 'saída'
    -- If no transactions, use name-based logic
    WHEN count_entradas = 0 AND count_saidas = 0 THEN
      CASE 
        WHEN LOWER(nome) LIKE ANY(ARRAY['%vend%', '%receit%', '%fatur%', '%comercial%']) THEN 'entrada'
        ELSE 'saída'
      END
    -- If equal, classify by value
    WHEN valor_entradas > valor_saidas THEN 'entrada'
    ELSE 'saída'
  END as tipo_sugerido
FROM centro_analysis
ORDER BY nome;

-- To apply the suggested classification, uncomment below:
/*
UPDATE centros_custo cc
SET tipo_operacao = ca.tipo_sugerido
FROM (
  -- Repeat the logic above to get tipo_sugerido
  SELECT 
    cc.id,
    CASE 
      WHEN COUNT(CASE WHEN t.tipo = 'entrada' THEN 1 END) > COUNT(CASE WHEN t.tipo = 'saída' THEN 1 END) THEN 'entrada'
      WHEN COUNT(CASE WHEN t.tipo = 'saída' THEN 1 END) > COUNT(CASE WHEN t.tipo = 'entrada' THEN 1 END) THEN 'saída'
      WHEN LOWER(cc.nome) LIKE ANY(ARRAY['%vend%', '%receit%', '%fatur%', '%comercial%']) THEN 'entrada'
      ELSE 'saída'
    END as tipo_sugerido
  FROM centros_custo cc
  LEFT JOIN transacoes t ON t.centro_custo_id = cc.id
  WHERE cc.ativo = true
  GROUP BY cc.id, cc.nome
) ca
WHERE cc.id = ca.id;
*/
