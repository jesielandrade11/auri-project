-- EXECUTE ESTE SQL NO SUPABASE DASHBOARD SQL EDITOR
-- URL: https://supabase.com/dashboard/project/vbncvmbibszhwxiwckzq/sql

-- Este script faz a transição completa de receita/despesa para entrada/saída

-- 1. TRANSACOES: Remover constraint antiga e criar nova
ALTER TABLE transacoes DROP CONSTRAINT IF EXISTS transacoes_tipo_check;

-- Atualizar dados existentes ANTES de criar nova constraint
UPDATE transacoes SET tipo = 'entrada' WHERE tipo = 'receita';
UPDATE transacoes SET tipo = 'saída' WHERE tipo = 'despesa';

-- Criar nova constraint
ALTER TABLE transacoes ADD CONSTRAINT transacoes_tipo_check 
  CHECK (tipo IN ('entrada', 'saída'));

-- 2. CENTROS_CUSTO: Remover constraint antiga e criar nova
ALTER TABLE centros_custo DROP CONSTRAINT IF EXISTS centros_custo_tipo_operacao_check;

-- Atualizar dados existentes ANTES de criar nova constraint
UPDATE centros_custo SET tipo_operacao = 'entrada' WHERE tipo_operacao = 'receita';
UPDATE centros_custo SET tipo_operacao = 'saída' WHERE tipo_operacao = 'despesa';
UPDATE centros_custo SET tipo_operacao = 'saída' WHERE tipo_operacao = 'ambos'; -- Forçar escolha

-- Criar nova constraint (SEM 'ambos')
ALTER TABLE centros_custo ADD CONSTRAINT centros_custo_tipo_operacao_check 
  CHECK (tipo_operacao IN ('entrada', 'saída'));

-- 3. CATEGORIAS: Remover constraint antiga e criar nova
ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_tipo_check;

-- Atualizar dados existentes
UPDATE categorias SET tipo = 'entrada' WHERE tipo = 'receita';
UPDATE categorias SET tipo = 'saída' WHERE tipo = 'despesa';
UPDATE categorias SET tipo = 'saída' WHERE tipo = 'ambos'; -- Forçar escolha

-- Criar nova constraint (SEM 'ambos')
ALTER TABLE categorias ADD CONSTRAINT categorias_tipo_check 
  CHECK (tipo IN ('entrada', 'saída'));

-- 4. PLANEJAMENTO (se existir)
ALTER TABLE planejamento DROP CONSTRAINT IF EXISTS planejamento_tipo_check;

UPDATE planejamento SET tipo = 'entrada' WHERE tipo = 'receita';
UPDATE planejamento SET tipo = 'saída' WHERE tipo = 'despesa';

ALTER TABLE planejamento ADD CONSTRAINT planejamento_tipo_check 
  CHECK (tipo IN ('entrada', 'saída'));

-- 5. Atualizar comentários
COMMENT ON COLUMN transacoes.tipo IS 'Tipo da transação: entrada ou saída';
COMMENT ON COLUMN centros_custo.tipo_operacao IS 'Classificação do centro de custo: entrada ou saída';
COMMENT ON COLUMN categorias.tipo IS 'Tipo da categoria: entrada ou saída';

-- 6. Verificar resultados
SELECT 'TRANSACOES' as tabela, tipo, COUNT(*) as quantidade
FROM transacoes
GROUP BY tipo
UNION ALL
SELECT 'CENTROS_CUSTO' as tabela, tipo_operacao as tipo, COUNT(*) as quantidade
FROM centros_custo
GROUP BY tipo_operacao
UNION ALL
SELECT 'CATEGORIAS' as tabela, tipo, COUNT(*) as quantidade
FROM categorias
GROUP BY tipo
ORDER BY tabela, tipo;
