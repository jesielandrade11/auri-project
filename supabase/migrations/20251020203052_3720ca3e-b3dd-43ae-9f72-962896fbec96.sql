-- ========================================
-- AURI - Sistema de Gestão Financeira
-- Módulos: Centro de Custos, Categorias, Contrapartes e Alocações
-- ========================================

-- 1) AJUSTES NA TABELA CATEGORIAS (já existe, apenas adicionar campos)
ALTER TABLE public.categorias
  ADD COLUMN IF NOT EXISTS codigo_contabil text,
  ADD COLUMN IF NOT EXISTS categoria_pai_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nivel integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS caminho text;

-- Índice único para código por usuário
CREATE UNIQUE INDEX IF NOT EXISTS uk_categorias_user_codigo 
  ON public.categorias(user_id, codigo_contabil) 
  WHERE codigo_contabil IS NOT NULL;

-- 2) AJUSTES NA TABELA CENTROS_CUSTO (já existe, apenas adicionar campos se necessário)
ALTER TABLE public.centros_custo
  ADD COLUMN IF NOT EXISTS centro_pai_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nivel integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS caminho text;

-- Índice único para código por usuário
CREATE UNIQUE INDEX IF NOT EXISTS uk_centros_user_codigo 
  ON public.centros_custo(user_id, codigo);

-- 3) CRIAR TABELA CONTRAPARTES (fornecedores & clientes)
CREATE TABLE IF NOT EXISTS public.contrapartes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  papel text NOT NULL CHECK (papel IN ('cliente', 'fornecedor', 'ambos')),
  documento text,
  email text,
  telefone text,
  endereco text,
  observacoes text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS para contrapartes
ALTER TABLE public.contrapartes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contrapartes"
  ON public.contrapartes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contrapartes"
  ON public.contrapartes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contrapartes"
  ON public.contrapartes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contrapartes"
  ON public.contrapartes FOR DELETE
  USING (auth.uid() = user_id);

-- Índice para busca
CREATE INDEX IF NOT EXISTS idx_contrapartes_user_nome 
  ON public.contrapartes(user_id, nome);

-- 4) AJUSTES NA TABELA TRANSACOES (adicionar campos necessários)
ALTER TABLE public.transacoes
  ADD COLUMN IF NOT EXISTS contraparte_id uuid REFERENCES public.contrapartes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_vencimento date,
  ADD COLUMN IF NOT EXISTS data_pagamento date,
  ADD COLUMN IF NOT EXISTS numero_documento text,
  ADD COLUMN IF NOT EXISTS forma_pagamento text CHECK (forma_pagamento IN ('dinheiro', 'pix', 'ted', 'boleto', 'cartao_credito', 'cartao_debito', 'cheque', 'outro'));

-- Atualizar status para incluir novos valores
ALTER TABLE public.transacoes DROP CONSTRAINT IF EXISTS transacoes_status_check;
ALTER TABLE public.transacoes
  ADD CONSTRAINT transacoes_status_check 
  CHECK (status IN ('previsto', 'pago', 'atrasado', 'cancelado', 'parcial'));

-- 5) CRIAR TABELA DE ALOCAÇÕES (rateio de transações)
CREATE TABLE IF NOT EXISTS public.alocacoes_transacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transacao_id uuid NOT NULL REFERENCES public.transacoes(id) ON DELETE CASCADE,
  categoria_id uuid NOT NULL REFERENCES public.categorias(id) ON DELETE RESTRICT,
  centro_custo_id uuid NOT NULL REFERENCES public.centros_custo(id) ON DELETE RESTRICT,
  valor numeric(14,2) NOT NULL CHECK (valor >= 0),
  descricao text,
  created_at timestamptz DEFAULT now()
);

-- RLS para alocações
ALTER TABLE public.alocacoes_transacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view allocations of their transactions"
  ON public.alocacoes_transacao FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.transacoes t 
      WHERE t.id = alocacoes_transacao.transacao_id 
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert allocations for their transactions"
  ON public.alocacoes_transacao FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transacoes t 
      WHERE t.id = alocacoes_transacao.transacao_id 
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update allocations of their transactions"
  ON public.alocacoes_transacao FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.transacoes t 
      WHERE t.id = alocacoes_transacao.transacao_id 
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete allocations of their transactions"
  ON public.alocacoes_transacao FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.transacoes t 
      WHERE t.id = alocacoes_transacao.transacao_id 
      AND t.user_id = auth.uid()
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_alocacoes_transacao 
  ON public.alocacoes_transacao(transacao_id);

CREATE INDEX IF NOT EXISTS idx_alocacoes_categoria 
  ON public.alocacoes_transacao(categoria_id);

CREATE INDEX IF NOT EXISTS idx_alocacoes_centro 
  ON public.alocacoes_transacao(centro_custo_id);

-- 6) VIEW: Validação de alocações (soma deve igualar valor da transação)
CREATE OR REPLACE VIEW public.vw_alocacoes_divergentes AS
SELECT 
  t.id as transacao_id,
  t.descricao,
  t.valor as valor_transacao,
  COALESCE(SUM(a.valor), 0) as valor_alocado,
  t.valor - COALESCE(SUM(a.valor), 0) as divergencia
FROM public.transacoes t
LEFT JOIN public.alocacoes_transacao a ON a.transacao_id = t.id
GROUP BY t.id, t.descricao, t.valor
HAVING t.valor <> COALESCE(SUM(a.valor), 0);

