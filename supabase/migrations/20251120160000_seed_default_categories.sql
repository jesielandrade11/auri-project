-- Function to seed default categories and cost centers for a user
CREATE OR REPLACE FUNCTION public.install_default_categories(target_user_id UUID)
RETURNS void AS $$
DECLARE
    -- Variables for IDs
    cc_admin UUID;
    cc_comercial UUID;
    cc_operacional UUID;
    cc_financeiro UUID;
    cc_rh UUID;
    
    cat_receitas UUID;
    cat_despesas UUID;
    
    cat_rec_op UUID;
    cat_rec_nao_op UUID;
    
    cat_desp_var UUID;
    cat_desp_fixa UUID;
    cat_desp_fin UUID;
    cat_invest UUID;
    cat_impostos UUID;
BEGIN
    -- 1. Insert Cost Centers (Centros de Custo)
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, '100', 'Administrativo / Diretoria', 'departamento', true) RETURNING id INTO cc_admin;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, '200', 'Comercial / Vendas', 'departamento', true) RETURNING id INTO cc_comercial;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, '300', 'Operacional / Produção', 'departamento', true) RETURNING id INTO cc_operacional;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, '400', 'Financeiro', 'departamento', true) RETURNING id INTO cc_financeiro;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, '500', 'Recursos Humanos', 'departamento', true) RETURNING id INTO cc_rh;

    -- 2. Insert Categories (Plano de Contas)
    
    -- GRUPO 1: RECEITAS (ENTRADAS)
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, nivel, fixa_variavel, dre_grupo, cor, icone) VALUES
    (target_user_id, 'Receitas', '1', 'receita', 1, 'variavel', 'receita_bruta', '#10B981', 'TrendingUp') RETURNING id INTO cat_receitas;
    
        -- 1.1 Receitas Operacionais
        INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo, cor) VALUES
        (target_user_id, 'Receitas Operacionais', '1.1', 'receita', cat_receitas, 2, 'variavel', 'receita_bruta', '#34D399') RETURNING id INTO cat_rec_op;
        
            INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
            (target_user_id, 'Venda de Produtos', '1.1.1', 'receita', cat_rec_op, 3, 'variavel', 'receita_bruta'),
            (target_user_id, 'Prestação de Serviços', '1.1.2', 'receita', cat_rec_op, 3, 'variavel', 'receita_bruta'),
            (target_user_id, 'Receita Recorrente (Assinaturas)', '1.1.3', 'receita', cat_rec_op, 3, 'variavel', 'receita_bruta');

        -- 1.2 Receitas Não Operacionais
        INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo, cor) VALUES
        (target_user_id, 'Receitas Não Operacionais', '1.2', 'receita', cat_receitas, 2, 'variavel', 'outras_receitas', '#6EE7B7') RETURNING id INTO cat_rec_nao_op;
        
            INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
            (target_user_id, 'Rendimentos Financeiros', '1.2.1', 'receita', cat_rec_nao_op, 3, 'variavel', 'financeiro'),
            (target_user_id, 'Venda de Ativos', '1.2.2', 'receita', cat_rec_nao_op, 3, 'variavel', 'investimento'),
            (target_user_id, 'Outras Receitas', '1.2.3', 'receita', cat_rec_nao_op, 3, 'variavel', 'outras_receitas');

    -- GRUPO 2: DESPESAS (SAÍDAS)
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, nivel, fixa_variavel, dre_grupo, cor, icone) VALUES
    (target_user_id, 'Despesas', '2', 'despesa', 1, 'mista', 'opex', '#EF4444', 'TrendingDown') RETURNING id INTO cat_despesas;

        -- 2.1 Custos Variáveis (CMV/CSP)
        INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo, cor) VALUES
        (target_user_id, 'Custos Variáveis', '2.1', 'despesa', cat_despesas, 2, 'variavel', 'cmv', '#F87171') RETURNING id INTO cat_desp_var;
        
            INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
            (target_user_id, 'Fornecedores / Matéria Prima', '2.1.1', 'despesa', cat_desp_var, 3, 'variavel', 'cmv'),
            (target_user_id, 'Impostos sobre Vendas', '2.1.2', 'despesa', cat_desp_var, 3, 'variavel', 'impostos'),
            (target_user_id, 'Comissões de Venda', '2.1.3', 'despesa', cat_desp_var, 3, 'variavel', 'cmv'),
            (target_user_id, 'Fretes e Entregas', '2.1.4', 'despesa', cat_desp_var, 3, 'variavel', 'cmv');

        -- 2.2 Despesas Fixas (Operacionais)
        INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo, cor) VALUES
        (target_user_id, 'Despesas Operacionais (Fixas)', '2.2', 'despesa', cat_despesas, 2, 'fixa', 'opex', '#FCA5A5') RETURNING id INTO cat_desp_fixa;
        
            INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
            (target_user_id, 'Salários e Encargos', '2.2.1', 'despesa', cat_desp_fixa, 3, 'fixa', 'pessoal'),
            (target_user_id, 'Pró-labore', '2.2.2', 'despesa', cat_desp_fixa, 3, 'fixa', 'pessoal'),
            (target_user_id, 'Aluguel e Condomínio', '2.2.3', 'despesa', cat_desp_fixa, 3, 'fixa', 'administrativo'),
            (target_user_id, 'Energia, Água e Internet', '2.2.4', 'despesa', cat_desp_fixa, 3, 'fixa', 'administrativo'),
            (target_user_id, 'Marketing e Publicidade', '2.2.5', 'despesa', cat_desp_fixa, 3, 'fixa', 'marketing'),
            (target_user_id, 'Contabilidade e Jurídico', '2.2.6', 'despesa', cat_desp_fixa, 3, 'fixa', 'administrativo'),
            (target_user_id, 'Software e Licenças', '2.2.7', 'despesa', cat_desp_fixa, 3, 'fixa', 'administrativo'),
            (target_user_id, 'Manutenção e Limpeza', '2.2.8', 'despesa', cat_desp_fixa, 3, 'fixa', 'administrativo');

        -- 2.3 Despesas Financeiras
        INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo, cor) VALUES
        (target_user_id, 'Despesas Financeiras', '2.3', 'despesa', cat_despesas, 2, 'variavel', 'financeiro', '#FECACA') RETURNING id INTO cat_desp_fin;
        
            INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
            (target_user_id, 'Tarifas Bancárias', '2.3.1', 'despesa', cat_desp_fin, 3, 'variavel', 'financeiro'),
            (target_user_id, 'Juros e Multas', '2.3.2', 'despesa', cat_desp_fin, 3, 'variavel', 'financeiro');

        -- 2.4 Investimentos
        INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo, cor) VALUES
        (target_user_id, 'Investimentos', '2.4', 'despesa', cat_despesas, 2, 'variavel', 'investimento', '#FEE2E2') RETURNING id INTO cat_invest;
        
            INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
            (target_user_id, 'Compra de Equipamentos', '2.4.1', 'despesa', cat_invest, 3, 'variavel', 'investimento'),
            (target_user_id, 'Reformas e Obras', '2.4.2', 'despesa', cat_invest, 3, 'variavel', 'investimento');

END;
$$ LANGUAGE plpgsql;
