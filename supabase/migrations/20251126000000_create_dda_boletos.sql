-- Create dda_boletos table
CREATE TABLE IF NOT EXISTS public.dda_boletos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conta_bancaria_id UUID REFERENCES public.contas_bancarias(id) ON DELETE SET NULL,
    pluggy_id VARCHAR(100) UNIQUE,
    beneficiario VARCHAR(255),
    valor DECIMAL(15, 2),
    vencimento DATE,
    status VARCHAR(50), -- pending, paid, overdue, cancelled
    linha_digitavel VARCHAR(255),
    codigo_barras VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add dda_enabled to contas_bancarias
ALTER TABLE public.contas_bancarias 
ADD COLUMN IF NOT EXISTS dda_enabled BOOLEAN DEFAULT FALSE;

-- RLS for dda_boletos
ALTER TABLE public.dda_boletos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own DDA boletos" ON public.dda_boletos;
CREATE POLICY "Users can view their own DDA boletos"
ON public.dda_boletos FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own DDA boletos" ON public.dda_boletos;
CREATE POLICY "Users can insert their own DDA boletos"
ON public.dda_boletos FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own DDA boletos" ON public.dda_boletos;
CREATE POLICY "Users can update their own DDA boletos"
ON public.dda_boletos FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own DDA boletos" ON public.dda_boletos;
CREATE POLICY "Users can delete their own DDA boletos"
ON public.dda_boletos FOR DELETE
USING (auth.uid() = user_id);