-- 7) VIEW: Fluxo de Caixa (previsto x realizado)
CREATE OR REPLACE VIEW public.vw_fluxo_caixa AS
SELECT 
  t.id,
  t.user_id,
  CASE 
    WHEN t.status = 'pago' THEN t.data_pagamento
    ELSE t.data_vencimento
  END as data_referencia,
  t.data_transacao,
  t.data_vencimento,
  t.data_pagamento,
  t.tipo,
  t.valor,
  t.status,
  t.descricao,
  c.nome as categoria_nome,
  cc.nome as centro_custo_nome,
  cp.nome as contraparte_nome,
  cp.papel as contraparte_papel,
  CASE 
    WHEN t.status = 'pago' THEN 'realizado'
    ELSE 'previsto'
  END as tipo_fluxo
FROM public.transacoes t
LEFT JOIN public.categorias c ON c.id = t.categoria_id
LEFT JOIN public.centros_custo cc ON cc.id = t.centro_custo_id
LEFT JOIN public.contrapartes cp ON cp.id = t.contraparte_id;

-- 8) VIEW: DRE por Centro de Custo
CREATE OR REPLACE VIEW public.vw_dre_centro_custo AS
SELECT 
  a.centro_custo_id,
  cc.codigo as centro_custo_codigo,
  cc.nome as centro_custo_nome,
  cat.tipo as categoria_tipo,
  cat.dre_grupo,
  DATE_TRUNC('month', t.data_competencia) as mes_competencia,
  t.user_id,
  SUM(CASE WHEN cat.tipo = 'receita' THEN a.valor ELSE 0 END) as receitas,
  SUM(CASE WHEN cat.tipo = 'despesa' THEN a.valor ELSE 0 END) as despesas,
  SUM(CASE WHEN cat.tipo = 'receita' THEN a.valor ELSE -a.valor END) as resultado
FROM public.alocacoes_transacao a
INNER JOIN public.transacoes t ON t.id = a.transacao_id
INNER JOIN public.categorias cat ON cat.id = a.categoria_id
INNER JOIN public.centros_custo cc ON cc.id = a.centro_custo_id
WHERE t.status IN ('pago', 'parcial')
GROUP BY a.centro_custo_id, cc.codigo, cc.nome, cat.tipo, cat.dre_grupo, DATE_TRUNC('month', t.data_competencia), t.user_id;

-- 9) VIEW: Aging (contas a pagar/receber por faixa de atraso)
CREATE OR REPLACE VIEW public.vw_aging AS
SELECT 
  t.id,
  t.user_id,
  t.descricao,
  t.valor,
  t.data_vencimento,
  t.tipo,
  t.status,
  cp.nome as contraparte_nome,
  cp.papel as contraparte_papel,
  CASE 
    WHEN t.data_vencimento > CURRENT_DATE THEN 'a_vencer'
    WHEN t.data_vencimento >= CURRENT_DATE - INTERVAL '7 days' THEN '0_7_dias'
    WHEN t.data_vencimento >= CURRENT_DATE - INTERVAL '15 days' THEN '8_15_dias'
    WHEN t.data_vencimento >= CURRENT_DATE - INTERVAL '30 days' THEN '16_30_dias'
    WHEN t.data_vencimento >= CURRENT_DATE - INTERVAL '60 days' THEN '31_60_dias'
    WHEN t.data_vencimento >= CURRENT_DATE - INTERVAL '90 days' THEN '61_90_dias'
    ELSE 'acima_90_dias'
  END as faixa_atraso,
  CURRENT_DATE - t.data_vencimento as dias_atraso
FROM public.transacoes t
LEFT JOIN public.contrapartes cp ON cp.id = t.contraparte_id
WHERE t.status IN ('previsto', 'atrasado', 'parcial')
  AND t.data_vencimento IS NOT NULL;

-- 10) Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas
DROP TRIGGER IF EXISTS trigger_contrapartes_updated_at ON public.contrapartes;
CREATE TRIGGER trigger_contrapartes_updated_at
  BEFORE UPDATE ON public.contrapartes
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_updated_at();

-- 11) Função para calcular caminho hierárquico de categorias
CREATE OR REPLACE FUNCTION public.calcular_caminho_categoria()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.categoria_pai_id IS NULL THEN
    NEW.caminho = NEW.id::text;
    NEW.nivel = 1;
  ELSE
    SELECT caminho || '>' || NEW.id::text, nivel + 1
    INTO NEW.caminho, NEW.nivel
    FROM public.categorias
    WHERE id = NEW.categoria_pai_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_categoria_caminho ON public.categorias;
CREATE TRIGGER trigger_categoria_caminho
  BEFORE INSERT OR UPDATE OF categoria_pai_id ON public.categorias
  FOR EACH ROW
  EXECUTE FUNCTION public.calcular_caminho_categoria();

-- 12) Função para calcular caminho hierárquico de centros de custo
CREATE OR REPLACE FUNCTION public.calcular_caminho_centro_custo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.centro_pai_id IS NULL THEN
    NEW.caminho = NEW.id::text;
    NEW.nivel = 1;
  ELSE
    SELECT caminho || '>' || NEW.id::text, nivel + 1
    INTO NEW.caminho, NEW.nivel
    FROM public.centros_custo
    WHERE id = NEW.centro_pai_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_centro_custo_caminho ON public.centros_custo;
CREATE TRIGGER trigger_centro_custo_caminho
  BEFORE INSERT OR UPDATE OF centro_pai_id ON public.centros_custo
  FOR EACH ROW
  EXECUTE FUNCTION public.calcular_caminho_centro_custo();

-- 13) Atualizar status de transações vencidas automaticamente
CREATE OR REPLACE FUNCTION public.atualizar_status_vencidas()
RETURNS void AS $$
BEGIN
  UPDATE public.transacoes
  SET status = 'atrasado'
  WHERE status = 'previsto'
    AND data_vencimento < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;