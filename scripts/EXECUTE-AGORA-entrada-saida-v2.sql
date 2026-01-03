-- EXECUTE ESTE SQL NO SUPABASE DASHBOARD SQL EDITOR
-- URL: https://supabase.com/dashboard/project/vbncvmbibszhwxiwckzq/sql

-- VERSÃO CORRIGIDA (Sem tabela planejamento)

-- 1. TRANSACOES
ALTER TABLE transacoes DROP CONSTRAINT IF EXISTS transacoes_tipo_check;
UPDATE transacoes SET tipo = 'entrada' WHERE tipo = 'receita';
UPDATE transacoes SET tipo = 'saída' WHERE tipo = 'despesa';
ALTER TABLE transacoes ADD CONSTRAINT transacoes_tipo_check CHECK (tipo IN ('entrada', 'saída'));

-- 2. CENTROS_CUSTO
ALTER TABLE centros_custo DROP CONSTRAINT IF EXISTS centros_custo_tipo_operacao_check;
UPDATE centros_custo SET tipo_operacao = 'entrada' WHERE tipo_operacao = 'receita';
UPDATE centros_custo SET tipo_operacao = 'saída' WHERE tipo_operacao = 'despesa';
UPDATE centros_custo SET tipo_operacao = 'saída' WHERE tipo_operacao = 'ambos';
ALTER TABLE centros_custo ADD CONSTRAINT centros_custo_tipo_operacao_check CHECK (tipo_operacao IN ('entrada', 'saída'));

-- 3. CATEGORIAS
ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_tipo_check;
UPDATE categorias SET tipo = 'entrada' WHERE tipo = 'receita';
UPDATE categorias SET tipo = 'saída' WHERE tipo = 'despesa';
UPDATE categorias SET tipo = 'saída' WHERE tipo = 'ambos';
ALTER TABLE categorias ADD CONSTRAINT categorias_tipo_check CHECK (tipo IN ('entrada', 'saída'));

-- 4. Atualizar comentários
COMMENT ON COLUMN transacoes.tipo IS 'Tipo da transação: entrada ou saída';
COMMENT ON COLUMN centros_custo.tipo_operacao IS 'Classificação do centro de custo: entrada ou saída';
COMMENT ON COLUMN categorias.tipo IS 'Tipo da categoria: entrada ou saída';

-- 5. Verificar resultados
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
