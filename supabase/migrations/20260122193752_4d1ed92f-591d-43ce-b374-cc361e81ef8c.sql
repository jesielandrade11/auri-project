-- Atualizar a função criar_categorias_padrao para criar centro de custo antes das categorias
CREATE OR REPLACE FUNCTION public.criar_categorias_padrao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  centro_custo_padrao_id UUID;
BEGIN
  -- 1. Criar um centro de custo padrão para o novo usuário
  INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo)
  VALUES (NEW.id, 'GERAL', 'Centro de Custo Geral', 'operacional', true)
  RETURNING id INTO centro_custo_padrao_id;

  -- 2. Inserir categorias padrão de receitas COM centro_custo_id
  INSERT INTO public.categorias (user_id, nome, tipo, dre_grupo, descricao, cor, icone, ativo, centro_custo_id) VALUES
    (NEW.id, 'Vendas de Produtos', 'receita', 'receita_bruta', 'Receita com vendas de produtos', '#10B981', '💰', true, centro_custo_padrao_id),
    (NEW.id, 'Prestação de Serviços', 'receita', 'receita_bruta', 'Receita com prestação de serviços', '#10B981', '🛠️', true, centro_custo_padrao_id),
    (NEW.id, 'Receitas Financeiras', 'receita', 'financeiro', 'Rendimentos de aplicações e juros recebidos', '#3B82F6', '📈', true, centro_custo_padrao_id),
    (NEW.id, 'Outras Receitas', 'receita', 'receita_bruta', 'Receitas diversas', '#10B981', '💵', true, centro_custo_padrao_id);

  -- 3. Inserir categorias padrão de despesas operacionais COM centro_custo_id
  INSERT INTO public.categorias (user_id, nome, tipo, dre_grupo, fixa_variavel, descricao, cor, icone, ativo, centro_custo_id) VALUES
    (NEW.id, 'Salários e Encargos', 'despesa', 'opex', 'fixa', 'Folha de pagamento e encargos trabalhistas', '#EF4444', '👥', true, centro_custo_padrao_id),
    (NEW.id, 'Aluguel', 'despesa', 'opex', 'fixa', 'Aluguel de imóveis e espaços', '#EF4444', '🏢', true, centro_custo_padrao_id),
    (NEW.id, 'Energia Elétrica', 'despesa', 'opex', 'variavel', 'Conta de luz', '#F59E0B', '⚡', true, centro_custo_padrao_id),
    (NEW.id, 'Água', 'despesa', 'opex', 'variavel', 'Conta de água', '#F59E0B', '💧', true, centro_custo_padrao_id),
    (NEW.id, 'Internet e Telefonia', 'despesa', 'opex', 'fixa', 'Serviços de comunicação', '#EF4444', '📞', true, centro_custo_padrao_id),
    (NEW.id, 'Material de Escritório', 'despesa', 'opex', 'variavel', 'Materiais de consumo', '#F59E0B', '📝', true, centro_custo_padrao_id),
    (NEW.id, 'Marketing e Publicidade', 'despesa', 'opex', 'variavel', 'Investimentos em marketing', '#F59E0B', '📢', true, centro_custo_padrao_id),
    (NEW.id, 'Transporte', 'despesa', 'opex', 'variavel', 'Despesas com transporte e combustível', '#F59E0B', '🚗', true, centro_custo_padrao_id),
    (NEW.id, 'Alimentação', 'despesa', 'opex', 'variavel', 'Refeições e alimentação', '#F59E0B', '🍽️', true, centro_custo_padrao_id),
    (NEW.id, 'Manutenção', 'despesa', 'opex', 'variavel', 'Manutenção de equipamentos e instalações', '#F59E0B', '🔧', true, centro_custo_padrao_id),
    (NEW.id, 'Serviços Profissionais', 'despesa', 'opex', 'variavel', 'Consultoria, advocacia, contabilidade', '#F59E0B', '💼', true, centro_custo_padrao_id),
    (NEW.id, 'Software e Tecnologia', 'despesa', 'opex', 'fixa', 'Assinaturas de software e serviços digitais', '#EF4444', '💻', true, centro_custo_padrao_id);

  -- 4. Inserir categorias de despesas financeiras COM centro_custo_id
  INSERT INTO public.categorias (user_id, nome, tipo, dre_grupo, fixa_variavel, descricao, cor, icone, ativo, centro_custo_id) VALUES
    (NEW.id, 'Juros e Multas', 'despesa', 'financeiro', 'variavel', 'Juros de empréstimos e multas', '#DC2626', '📉', true, centro_custo_padrao_id),
    (NEW.id, 'Tarifas Bancárias', 'despesa', 'financeiro', 'variavel', 'Taxas e tarifas bancárias', '#DC2626', '🏦', true, centro_custo_padrao_id),
    (NEW.id, 'Impostos', 'despesa', 'financeiro', 'variavel', 'Tributos e impostos', '#DC2626', '📊', true, centro_custo_padrao_id);

  RETURN NEW;
END;
$$;