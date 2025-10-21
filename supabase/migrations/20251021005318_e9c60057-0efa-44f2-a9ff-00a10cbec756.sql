-- Tabela para rastrear importações de arquivos
CREATE TABLE IF NOT EXISTS public.importacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo_arquivo TEXT NOT NULL CHECK (tipo_arquivo IN ('pdf', 'csv', 'ofx', 'api')),
  nome_arquivo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processando' CHECK (status IN ('processando', 'concluido', 'erro')),
  total_transacoes INTEGER DEFAULT 0,
  transacoes_importadas INTEGER DEFAULT 0,
  mensagem_erro TEXT,
  dados_originais JSONB,
  conta_bancaria_id UUID REFERENCES public.contas_bancarias(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.importacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para importacoes
CREATE POLICY "Usuários podem ver suas próprias importações"
ON public.importacoes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar importações"
ON public.importacoes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas importações"
ON public.importacoes FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_importacoes_updated_at
BEFORE UPDATE ON public.importacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para melhor performance
CREATE INDEX idx_importacoes_user_id ON public.importacoes(user_id);
CREATE INDEX idx_importacoes_status ON public.importacoes(status);
CREATE INDEX idx_importacoes_created_at ON public.importacoes(created_at DESC);