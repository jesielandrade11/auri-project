-- Migration: Add new roles to contrapartes and pending_contrapartes
-- Date: 2024-11-25
-- Purpose: Add 'empresa' and 'titular' to the allowed values for 'papel'

-- 1. Update contrapartes table
ALTER TABLE contrapartes DROP CONSTRAINT IF EXISTS contrapartes_papel_check;
ALTER TABLE contrapartes ADD CONSTRAINT contrapartes_papel_check 
  CHECK (papel IN ('cliente', 'fornecedor', 'ambos', 'empresa', 'titular'));

-- 2. Update pending_contrapartes table
ALTER TABLE pending_contrapartes DROP CONSTRAINT IF EXISTS pending_contrapartes_papel_check;
ALTER TABLE pending_contrapartes ADD CONSTRAINT pending_contrapartes_papel_check 
  CHECK (papel IN ('cliente', 'fornecedor', 'ambos', 'empresa', 'titular'));

-- 3. Update comments
COMMENT ON COLUMN contrapartes.papel IS 'Papel do contato: cliente, fornecedor, ambos, empresa ou titular';
COMMENT ON COLUMN pending_contrapartes.papel IS 'Papel do contato pendente: cliente, fornecedor, ambos, empresa ou titular';
