-- Correção de segurança: adicionar search_path às funções

-- 1) Atualizar função de updated_at
CREATE OR REPLACE FUNCTION public.atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2) Atualizar função de caminho de categoria
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) Atualizar função de caminho de centro de custo
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4) Recriar views com SECURITY INVOKER para melhor segurança
DROP VIEW IF EXISTS public.vw_alocacoes_divergentes;
CREATE VIEW public.vw_alocacoes_divergentes 
WITH (security_invoker = true) AS
SELECT 
  t.id as transacao_id,
  t.descricao,
  t.valor as valor_transacao,
  COALESCE(SUM(a.valor), 0) as valor_alocado,
  t.valor - COALESCE(SUM(a.valor), 0) as divergencia
FROM public.transacoes t
LEFT JOIN public.alocacoes_transacao a ON a.transacao_id = t.id
WHERE t.user_id = auth.uid()
GROUP BY t.id, t.descricao, t.valor
HAVING t.valor <> COALESCE(SUM(a.valor), 0);

DROP VIEW IF EXISTS public.vw_fluxo_caixa;
CREATE VIEW public.vw_fluxo_caixa
WITH (security_invoker = true) AS
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
LEFT JOIN public.contrapartes cp ON cp.id = t.contraparte_id
WHERE t.user_id = auth.uid();

DROP VIEW IF EXISTS public.vw_dre_centro_custo;
CREATE VIEW public.vw_dre_centro_custo
WITH (security_invoker = true) AS
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
  AND t.user_id = auth.uid()
GROUP BY a.centro_custo_id, cc.codigo, cc.nome, cat.tipo, cat.dre_grupo, DATE_TRUNC('month', t.data_competencia), t.user_id;

DROP VIEW IF EXISTS public.vw_aging;
CREATE VIEW public.vw_aging
WITH (security_invoker = true) AS
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
  AND t.data_vencimento IS NOT NULL
  AND t.user_id = auth.uid();