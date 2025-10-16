-- Add foreign key to dda_boletos table
ALTER TABLE public.dda_boletos
ADD CONSTRAINT dda_boletos_conta_bancaria_id_fkey
FOREIGN KEY (conta_bancaria_id)
REFERENCES public.contas_bancarias(id)
ON DELETE CASCADE;