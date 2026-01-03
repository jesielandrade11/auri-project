-- Execute este SQL manualmente no Supabase Dashboard (SQL Editor)
-- URL: https://supabase.com/dashboard/project/vbncvmbibszhwxiwckzq/sql

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

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_pending_contrapartes_user_id ON pending_contrapartes(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_contrapartes_created_at ON pending_contrapartes(created_at DESC);

-- Enable RLS
ALTER TABLE pending_contrapartes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own pending contrapartes" ON pending_contrapartes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own pending contrapartes" ON pending_contrapartes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pending contrapartes" ON pending_contrapartes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own pending contrapartes" ON pending_contrapartes FOR UPDATE USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE pending_contrapartes IS 'Contrapartes awaiting user approval before being moved to contrapartes table';
