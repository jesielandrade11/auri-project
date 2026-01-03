-- Create faturas table
CREATE TABLE IF NOT EXISTS public.faturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_bancaria_id UUID NOT NULL REFERENCES public.contas_bancarias(id) ON DELETE CASCADE,
    pluggy_id VARCHAR(100) UNIQUE,
    data_vencimento DATE,
    data_fechamento DATE,
    valor_total DECIMAL(15, 2),
    valor_minimo DECIMAL(15, 2),
    status VARCHAR(50), -- OPEN, PAID, OVERDUE
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own faturas" ON public.faturas;
CREATE POLICY "Users can view their own faturas"
ON public.faturas FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own faturas" ON public.faturas;
CREATE POLICY "Users can insert their own faturas"
ON public.faturas FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own faturas" ON public.faturas;
CREATE POLICY "Users can update their own faturas"
ON public.faturas FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own faturas" ON public.faturas;
CREATE POLICY "Users can delete their own faturas"
ON public.faturas FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_faturas_conta_bancaria_id ON public.faturas(conta_bancaria_id);
CREATE INDEX idx_faturas_data_vencimento ON public.faturas(data_vencimento);
