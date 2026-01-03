-- Enhanced Financial Model for SMEs
-- This replaces the simplified model with a comprehensive 4-level hierarchy

CREATE OR REPLACE FUNCTION public.install_enhanced_categories(target_user_id UUID)
RETURNS void AS $$
DECLARE
    -- Cost Centers
    cc_vendas UUID;
    cc_marketing UUID;
    cc_administrativo UUID;
    cc_producao UUID;
    cc_ti UUID;
    cc_rh UUID;
    cc_financeiro UUID;
    
    -- Level 1: Main Groups
    cat_entradas UUID;
    cat_saidas UUID;
    
    -- Level 2: ENTRADAS
    cat_rec_operacionais UUID;
    cat_rec_nao_operacionais UUID;
    cat_financiamento_aplicacoes UUID;
    
    -- Level 3: ENTRADAS - Receitas Operacionais
    cat_prestacao_servicos UUID;
    cat_venda_produtos UUID;
    cat_vendas_geral UUID;
    cat_royalties UUID;
    
    -- Level 3: ENTRADAS - Receitas Não Operacionais
    cat_patrimonio_imoveis UUID;
    cat_ajustes_recuperacoes UUID;
    cat_outras_receitas UUID;
    
    -- Level 3: ENTRADAS - Financiamento
    cat_receitas_financeiras UUID;
    cat_financiamento_capital UUID;
    cat_variacao_cambial_ativa UUID;
    
    -- Level 2: SAÍDAS
    cat_custos_desp_operacionais UUID;
    cat_saidas_nao_operacionais UUID;
    cat_financiamentos UUID;
    cat_investimentos UUID;
    
    -- Level 3: SAÍDAS - Operacionais
    cat_producao_servico UUID;
    cat_pessoal_rh UUID;
    cat_administrativo UUID;
    cat_comercial_marketing UUID;
    cat_manutencao_ti UUID;
    
    -- Level 3: SAÍDAS - Não Operacionais
    cat_ajustes_penalidades UUID;
    cat_perdas_diversas UUID;
    
    -- Level 3: SAÍDAS - Financiamentos
    cat_financeiro_divida UUID;
    cat_variacao_cambial_passiva UUID;
    
    -- Level 3: SAÍDAS - Investimentos
    cat_ativo_imobilizado UUID;
    cat_pesquisa_desenvolvimento UUID;
    cat_aplicacoes_financeiras UUID;
    
