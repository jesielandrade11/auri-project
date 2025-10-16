-- Tabela de Contas Bancárias
CREATE TABLE public.contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_banco VARCHAR(100) NOT NULL,
  tipo_conta VARCHAR(50) CHECK (tipo_conta IN ('corrente', 'poupanca', 'investimento')),
  numero_conta VARCHAR(50),
  saldo_atual DECIMAL(15,2) DEFAULT 0,
  saldo_inicial DECIMAL(15,2) DEFAULT 0,
  data_abertura DATE,
  ultima_sincronizacao TIMESTAMP,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Categorias (Plano de Contas)
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  codigo_contabil VARCHAR(20),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  categoria_pai_id UUID REFERENCES public.categorias(id),
  nivel INT DEFAULT 1,
  fixa_variavel VARCHAR(20) CHECK (fixa_variavel IN ('fixa', 'variavel', 'mista')),
  dre_grupo VARCHAR(50),
  descricao TEXT,
  cor VARCHAR(7),
  icone VARCHAR(50),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Centros de Custo
CREATE TABLE public.centros_custo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo VARCHAR(20) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(50) CHECK (tipo IN ('departamento', 'projeto', 'filial')),
  orcamento_mensal DECIMAL(15,2),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, codigo)
);

-- Tabela de Transações
CREATE TABLE public.transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_id UUID REFERENCES public.contas_bancarias(id) ON DELETE SET NULL,
  data_transacao DATE NOT NULL,
  data_competencia DATE,
  descricao TEXT NOT NULL,
  descricao_original TEXT,
  valor DECIMAL(15,2) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa', 'transferencia')),
  status VARCHAR(20) DEFAULT 'pago' CHECK (status IN ('pendente', 'pago', 'agendado', 'cancelado')),
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  centro_custo_id UUID REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  origem VARCHAR(20) NOT NULL CHECK (origem IN ('api', 'upload', 'manual')),
  arquivo_origem TEXT,
  hash_duplicata VARCHAR(64) UNIQUE,
  recorrente BOOLEAN DEFAULT false,
  recorrencia_id UUID,
  parcela_numero INT,
  parcela_total INT,
  observacoes TEXT,
  tags TEXT[],
  anexos JSONB,
  classificado_auto BOOLEAN DEFAULT false,
  confianca_classificacao DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Budgets
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes_referencia DATE NOT NULL,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE CASCADE,
  centro_custo_id UUID REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  valor_planejado DECIMAL(15,2) NOT NULL,
  valor_realizado DECIMAL(15,2) DEFAULT 0,
  percentual_utilizado DECIMAL(5,2),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, mes_referencia, categoria_id, centro_custo_id)
);

-- Índices para performance
CREATE INDEX idx_transacoes_user_data ON public.transacoes(user_id, data_transacao DESC);
CREATE INDEX idx_transacoes_categoria ON public.transacoes(categoria_id);
CREATE INDEX idx_transacoes_conta ON public.transacoes(conta_id);
CREATE INDEX idx_contas_user ON public.contas_bancarias(user_id);
CREATE INDEX idx_categorias_user ON public.categorias(user_id);

-- RLS Policies para Contas Bancárias
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contas"
ON public.contas_bancarias FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contas"
ON public.contas_bancarias FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contas"
ON public.contas_bancarias FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contas"
ON public.contas_bancarias FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies para Categorias
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own categorias"
ON public.categorias FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categorias"
ON public.categorias FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categorias"
ON public.categorias FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categorias"
ON public.categorias FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies para Centros de Custo
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own centros"
ON public.centros_custo FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own centros"
ON public.centros_custo FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own centros"
ON public.centros_custo FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own centros"
ON public.centros_custo FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies para Transações
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transacoes"
ON public.transacoes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transacoes"
ON public.transacoes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transacoes"
ON public.transacoes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transacoes"
ON public.transacoes FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies para Budgets
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own budgets"
ON public.budgets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets"
ON public.budgets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
ON public.budgets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
ON public.budgets FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contas_updated_at
BEFORE UPDATE ON public.contas_bancarias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transacoes_updated_at
BEFORE UPDATE ON public.transacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();