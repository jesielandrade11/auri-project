-- Create contraparte_roles table
CREATE TABLE IF NOT EXISTS contraparte_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contraparte_id UUID REFERENCES contrapartes(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contraparte_id, role)
);

-- Enable RLS
ALTER TABLE contraparte_roles ENABLE ROW LEVEL SECURITY;

-- Create policy for contraparte_roles (same as contrapartes)
CREATE POLICY "Users can view their own contraparte roles"
  ON contraparte_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contrapartes
      WHERE contrapartes.id = contraparte_roles.contraparte_id
      AND contrapartes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own contraparte roles"
  ON contraparte_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contrapartes
      WHERE contrapartes.id = contraparte_roles.contraparte_id
      AND contrapartes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own contraparte roles"
  ON contraparte_roles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contrapartes
      WHERE contrapartes.id = contraparte_roles.contraparte_id
      AND contrapartes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own contraparte roles"
  ON contraparte_roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM contrapartes
      WHERE contrapartes.id = contraparte_roles.contraparte_id
      AND contrapartes.user_id = auth.uid()
    )
  );

-- Migrate existing roles
-- Handle 'ambos'
INSERT INTO contraparte_roles (contraparte_id, role)
SELECT id, 'cliente' FROM contrapartes WHERE papel = 'ambos';

INSERT INTO contraparte_roles (contraparte_id, role)
SELECT id, 'fornecedor' FROM contrapartes WHERE papel = 'ambos';

-- Handle other roles
INSERT INTO contraparte_roles (contraparte_id, role)
SELECT id, papel FROM contrapartes WHERE papel IS NOT NULL AND papel != 'ambos';

-- Relax constraints on contrapartes
ALTER TABLE contrapartes ALTER COLUMN papel DROP NOT NULL;
ALTER TABLE contrapartes DROP CONSTRAINT IF EXISTS contrapartes_papel_check;
ALTER TABLE contrapartes DROP CONSTRAINT IF EXISTS contrapartes_tipo_check; -- In case it was named tipo

-- Relax constraints on pending_contrapartes
ALTER TABLE pending_contrapartes ALTER COLUMN papel DROP NOT NULL;
ALTER TABLE pending_contrapartes DROP CONSTRAINT IF EXISTS pending_contrapartes_papel_check;
