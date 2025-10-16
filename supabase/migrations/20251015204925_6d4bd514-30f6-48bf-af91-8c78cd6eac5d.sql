-- Criar tabela para boletos DDA
CREATE TABLE public.dda_boletos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conta_bancaria_id UUID NOT NULL,
  beneficiario TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado')),
  codigo_barras TEXT,
  linha_digitavel TEXT,
  observacoes TEXT,
  transacao_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dda_boletos ENABLE ROW LEVEL SECURITY;

-- Create policies for dda_boletos
CREATE POLICY "Users can view their own DDA boletos"
ON public.dda_boletos
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own DDA boletos"
ON public.dda_boletos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own DDA boletos"
ON public.dda_boletos
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own DDA boletos"
ON public.dda_boletos
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_dda_boletos_updated_at
BEFORE UPDATE ON public.dda_boletos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dda_boletos;