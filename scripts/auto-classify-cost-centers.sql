-- Script: Auto-classify cost centers as entrada or saída
-- Execute this in Supabase SQL Editor
-- This script intelligently classifies cost centers based on their names

-- First, let's see what we have
SELECT codigo, nome, tipo_operacao 
FROM centros_custo 
ORDER BY nome;

-- Classify as ENTRADA (revenue-generating):
UPDATE centros_custo
SET tipo_operacao = 'entrada'
WHERE tipo_operacao IS NULL OR tipo_operacao = 'despesa' OR tipo_operacao = 'ambos'
AND (
  LOWER(nome) LIKE '%vend%' OR
  LOWER(nome) LIKE '%receit%' OR
  LOWER(nome) LIKE '%fatur%' OR
  LOWER(nome) LIKE '%comercial%' OR
  LOWER(nome) LIKE '%revenue%' OR
  LOWER(nome) LIKE '%sales%' OR
  LOWER(codigo) LIKE '%VEN%' OR
  LOWER(codigo) LIKE '%REC%' OR
  LOWER(codigo) LIKE '%FAT%' OR
  LOWER(codigo) LIKE '%COM%'
);

-- Classify as SAÍDA (cost/expense centers):
UPDATE centros_custo
SET tipo_operacao = 'saída'
WHERE tipo_operacao IS NULL OR tipo_operacao = 'despesa' OR tipo_operacao = 'ambos'
AND tipo_operacao != 'entrada' -- Don't override entradas
AND (
  LOWER(nome) LIKE '%admin%' OR
  LOWER(nome) LIKE '%operac%' OR
  LOWER(nome) LIKE '%market%' OR
  LOWER(nome) LIKE '%financ%' OR
  LOWER(nome) LIKE '%rh%' OR
  LOWER(nome) LIKE '%ti%' OR
  LOWER(nome) LIKE '%tecnolog%' OR
  LOWER(nome) LIKE '%compra%' OR
  LOWER(nome) LIKE '%log%' OR
  LOWER(nome) LIKE '%custo%' OR
  LOWER(nome) LIKE '%desp%' OR
  LOWER(nome) LIKE '%gerenc%' OR
  LOWER(nome) LIKE '%diret%' OR
  LOWER(codigo) LIKE '%ADM%' OR
  LOWER(codigo) LIKE '%OPE%' OR
  LOWER(codigo) LIKE '%MKT%' OR
  LOWER(codigo) LIKE '%FIN%' OR
  LOWER(codigo) LIKE '%TI%' OR
  LOWER(codigo) LIKE '%LOG%' OR
  LOWER(codigo) LIKE '%RH%'
);

-- Default: If still NULL or 'despesa', assume it's saída
UPDATE centros_custo
SET tipo_operacao = 'saída'
WHERE tipo_operacao IS NULL OR tipo_operacao = 'despesa';

-- Verify results
SELECT 
  tipo_operacao,
  COUNT(*) as quantidade,
  STRING_AGG(nome, ', ' ORDER BY nome) as centros
FROM centros_custo
GROUP BY tipo_operacao
ORDER BY tipo_operacao;

-- Show all for review
SELECT codigo, nome, tipo, tipo_operacao 
FROM centros_custo 
ORDER BY tipo_operacao, nome;
