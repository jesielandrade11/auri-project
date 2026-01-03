-- Limpar transações (mantendo categorias, contas e centros de custo)
DELETE FROM transacoes;

-- Limpar boletos DDA
DELETE FROM dda_boletos;

-- Limpar contrapartes pendentes (opcional, se quiser re-processar tudo)
DELETE FROM pending_contrapartes;

-- Se quiser resetar também as contrapartes criadas automaticamente (CUIDADO: remove todas)
-- DELETE FROM contrapartes WHERE origem = 'api';

-- Resetar sequências se necessário (opcional)
-- ALTER SEQUENCE transacoes_id_seq RESTART WITH 1;
