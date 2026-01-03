-- Migration: Create pending contrapartes system for approval workflow
-- Date: 2024-11-25
-- Purpose: Allow users to approve/reject contrapartes before creation

-- Create pending_contrapartes table
CREATE TABLE IF NOT EXISTS pending_contrapartes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  papel TEXT CHECK (papel IN ('cliente', 'fornecedor', 'ambos')) NOT NULL,
  origem TEXT DEFAULT 'api',
  pluggy_merchant_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, nome)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_pending_contrapartes_user_id 
ON pending_contrapartes(user_id);

CREATE INDEX IF NOT EXISTS idx_pending_contrapartes_created_at 
ON pending_contrapartes(created_at DESC);

-- Enable RLS
ALTER TABLE pending_contrapartes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own pending contrapartes" ON pending_contrapartes;
CREATE POLICY "Users can view their own pending contrapartes"
  ON pending_contrapartes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own pending contrapartes" ON pending_contrapartes;
CREATE POLICY "Users can insert their own pending contrapartes"
  ON pending_contrapartes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own pending contrapartes" ON pending_contrapartes;
CREATE POLICY "Users can delete their own pending contrapartes"
  ON pending_contrapartes FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pending contrapartes" ON pending_contrapartes;
CREATE POLICY "Users can update their own pending contrapartes"
  ON pending_contrapartes FOR UPDATE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE pending_contrapartes IS 'Contrapartes awaiting user approval before being moved to contrapartes table';
COMMENT ON COLUMN pending_contrapartes.origem IS 'Source of contraparte: api (from Pluggy/sync) or manual';
COMMENT ON COLUMN pending_contrapartes.pluggy_merchant_name IS 'Original merchant name from Pluggy API';
