CREATE OR REPLACE FUNCTION public.get_saldo_total_usuario()
RETURNS TABLE(saldo_total numeric)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT SUM(saldo_atual)
  FROM public.contas_bancarias
  WHERE user_id = auth.uid();
$$;
