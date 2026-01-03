-- Restructure Cost Centers and Categories
-- Cost Centers are now the numbered groups (1.1, 1.2, 2.1, etc.)
-- Categories are linked to their respective Cost Centers

CREATE OR REPLACE FUNCTION public.install_restructured_model(target_user_id UUID)
RETURNS void AS $$
DECLARE
    -- CENTROS DE CUSTO (Grupos numerados)
    -- 1. ENTRADAS
    cc_prestacao_servicos UUID;
    cc_venda_produtos UUID;
    cc_vendas_geral UUID;
    cc_rec_nao_operacionais UUID;
    cc_rec_financeiras UUID;
    cc_financiamentos_entrada UUID;
    
    -- 2. SAÍDAS
    cc_custos_operacionais UUID;
    cc_pessoal_rh UUID;
    cc_administrativo UUID;
    cc_comercial_marketing UUID;
    cc_saidas_nao_operacionais UUID;
    cc_financiamentos_saida UUID;
    cc_investimentos UUID;
    
BEGIN
    -- Limpar dados existentes do usuário
    DELETE FROM public.transacoes WHERE user_id = target_user_id;
    DELETE FROM public.budgets WHERE user_id = target_user_id;
    DELETE FROM public.categorias WHERE user_id = target_user_id;
    DELETE FROM public.centros_custo WHERE user_id = target_user_id;

    -- ========================================
    -- CENTROS DE CUSTO - ENTRADAS
    -- ========================================
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, '1.1', 'Prestação de Serviços', 'departamento', true) RETURNING id INTO cc_prestacao_servicos;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, '1.2', 'Venda de Produtos', 'departamento', true) RETURNING id INTO cc_venda_produtos;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, '1.3', 'Vendas em Geral', 'departamento', true) RETURNING id INTO cc_vendas_geral;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, '1.4', 'Receitas Não Operacionais (Patrimônio e Ajustes)', 'departamento', true) RETURNING id INTO cc_rec_nao_operacionais;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, '1.5', 'Receitas Financeiras e Aplicações', 'departamento', true) RETURNING id INTO cc_rec_financeiras;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, '1.6', 'Financiamentos (Entrada de Caixa)', 'departamento', true) RETURNING id INTO cc_financiamentos_entrada;

    -- ========================================
    -- CENTROS DE CUSTO - SAÍDAS
    -- ========================================
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, '2.1', 'Custos Operacionais (Produção/Serviço)', 'departamento', true) RETURNING id INTO cc_custos_operacionais;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, '2.2', 'Pessoal e RH', 'departamento', true) RETURNING id INTO cc_pessoal_rh;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, '2.3', 'Administrativo', 'departamento', true) RETURNING id INTO cc_administrativo;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, '2.4', 'Comercial e Marketing', 'departamento', true) RETURNING id INTO cc_comercial_marketing;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, '2.5', 'Saídas Não Operacionais', 'departamento', true) RETURNING id INTO cc_saidas_nao_operacionais;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, '2.6', 'Financiamentos (Saída da Dívida)', 'departamento', true) RETURNING id INTO cc_financiamentos_saida;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, '2.7', 'Investimentos', 'departamento', true) RETURNING id INTO cc_investimentos;

    -- ========================================
    -- CATEGORIAS - 1.1 Prestação de Serviços
    -- ========================================
    INSERT INTO public.categorias (user_id, nome, tipo, centro_custo_id, codigo_contabil, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Receita de Consultoria', 'receita', cc_prestacao_servicos, '1.1.1', 'variavel', 'receita_bruta', '#10B981'),
    (target_user_id, 'Receita de Manutenção e Suporte', 'receita', cc_prestacao_servicos, '1.1.2', 'variavel', 'receita_bruta', '#10B981'),
    (target_user_id, 'Receita de Projetos', 'receita', cc_prestacao_servicos, '1.1.3', 'variavel', 'receita_bruta', '#10B981'),
    (target_user_id, 'Receita de Instalação', 'receita', cc_prestacao_servicos, '1.1.4', 'variavel', 'receita_bruta', '#10B981');

    -- ========================================
    -- CATEGORIAS - 1.2 Venda de Produtos
    -- ========================================
    INSERT INTO public.categorias (user_id, nome, tipo, centro_custo_id, codigo_contabil, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Venda de Mercadorias (Comércio)', 'receita', cc_venda_produtos, '1.2.1', 'variavel', 'receita_bruta', '#34D399'),
    (target_user_id, 'Venda de Produtos Fabricados (Indústria)', 'receita', cc_venda_produtos, '1.2.2', 'variavel', 'receita_bruta', '#34D399'),
    (target_user_id, 'Venda por E-commerce', 'receita', cc_venda_produtos, '1.2.3', 'variavel', 'receita_bruta', '#34D399'),
    (target_user_id, 'Fretes Cobrados de Clientes', 'receita', cc_venda_produtos, '1.2.4', 'variavel', 'receita_bruta', '#34D399');

    -- ========================================
    -- CATEGORIAS - 1.3 Vendas em Geral
    -- ========================================
    INSERT INTO public.categorias (user_id, nome, tipo, centro_custo_id, codigo_contabil, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Venda de Sucata ou Resíduos', 'receita', cc_vendas_geral, '1.3.1', 'variavel', 'receita_bruta', '#6EE7B7'),
    (target_user_id, 'Venda de Subprodutos', 'receita', cc_vendas_geral, '1.3.2', 'variavel', 'receita_bruta', '#6EE7B7'),
    (target_user_id, 'Outras Vendas Diversas', 'receita', cc_vendas_geral, '1.3.3', 'variavel', 'receita_bruta', '#6EE7B7');

    -- ========================================
    -- CATEGORIAS - 1.4 Receitas Não Operacionais
    -- ========================================
    INSERT INTO public.categorias (user_id, nome, tipo, centro_custo_id, codigo_contabil, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Receita de Aluguel', 'receita', cc_rec_nao_operacionais, '1.4.1', 'variavel', 'outras_receitas', '#A7F3D0'),
    (target_user_id, 'Venda de Ativo Imobilizado', 'receita', cc_rec_nao_operacionais, '1.4.2', 'variavel', 'investimento', '#A7F3D0'),
    (target_user_id, 'Indenizações de Seguros', 'receita', cc_rec_nao_operacionais, '1.4.3', 'variavel', 'outras_receitas', '#A7F3D0'),
    (target_user_id, 'Devoluções de Compras', 'receita', cc_rec_nao_operacionais, '1.4.4', 'variavel', 'outras_receitas', '#A7F3D0');

    -- ========================================
    -- CATEGORIAS - 1.5 Receitas Financeiras
    -- ========================================
    INSERT INTO public.categorias (user_id, nome, tipo, centro_custo_id, codigo_contabil, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Juros Recebidos', 'receita', cc_rec_financeiras, '1.5.1', 'variavel', 'financeiro', '#D1FAE5'),
    (target_user_id, 'Rendimentos de Aplicações Financeiras', 'receita', cc_rec_financeiras, '1.5.2', 'variavel', 'financeiro', '#D1FAE5'),
    (target_user_id, 'Descontos Obtidos de Fornecedores', 'receita', cc_rec_financeiras, '1.5.3', 'variavel', 'financeiro', '#D1FAE5');

    -- ========================================
    -- CATEGORIAS - 1.6 Financiamentos (Entrada)
    -- ========================================
    INSERT INTO public.categorias (user_id, nome, tipo, centro_custo_id, codigo_contabil, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Empréstimo Bancário Concedido', 'receita', cc_financiamentos_entrada, '1.6.1', 'variavel', 'financeiro', '#ECFDF5'),
    (target_user_id, 'Aporte de Capital dos Sócios', 'receita', cc_financiamentos_entrada, '1.6.2', 'variavel', 'financeiro', '#ECFDF5');

    -- ========================================
    -- CATEGORIAS - 2.1 Custos Operacionais
    -- ========================================
    INSERT INTO public.categorias (user_id, nome, tipo, centro_custo_id, codigo_contabil, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Compra de Matéria-Prima', 'despesa', cc_custos_operacionais, '2.1.1', 'variavel', 'cmv', '#EF4444'),
    (target_user_id, 'Compra de Mercadoria para Revenda', 'despesa', cc_custos_operacionais, '2.1.2', 'variavel', 'cmv', '#EF4444'),
    (target_user_id, 'Embalagens', 'despesa', cc_custos_operacionais, '2.1.3', 'variavel', 'cmv', '#EF4444'),
    (target_user_id, 'Serviços de Terceiros', 'despesa', cc_custos_operacionais, '2.1.4', 'variavel', 'cmv', '#EF4444'),
    (target_user_id, 'Fretes sobre Compras', 'despesa', cc_custos_operacionais, '2.1.5', 'variavel', 'cmv', '#EF4444');

    -- ========================================
    -- CATEGORIAS - 2.2 Pessoal e RH
    -- ========================================
    INSERT INTO public.categorias (user_id, nome, tipo, centro_custo_id, codigo_contabil, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Salários e Ordenados', 'despesa', cc_pessoal_rh, '2.2.1', 'fixa', 'pessoal', '#F87171'),
    (target_user_id, 'Adiantamentos Salariais', 'despesa', cc_pessoal_rh, '2.2.2', 'fixa', 'pessoal', '#F87171'),
    (target_user_id, 'Férias e 13º Salário', 'despesa', cc_pessoal_rh, '2.2.3', 'fixa', 'pessoal', '#F87171'),
    (target_user_id, 'Pro Labore (Sócios)', 'despesa', cc_pessoal_rh, '2.2.4', 'fixa', 'pessoal', '#F87171'),
    (target_user_id, 'Encargos Sociais (INSS, FGTS)', 'despesa', cc_pessoal_rh, '2.2.5', 'fixa', 'pessoal', '#F87171'),
    (target_user_id, 'Benefícios (Vale Transporte, Alimentação, Plano de Saúde)', 'despesa', cc_pessoal_rh, '2.2.6', 'fixa', 'pessoal', '#F87171');

    -- ========================================
    -- CATEGORIAS - 2.3 Administrativo
    -- ========================================
    INSERT INTO public.categorias (user_id, nome, tipo, centro_custo_id, codigo_contabil, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Aluguel do Imóvel', 'despesa', cc_administrativo, '2.3.1', 'fixa', 'administrativo', '#FCA5A5'),
    (target_user_id, 'Condomínio e IPTU', 'despesa', cc_administrativo, '2.3.2', 'fixa', 'administrativo', '#FCA5A5'),
    (target_user_id, 'Energia Elétrica, Água e Esgoto', 'despesa', cc_administrativo, '2.3.3', 'fixa', 'administrativo', '#FCA5A5'),
    (target_user_id, 'Telefonia e Internet', 'despesa', cc_administrativo, '2.3.4', 'fixa', 'administrativo', '#FCA5A5'),
    (target_user_id, 'Material de Escritório e Limpeza', 'despesa', cc_administrativo, '2.3.5', 'variavel', 'administrativo', '#FCA5A5'),
    (target_user_id, 'Contabilidade e Jurídico', 'despesa', cc_administrativo, '2.3.6', 'fixa', 'administrativo', '#FCA5A5'),
    (target_user_id, 'Softwares e Licenças', 'despesa', cc_administrativo, '2.3.7', 'fixa', 'administrativo', '#FCA5A5');

    -- ========================================
    -- CATEGORIAS - 2.4 Comercial e Marketing
    -- ========================================
    INSERT INTO public.categorias (user_id, nome, tipo, centro_custo_id, codigo_contabil, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Comissões de Vendas', 'despesa', cc_comercial_marketing, '2.4.1', 'variavel', 'cmv', '#FECACA'),
    (target_user_id, 'Verba de Propaganda (Ads, Mídias Sociais)', 'despesa', cc_comercial_marketing, '2.4.2', 'variavel', 'marketing', '#FECACA'),
    (target_user_id, 'Agência de Marketing', 'despesa', cc_comercial_marketing, '2.4.3', 'variavel', 'marketing', '#FECACA'),
    (target_user_id, 'Brindes e Eventos', 'despesa', cc_comercial_marketing, '2.4.4', 'variavel', 'marketing', '#FECACA'),
    (target_user_id, 'Viagens e Hospedagens Comerciais', 'despesa', cc_comercial_marketing, '2.4.5', 'variavel', 'marketing', '#FECACA');

    -- ========================================
    -- CATEGORIAS - 2.5 Saídas Não Operacionais
    -- ========================================
    INSERT INTO public.categorias (user_id, nome, tipo, centro_custo_id, codigo_contabil, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Devolução de Dinheiro a Clientes', 'despesa', cc_saidas_nao_operacionais, '2.5.1', 'variavel', 'outras_despesas', '#FEE2E2'),
    (target_user_id, 'Pagamento de Multas Fiscais', 'despesa', cc_saidas_nao_operacionais, '2.5.2', 'variavel', 'outras_despesas', '#FEE2E2'),
    (target_user_id, 'Doações', 'despesa', cc_saidas_nao_operacionais, '2.5.3', 'variavel', 'outras_despesas', '#FEE2E2');

    -- ========================================
    -- CATEGORIAS - 2.6 Financiamentos (Saída)
    -- ========================================
    INSERT INTO public.categorias (user_id, nome, tipo, centro_custo_id, codigo_contabil, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Juros de Financiamento', 'despesa', cc_financiamentos_saida, '2.6.1', 'variavel', 'financeiro', '#FEF2F2'),
    (target_user_id, 'Amortização', 'despesa', cc_financiamentos_saida, '2.6.2', 'variavel', 'financeiro', '#FEF2F2'),
    (target_user_id, 'Tarifas e Taxas Bancárias', 'despesa', cc_financiamentos_saida, '2.6.3', 'variavel', 'financeiro', '#FEF2F2'),
    (target_user_id, 'IOF', 'despesa', cc_financiamentos_saida, '2.6.4', 'variavel', 'financeiro', '#FEF2F2');

    -- ========================================
    -- CATEGORIAS - 2.7 Investimentos
    -- ========================================
    INSERT INTO public.categorias (user_id, nome, tipo, centro_custo_id, codigo_contabil, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Aquisição de Máquinas e Equipamentos', 'despesa', cc_investimentos, '2.7.1', 'variavel', 'investimento', '#FFFBEB'),
    (target_user_id, 'Móveis e Utensílios', 'despesa', cc_investimentos, '2.7.2', 'variavel', 'investimento', '#FFFBEB'),
    (target_user_id, 'Equipamentos de Informática (Computadores)', 'despesa', cc_investimentos, '2.7.3', 'variavel', 'investimento', '#FFFBEB'),
    (target_user_id, 'Obras e Instalações', 'despesa', cc_investimentos, '2.7.4', 'variavel', 'investimento', '#FFFBEB'),
    (target_user_id, 'Aplicações Financeiras (Saída para Guardar/Investir)', 'despesa', cc_investimentos, '2.7.5', 'variavel', 'investimento', '#FFFBEB');

END;
$$ LANGUAGE plpgsql;
