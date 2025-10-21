CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(data_inicio date, data_fim date, conta_ids uuid[], categoria_ids uuid[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  kpis json;
  faturamento_bruto numeric;
  gastos_operacionais numeric;
  lucro_operacional numeric;
  lucro_liquido numeric;
  saldo_caixa numeric;
  dias_reserva integer;
BEGIN
  -- Calcular faturamento bruto
  SELECT COALESCE(SUM(valor), 0)
  INTO faturamento_bruto
  FROM public.transacoes
  WHERE user_id = auth.uid()
    AND data_transacao BETWEEN data_inicio AND data_fim
    AND tipo = 'receita'
    AND (conta_ids IS NULL OR conta_id = ANY(conta_ids))
    AND (categoria_ids IS NULL OR categoria_id = ANY(categoria_ids));

  -- Calcular gastos operacionais
  SELECT COALESCE(SUM(valor), 0)
  INTO gastos_operacionais
  FROM public.transacoes
  WHERE user_id = auth.uid()
    AND data_transacao BETWEEN data_inicio AND data_fim
    AND tipo = 'despesa'
    AND (conta_ids IS NULL OR conta_id = ANY(conta_ids))
    AND (categoria_ids IS NULL OR categoria_id = ANY(categoria_ids));

  -- Chamar a função de saldo total
  SELECT saldo_total INTO saldo_caixa FROM public.get_saldo_total_usuario();

  -- Calcular lucro operacional e líquido
  lucro_operacional := faturamento_bruto - gastos_operacionais;
  lucro_liquido := lucro_operacional * 0.82; -- Simulação de impostos

  -- Calcular dias de reserva
  IF gastos_operacionais > 0 THEN
    dias_reserva := floor(saldo_caixa / (gastos_operacionais / GREATEST(1, data_fim - data_inicio)));
  ELSE
    dias_reserva := 999;
  END IF;

  -- Montar JSON de retorno
  kpis := json_build_object(
    'faturamentoBruto', faturamento_bruto,
    'gastosOperacionais', gastos_operacionais,
    'lucroOperacional', lucro_operacional,
    'lucroLiquido', lucro_liquido,
    'saldoCaixa', saldo_caixa,
    'diasReserva', dias_reserva,
    'roi', CASE WHEN faturamento_bruto > 0 THEN (lucro_liquido / faturamento_bruto) * 100 ELSE 0 END,
    'margens', json_build_object(
      'operacional', CASE WHEN faturamento_bruto > 0 THEN (lucro_operacional / faturamento_bruto) * 100 ELSE 0 END,
      'liquida', CASE WHEN faturamento_bruto > 0 THEN (lucro_liquido / faturamento_bruto) * 100 ELSE 0 END
    ),
    'variacoes', json_build_object( -- Valores simulados
      'faturamento', 12.5,
      'gastos', 7.2,
      'lucroOp', 18.3,
      'lucroLiq', 22.1
    )
  );

  RETURN kpis;
END;
$$;
