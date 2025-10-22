-- Performance indexes for foreign keys and common filters
-- contas_bancarias
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_user_id ON public.contas_bancarias(user_id);

-- categorias
CREATE INDEX IF NOT EXISTS idx_categorias_user_id ON public.categorias(user_id);
CREATE INDEX IF NOT EXISTS idx_categorias_categoria_pai_id ON public.categorias(categoria_pai_id);
CREATE INDEX IF NOT EXISTS idx_categorias_centro_custo_id ON public.categorias(centro_custo_id);

-- centros_custo
CREATE INDEX IF NOT EXISTS idx_centros_custo_user_id ON public.centros_custo(user_id);
CREATE INDEX IF NOT EXISTS idx_centros_custo_centro_pai_id ON public.centros_custo(centro_pai_id);

-- transacoes
CREATE INDEX IF NOT EXISTS idx_transacoes_user_id ON public.transacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_conta_id ON public.transacoes(conta_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_categoria_id ON public.transacoes(categoria_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_centro_custo_id ON public.transacoes(centro_custo_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_contraparte_id ON public.transacoes(contraparte_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_recorrencia_id ON public.transacoes(recorrencia_id);

-- alocacoes_transacao
CREATE INDEX IF NOT EXISTS idx_alocacoes_transacao_transacao_id ON public.alocacoes_transacao(transacao_id);
CREATE INDEX IF NOT EXISTS idx_alocacoes_transacao_categoria_id ON public.alocacoes_transacao(categoria_id);
CREATE INDEX IF NOT EXISTS idx_alocacoes_transacao_centro_custo_id ON public.alocacoes_transacao(centro_custo_id);

-- contrapartes
CREATE INDEX IF NOT EXISTS idx_contrapartes_user_id ON public.contrapartes(user_id);

-- dda_boletos
CREATE INDEX IF NOT EXISTS idx_dda_boletos_user_id ON public.dda_boletos(user_id);
CREATE INDEX IF NOT EXISTS idx_dda_boletos_conta_bancaria_id ON public.dda_boletos(conta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_dda_boletos_transacao_id ON public.dda_boletos(transacao_id);

-- importacoes
CREATE INDEX IF NOT EXISTS idx_importacoes_user_id ON public.importacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_importacoes_conta_bancaria_id ON public.importacoes(conta_bancaria_id);

-- budgets
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_categoria_id ON public.budgets(categoria_id);
CREATE INDEX IF NOT EXISTS idx_budgets_centro_custo_id ON public.budgets(centro_custo_id);

-- RLS optimization: replace auth.uid() with (select auth.uid()) to avoid initplan re-evaluation
-- budgets
ALTER POLICY "Users can view their own budgets" ON public.budgets USING (user_id = (select auth.uid()));
ALTER POLICY "Users can insert their own budgets" ON public.budgets WITH CHECK (user_id = (select auth.uid()));
ALTER POLICY "Users can update their own budgets" ON public.budgets USING (user_id = (select auth.uid()));
ALTER POLICY "Users can delete their own budgets" ON public.budgets USING (user_id = (select auth.uid()));

-- categorias
ALTER POLICY "Users can view their own categorias" ON public.categorias USING (user_id = (select auth.uid()));
ALTER POLICY "Users can insert their own categorias" ON public.categorias WITH CHECK (user_id = (select auth.uid()));
ALTER POLICY "Users can update their own categorias" ON public.categorias USING (user_id = (select auth.uid()));
ALTER POLICY "Users can delete their own categorias" ON public.categorias USING (user_id = (select auth.uid()));

-- centros_custo
ALTER POLICY "Users can view their own centros" ON public.centros_custo USING (user_id = (select auth.uid()));
ALTER POLICY "Users can insert their own centros" ON public.centros_custo WITH CHECK (user_id = (select auth.uid()));
ALTER POLICY "Users can update their own centros" ON public.centros_custo USING (user_id = (select auth.uid()));
ALTER POLICY "Users can delete their own centros" ON public.centros_custo USING (user_id = (select auth.uid()));

-- contas_bancarias
ALTER POLICY "Users can view their own contas" ON public.contas_bancarias USING (user_id = (select auth.uid()));
ALTER POLICY "Users can insert their own contas" ON public.contas_bancarias WITH CHECK (user_id = (select auth.uid()));
ALTER POLICY "Users can update their own contas" ON public.contas_bancarias USING (user_id = (select auth.uid()));
ALTER POLICY "Users can delete their own contas" ON public.contas_bancarias USING (user_id = (select auth.uid()));

-- contrapartes
ALTER POLICY "Users can view their own contrapartes" ON public.contrapartes USING (user_id = (select auth.uid()));
ALTER POLICY "Users can insert their own contrapartes" ON public.contrapartes WITH CHECK (user_id = (select auth.uid()));
ALTER POLICY "Users can update their own contrapartes" ON public.contrapartes USING (user_id = (select auth.uid()));
ALTER POLICY "Users can delete their own contrapartes" ON public.contrapartes USING (user_id = (select auth.uid()));

-- dda_boletos
ALTER POLICY "Users can view their own DDA boletos" ON public.dda_boletos USING (user_id = (select auth.uid()));
ALTER POLICY "Users can insert their own DDA boletos" ON public.dda_boletos WITH CHECK (user_id = (select auth.uid()));
ALTER POLICY "Users can update their own DDA boletos" ON public.dda_boletos USING (user_id = (select auth.uid()));
ALTER POLICY "Users can delete their own DDA boletos" ON public.dda_boletos USING (user_id = (select auth.uid()));

-- importacoes (policy names in PT-BR)
ALTER POLICY "Usuários podem ver suas próprias importações" ON public.importacoes USING (user_id = (select auth.uid()));
ALTER POLICY "Usuários podem criar importações" ON public.importacoes WITH CHECK (user_id = (select auth.uid()));
ALTER POLICY "Usuários podem atualizar suas importações" ON public.importacoes USING (user_id = (select auth.uid()));

-- transacoes
ALTER POLICY "Users can view their own transacoes" ON public.transacoes USING (user_id = (select auth.uid()));
ALTER POLICY "Users can insert their own transacoes" ON public.transacoes WITH CHECK (user_id = (select auth.uid()));
ALTER POLICY "Users can update their own transacoes" ON public.transacoes USING (user_id = (select auth.uid()));
ALTER POLICY "Users can delete their own transacoes" ON public.transacoes USING (user_id = (select auth.uid()));

-- alocacoes_transacao (EXISTS clauses)
ALTER POLICY "Users can view allocations of their transactions" ON public.alocacoes_transacao
USING (EXISTS (
  SELECT 1 FROM public.transacoes t
  WHERE t.id = alocacoes_transacao.transacao_id AND t.user_id = (select auth.uid())
));

ALTER POLICY "Users can insert allocations for their transactions" ON public.alocacoes_transacao
WITH CHECK (EXISTS (
  SELECT 1 FROM public.transacoes t
  WHERE t.id = alocacoes_transacao.transacao_id AND t.user_id = (select auth.uid())
));

ALTER POLICY "Users can update allocations of their transactions" ON public.alocacoes_transacao
USING (EXISTS (
  SELECT 1 FROM public.transacoes t
  WHERE t.id = alocacoes_transacao.transacao_id AND t.user_id = (select auth.uid())
));

ALTER POLICY "Users can delete allocations of their transactions" ON public.alocacoes_transacao
USING (EXISTS (
  SELECT 1 FROM public.transacoes t
  WHERE t.id = alocacoes_transacao.transacao_id AND t.user_id = (select auth.uid())
));
