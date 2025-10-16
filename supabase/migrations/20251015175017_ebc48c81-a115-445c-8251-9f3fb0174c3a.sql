-- Criar função para inserir categorias padrão para novos usuários
CREATE OR REPLACE FUNCTION public.criar_categorias_padrao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir categorias padrão de receitas
  INSERT INTO public.categorias (user_id, nome, tipo, dre_grupo, descricao, cor, icone, ativo) VALUES
    (NEW.id, 'Vendas de Produtos', 'receita', 'receita_bruta', 'Receita com vendas de produtos', '#10B981', '💰', true),
    (NEW.id, 'Prestação de Serviços', 'receita', 'receita_bruta', 'Receita com prestação de serviços', '#10B981', '🛠️', true),
    (NEW.id, 'Receitas Financeiras', 'receita', 'financeiro', 'Rendimentos de aplicações e juros recebidos', '#3B82F6', '📈', true),
    (NEW.id, 'Outras Receitas', 'receita', 'receita_bruta', 'Receitas diversas', '#10B981', '💵', true);

  -- Inserir categorias padrão de despesas operacionais
  INSERT INTO public.categorias (user_id, nome, tipo, dre_grupo, fixa_variavel, descricao, cor, icone, ativo) VALUES
    (NEW.id, 'Salários e Encargos', 'despesa', 'opex', 'fixa', 'Folha de pagamento e encargos trabalhistas', '#EF4444', '👥', true),
    (NEW.id, 'Aluguel', 'despesa', 'opex', 'fixa', 'Aluguel de imóveis e espaços', '#EF4444', '🏢', true),
    (NEW.id, 'Energia Elétrica', 'despesa', 'opex', 'variavel', 'Conta de luz', '#F59E0B', '⚡', true),
    (NEW.id, 'Água', 'despesa', 'opex', 'variavel', 'Conta de água', '#F59E0B', '💧', true),
    (NEW.id, 'Internet e Telefonia', 'despesa', 'opex', 'fixa', 'Serviços de comunicação', '#EF4444', '📞', true),
    (NEW.id, 'Material de Escritório', 'despesa', 'opex', 'variavel', 'Materiais de consumo', '#F59E0B', '📝', true),
    (NEW.id, 'Marketing e Publicidade', 'despesa', 'opex', 'variavel', 'Investimentos em marketing', '#F59E0B', '📢', true),
    (NEW.id, 'Transporte', 'despesa', 'opex', 'variavel', 'Despesas com transporte e combustível', '#F59E0B', '🚗', true),
    (NEW.id, 'Alimentação', 'despesa', 'opex', 'variavel', 'Refeições e alimentação', '#F59E0B', '🍽️', true),
    (NEW.id, 'Manutenção', 'despesa', 'opex', 'variavel', 'Manutenção de equipamentos e instalações', '#F59E0B', '🔧', true),
    (NEW.id, 'Serviços Profissionais', 'despesa', 'opex', 'variavel', 'Consultoria, advocacia, contabilidade', '#F59E0B', '💼', true),
    (NEW.id, 'Software e Tecnologia', 'despesa', 'opex', 'fixa', 'Assinaturas de software e serviços digitais', '#EF4444', '💻', true);

  -- Inserir categorias de despesas financeiras
  INSERT INTO public.categorias (user_id, nome, tipo, dre_grupo, fixa_variavel, descricao, cor, icone, ativo) VALUES
    (NEW.id, 'Juros e Multas', 'despesa', 'financeiro', 'variavel', 'Juros de empréstimos e multas', '#DC2626', '📉', true),
    (NEW.id, 'Tarifas Bancárias', 'despesa', 'financeiro', 'variavel', 'Taxas e tarifas bancárias', '#DC2626', '🏦', true),
    (NEW.id, 'Impostos', 'despesa', 'financeiro', 'variavel', 'Tributos e impostos', '#DC2626', '📊', true);

  RETURN NEW;
END;
$$;

-- Criar trigger para inserir categorias ao criar novo usuário
CREATE TRIGGER criar_categorias_padrao_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_categorias_padrao();