BEGIN
    -- ========================================
    -- CENTROS DE CUSTO
    -- ========================================
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, 'CC-100', 'Vendas', 'departamento', true) RETURNING id INTO cc_vendas;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, 'CC-200', 'Marketing', 'departamento', true) RETURNING id INTO cc_marketing;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, 'CC-300', 'Administrativo', 'departamento', true) RETURNING id INTO cc_administrativo;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, 'CC-400', 'Produção', 'departamento', true) RETURNING id INTO cc_producao;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, 'CC-500', 'TI', 'departamento', true) RETURNING id INTO cc_ti;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, 'CC-600', 'Recursos Humanos', 'departamento', true) RETURNING id INTO cc_rh;
    
    INSERT INTO public.centros_custo (user_id, codigo, nome, tipo, ativo) VALUES
    (target_user_id, 'CC-700', 'Financeiro', 'departamento', true) RETURNING id INTO cc_financeiro;

    -- ========================================
    -- NÍVEL 1: GRUPOS PRINCIPAIS
    -- ========================================
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, nivel, fixa_variavel, dre_grupo, cor, icone) VALUES
    (target_user_id, 'ENTRADAS', '1', 'receita', 1, 'variavel', 'receita_bruta', '#10B981', 'TrendingUp') RETURNING id INTO cat_entradas;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, nivel, fixa_variavel, dre_grupo, cor, icone) VALUES
    (target_user_id, 'SAÍDAS', '2', 'despesa', 1, 'mista', 'opex', '#EF4444', 'TrendingDown') RETURNING id INTO cat_saidas;

    -- ========================================
    -- NÍVEL 2: ENTRADAS
    -- ========================================
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Receitas Operacionais', '1.1', 'receita', cat_entradas, 2, 'variavel', 'receita_bruta', '#34D399') RETURNING id INTO cat_rec_operacionais;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Receitas Não Operacionais', '1.2', 'receita', cat_entradas, 2, 'variavel', 'outras_receitas', '#6EE7B7') RETURNING id INTO cat_rec_nao_operacionais;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Entradas de Financiamento e Aplicações', '1.3', 'receita', cat_entradas, 2, 'variavel', 'financeiro', '#A7F3D0') RETURNING id INTO cat_financiamento_aplicacoes;

    -- ========================================
    -- NÍVEL 3 e 4: RECEITAS OPERACIONAIS
    -- ========================================
    -- 1.1. Prestação de Serviços
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Prestação de Serviços', '1.1.1', 'receita', cat_rec_operacionais, 3, 'variavel', 'receita_bruta') RETURNING id INTO cat_prestacao_servicos;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Faturamento de Consultoria', '1.1.1.1', 'receita', cat_prestacao_servicos, 4, 'variavel', 'receita_bruta'),
    (target_user_id, 'Faturamento de Manutenção e Suporte', '1.1.1.2', 'receita', cat_prestacao_servicos, 4, 'variavel', 'receita_bruta');
    
    -- 1.2. Venda de Produtos
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Venda de Produtos', '1.1.2', 'receita', cat_rec_operacionais, 3, 'variavel', 'receita_bruta') RETURNING id INTO cat_venda_produtos;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Venda de Mercadorias (Principal)', '1.1.2.1', 'receita', cat_venda_produtos, 4, 'variavel', 'receita_bruta'),
    (target_user_id, 'Venda de Produtos Acabados', '1.1.2.2', 'receita', cat_venda_produtos, 4, 'variavel', 'receita_bruta');
    
    -- 1.3. Vendas em Geral
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Vendas em Geral', '1.1.3', 'receita', cat_rec_operacionais, 3, 'variavel', 'receita_bruta') RETURNING id INTO cat_vendas_geral;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Outras Vendas de Estoque', '1.1.3.1', 'receita', cat_vendas_geral, 4, 'variavel', 'receita_bruta'),
    (target_user_id, 'Vendas de Subprodutos', '1.1.3.2', 'receita', cat_vendas_geral, 4, 'variavel', 'receita_bruta');
    
    -- 1.4. Receitas com Royalties/Licenças
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Receitas com Royalties/Licenças', '1.1.4', 'receita', cat_rec_operacionais, 3, 'variavel', 'receita_bruta') RETURNING id INTO cat_royalties;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Receita de Licenciamento de Software', '1.1.4.1', 'receita', cat_royalties, 4, 'variavel', 'receita_bruta'),
    (target_user_id, 'Receita de Uso de Marca (Royalties)', '1.1.4.2', 'receita', cat_royalties, 4, 'variavel', 'receita_bruta');

    -- ========================================
    -- NÍVEL 3 e 4: RECEITAS NÃO OPERACIONAIS
    -- ========================================
    -- 2.1. Patrimônio e Imóveis
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Patrimônio e Imóveis', '1.2.1', 'receita', cat_rec_nao_operacionais, 3, 'variavel', 'outras_receitas') RETURNING id INTO cat_patrimonio_imoveis;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Receita de Aluguel de Ativos', '1.2.1.1', 'receita', cat_patrimonio_imoveis, 4, 'variavel', 'outras_receitas'),
    (target_user_id, 'Venda de Ativo Imobilizado (Sucata)', '1.2.1.2', 'receita', cat_patrimonio_imoveis, 4, 'variavel', 'investimento');
    
    -- 2.2. Ajustes e Recuperações
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Ajustes e Recuperações', '1.2.2', 'receita', cat_rec_nao_operacionais, 3, 'variavel', 'outras_receitas') RETURNING id INTO cat_ajustes_recuperacoes;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Devoluções de Compras (Receita)', '1.2.2.1', 'receita', cat_ajustes_recuperacoes, 4, 'variavel', 'outras_receitas'),
    (target_user_id, 'Reversão de Provisões', '1.2.2.2', 'receita', cat_ajustes_recuperacoes, 4, 'variavel', 'outras_receitas');
    
    -- 2.3. Outras Receitas
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Outras Receitas', '1.2.3', 'receita', cat_rec_nao_operacionais, 3, 'variavel', 'outras_receitas') RETURNING id INTO cat_outras_receitas;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Indenizações Recebidas (Seguro)', '1.2.3.1', 'receita', cat_outras_receitas, 4, 'variavel', 'outras_receitas');

    -- ========================================
    -- NÍVEL 3 e 4: FINANCIAMENTO E APLICAÇÕES
    -- ========================================
    -- 3.1. Receitas Financeiras
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Receitas Financeiras', '1.3.1', 'receita', cat_financiamento_aplicacoes, 3, 'variavel', 'financeiro') RETURNING id INTO cat_receitas_financeiras;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Juros Recebidos (Aplicações)', '1.3.1.1', 'receita', cat_receitas_financeiras, 4, 'variavel', 'financeiro'),
    (target_user_id, 'Rendimentos de Aplicações Financeiras', '1.3.1.2', 'receita', cat_receitas_financeiras, 4, 'variavel', 'financeiro');
    
    -- 3.2. Financiamento de Capital
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Financiamento de Capital', '1.3.2', 'receita', cat_financiamento_aplicacoes, 3, 'variavel', 'financeiro') RETURNING id INTO cat_financiamento_capital;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Empréstimo Bancário Recebido', '1.3.2.1', 'receita', cat_financiamento_capital, 4, 'variavel', 'financeiro'),
    (target_user_id, 'Aporte de Capital (Sócios)', '1.3.2.2', 'receita', cat_financiamento_capital, 4, 'variavel', 'financeiro');
    
    -- 3.3. Variação Cambial Ativa
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Variação Cambial', '1.3.3', 'receita', cat_financiamento_aplicacoes, 3, 'variavel', 'financeiro') RETURNING id INTO cat_variacao_cambial_ativa;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Variação Cambial Ativa (Ganhos)', '1.3.3.1', 'receita', cat_variacao_cambial_ativa, 4, 'variavel', 'financeiro');

    -- ========================================
    -- NÍVEL 2: SAÍDAS
    -- ========================================
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Custos e Despesas Operacionais', '2.1', 'despesa', cat_saidas, 2, 'mista', 'opex', '#F87171') RETURNING id INTO cat_custos_desp_operacionais;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Saídas Não Operacionais', '2.2', 'despesa', cat_saidas, 2, 'variavel', 'outras_despesas', '#FCA5A5') RETURNING id INTO cat_saidas_nao_operacionais;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Financiamentos', '2.3', 'despesa', cat_saidas, 2, 'variavel', 'financeiro', '#FECACA') RETURNING id INTO cat_financiamentos;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo, cor) VALUES
    (target_user_id, 'Investimentos', '2.4', 'despesa', cat_saidas, 2, 'variavel', 'investimento', '#FEE2E2') RETURNING id INTO cat_investimentos;

    -- ========================================
    -- NÍVEL 3 e 4: CUSTOS E DESPESAS OPERACIONAIS
    -- ========================================
    -- 1.1. Produção/Serviço
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Produção/Serviço', '2.1.1', 'despesa', cat_custos_desp_operacionais, 3, 'variavel', 'cmv') RETURNING id INTO cat_producao_servico;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Custo da Mercadoria Vendida (CMV)', '2.1.1.1', 'despesa', cat_producao_servico, 4, 'variavel', 'cmv'),
    (target_user_id, 'Custo do Serviço Prestado (CSP)', '2.1.1.2', 'despesa', cat_producao_servico, 4, 'variavel', 'cmv'),
    (target_user_id, 'Matéria-prima e Insumos', '2.1.1.3', 'despesa', cat_producao_servico, 4, 'variavel', 'cmv');
    
    -- 1.2. Pessoal e RH
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Pessoal e RH', '2.1.2', 'despesa', cat_custos_desp_operacionais, 3, 'fixa', 'pessoal') RETURNING id INTO cat_pessoal_rh;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Salários e Proventos', '2.1.2.1', 'despesa', cat_pessoal_rh, 4, 'fixa', 'pessoal'),
    (target_user_id, 'Encargos Sociais (INSS, FGTS)', '2.1.2.2', 'despesa', cat_pessoal_rh, 4, 'fixa', 'pessoal'),
    (target_user_id, 'Benefícios (Vale-transporte, Plano de Saúde)', '2.1.2.3', 'despesa', cat_pessoal_rh, 4, 'fixa', 'pessoal');
    
    -- 1.3. Administrativo
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Administrativo', '2.1.3', 'despesa', cat_custos_desp_operacionais, 3, 'fixa', 'administrativo') RETURNING id INTO cat_administrativo;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Despesas de Aluguel do Escritório', '2.1.3.1', 'despesa', cat_administrativo, 4, 'fixa', 'administrativo'),
    (target_user_id, 'Contas de Consumo (Água, Luz, Internet)', '2.1.3.2', 'despesa', cat_administrativo, 4, 'fixa', 'administrativo'),
    (target_user_id, 'Softwares e Licenças (ERP, CRM)', '2.1.3.3', 'despesa', cat_administrativo, 4, 'fixa', 'administrativo');
    
    -- 1.4. Comercial e Marketing
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Comercial e Marketing', '2.1.4', 'despesa', cat_custos_desp_operacionais, 3, 'variavel', 'marketing') RETURNING id INTO cat_comercial_marketing;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Despesas com Publicidade e Propaganda', '2.1.4.1', 'despesa', cat_comercial_marketing, 4, 'variavel', 'marketing'),
    (target_user_id, 'Comissões de Vendas', '2.1.4.2', 'despesa', cat_comercial_marketing, 4, 'variavel', 'cmv'),
    (target_user_id, 'Viagens e Despesas de Vendas', '2.1.4.3', 'despesa', cat_comercial_marketing, 4, 'variavel', 'marketing');
    
    -- 1.5. Manutenção e TI
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Manutenção e TI', '2.1.5', 'despesa', cat_custos_desp_operacionais, 3, 'variavel', 'administrativo') RETURNING id INTO cat_manutencao_ti;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Manutenção de Equipamentos', '2.1.5.1', 'despesa', cat_manutencao_ti, 4, 'variavel', 'administrativo'),
    (target_user_id, 'Suprimentos de Informática', '2.1.5.2', 'despesa', cat_manutencao_ti, 4, 'variavel', 'administrativo');

    -- ========================================
    -- NÍVEL 3 e 4: SAÍDAS NÃO OPERACIONAIS
    -- ========================================
    -- 2.1. Ajustes e Penalidades
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Ajustes e Penalidades', '2.2.1', 'despesa', cat_saidas_nao_operacionais, 3, 'variavel', 'outras_despesas') RETURNING id INTO cat_ajustes_penalidades;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Devolução de Dinheiro a Clientes', '2.2.1.1', 'despesa', cat_ajustes_penalidades, 4, 'variavel', 'outras_despesas'),
    (target_user_id, 'Multas e Juros por Atraso de Pagamento', '2.2.1.2', 'despesa', cat_ajustes_penalidades, 4, 'variavel', 'financeiro');
    
    -- 2.2. Perdas Diversas
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Perdas Diversas', '2.2.2', 'despesa', cat_saidas_nao_operacionais, 3, 'variavel', 'outras_despesas') RETURNING id INTO cat_perdas_diversas;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Perdas por Bens Danificados', '2.2.2.1', 'despesa', cat_perdas_diversas, 4, 'variavel', 'outras_despesas'),
    (target_user_id, 'Perdas com Baixa de Estoque', '2.2.2.2', 'despesa', cat_perdas_diversas, 4, 'variavel', 'cmv');

    -- ========================================
    -- NÍVEL 3 e 4: FINANCIAMENTOS
    -- ========================================
    -- 3.1. Financeiro (Dívida)
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Financeiro (Dívida)', '2.3.1', 'despesa', cat_financiamentos, 3, 'variavel', 'financeiro') RETURNING id INTO cat_financeiro_divida;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Juros de Financiamento', '2.3.1.1', 'despesa', cat_financeiro_divida, 4, 'variavel', 'financeiro'),
    (target_user_id, 'Amortização (Pagamento do Principal)', '2.3.1.2', 'despesa', cat_financeiro_divida, 4, 'variavel', 'financeiro'),
    (target_user_id, 'IOF e Taxas Bancárias', '2.3.1.3', 'despesa', cat_financeiro_divida, 4, 'variavel', 'financeiro');
    
    -- 3.2. Variação Cambial Passiva
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Variação Cambial', '2.3.2', 'despesa', cat_financiamentos, 3, 'variavel', 'financeiro') RETURNING id INTO cat_variacao_cambial_passiva;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Variação Cambial Passiva (Perdas)', '2.3.2.1', 'despesa', cat_variacao_cambial_passiva, 4, 'variavel', 'financeiro');

    -- ========================================
    -- NÍVEL 3 e 4: INVESTIMENTOS
    -- ========================================
    -- 4.1. Ativo Imobilizado
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Ativo Imobilizado', '2.4.1', 'despesa', cat_investimentos, 3, 'variavel', 'investimento') RETURNING id INTO cat_ativo_imobilizado;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Compra de Equipamentos e Máquinas', '2.4.1.1', 'despesa', cat_ativo_imobilizado, 4, 'variavel', 'investimento'),
    (target_user_id, 'Melhorias e Obras em Imóveis', '2.4.1.2', 'despesa', cat_ativo_imobilizado, 4, 'variavel', 'investimento');
    
    -- 4.2. Pesquisa e Desenvolvimento
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Pesquisa e Desenvolvimento (P&D)', '2.4.2', 'despesa', cat_investimentos, 3, 'variavel', 'investimento') RETURNING id INTO cat_pesquisa_desenvolvimento;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Custos de Desenvolvimento de Novos Produtos', '2.4.2.1', 'despesa', cat_pesquisa_desenvolvimento, 4, 'variavel', 'investimento'),
    (target_user_id, 'Aquisição de Patentes e Marcas', '2.4.2.2', 'despesa', cat_pesquisa_desenvolvimento, 4, 'variavel', 'investimento');
    
    -- 4.3. Aplicações Financeiras
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Aplicações Financeiras', '2.4.3', 'despesa', cat_investimentos, 3, 'variavel', 'investimento') RETURNING id INTO cat_aplicacoes_financeiras;
    
    INSERT INTO public.categorias (user_id, nome, codigo_contabil, tipo, categoria_pai_id, nivel, fixa_variavel, dre_grupo) VALUES
    (target_user_id, 'Compra de Títulos e Valores Mobiliários', '2.4.3.1', 'despesa', cat_aplicacoes_financeiras, 4, 'variavel', 'investimento');

END;
$$ LANGUAGE plpgsql;
