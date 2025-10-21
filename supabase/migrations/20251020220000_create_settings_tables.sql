-- =====================================================
-- TABELA DE CONFIGURAÇÕES DO USUÁRIO
-- =====================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Preferências Gerais
  idioma VARCHAR(10) DEFAULT 'pt-BR',
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  moeda VARCHAR(3) DEFAULT 'BRL',
  formato_data VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  formato_hora VARCHAR(20) DEFAULT '24h',
  
  -- Preferências Financeiras
  primeiro_dia_semana INTEGER DEFAULT 0, -- 0 = domingo, 1 = segunda
  primeiro_mes_ano_fiscal INTEGER DEFAULT 1, -- 1 = janeiro
  casas_decimais INTEGER DEFAULT 2,
  separador_decimal VARCHAR(1) DEFAULT ',',
  separador_milhares VARCHAR(1) DEFAULT '.',
  
  -- Dashboard
  dashboard_padrao VARCHAR(50) DEFAULT 'executive',
  kpis_favoritos JSONB DEFAULT '["faturamento", "lucro", "margem", "caixa"]'::jsonb,
  periodo_padrao_dashboard VARCHAR(20) DEFAULT 'mes_atual',
  granularidade_padrao VARCHAR(20) DEFAULT 'mensal',
  
  -- Notificações
  notificacoes_email BOOLEAN DEFAULT true,
  notificacoes_push BOOLEAN DEFAULT true,
  notificacoes_sistema BOOLEAN DEFAULT true,
  
  -- Importação/Exportação
  auto_categorizar BOOLEAN DEFAULT true,
  permitir_duplicatas BOOLEAN DEFAULT false,
  backup_automatico BOOLEAN DEFAULT true,
  frequencia_backup VARCHAR(20) DEFAULT 'semanal',
  
  -- Segurança
  autenticacao_dois_fatores BOOLEAN DEFAULT false,
  sessao_expira_minutos INTEGER DEFAULT 480, -- 8 horas
  exigir_senha_acoes_criticas BOOLEAN DEFAULT true,
  
  -- UI/UX
  tema VARCHAR(20) DEFAULT 'light',
  modo_compacto BOOLEAN DEFAULT false,
  animacoes_habilitadas BOOLEAN DEFAULT true,
  som_notificacoes BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_user_settings UNIQUE(user_id)
);

-- Index
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias configurações"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias configurações"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias configurações"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TABELA DE NOTIFICAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Alertas Financeiros
  alerta_saldo_baixo BOOLEAN DEFAULT true,
  alerta_saldo_baixo_valor DECIMAL(15,2) DEFAULT 1000.00,
  alerta_vencimentos BOOLEAN DEFAULT true,
  alerta_vencimentos_dias INTEGER DEFAULT 3,
  alerta_orcamento_excedido BOOLEAN DEFAULT true,
  alerta_orcamento_percentual INTEGER DEFAULT 90,
  
  -- Relatórios Automáticos
  relatorio_diario BOOLEAN DEFAULT false,
  relatorio_semanal BOOLEAN DEFAULT true,
  relatorio_mensal BOOLEAN DEFAULT true,
  dia_relatorio_semanal INTEGER DEFAULT 1, -- 1 = segunda
  dia_relatorio_mensal INTEGER DEFAULT 1,
  
  -- Lembretes
  lembrete_conciliacao BOOLEAN DEFAULT true,
  lembrete_conciliacao_frequencia VARCHAR(20) DEFAULT 'semanal',
  lembrete_categorizacao BOOLEAN DEFAULT true,
  lembrete_backup BOOLEAN DEFAULT true,
  
  -- Canais de Notificação
  email_alertas TEXT,
  email_relatorios TEXT,
  whatsapp TEXT,
  telegram_chat_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_notification_settings UNIQUE(user_id)
);

-- Index
CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);

-- RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar suas notificações"
  ON notification_settings FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- TABELA DE INTEGRAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_bancaria_id UUID REFERENCES contas_bancarias(id) ON DELETE CASCADE,
  
  -- Dados da Integração
  provider VARCHAR(50) NOT NULL, -- pluggy, belvo, celcoin, openfinance
  status VARCHAR(20) DEFAULT 'disconnected', -- connected, disconnected, error
  
  -- Credenciais (CRIPTOGRAFADAS - não salvar em plain text em produção)
  credentials_encrypted TEXT,
  
  -- IDs externos
  external_id TEXT,
  external_account_id TEXT,
  
  -- Sincronização
  last_sync TIMESTAMPTZ,
  sync_frequency VARCHAR(20) DEFAULT '6h', -- 6h, 12h, 24h, manual
  auto_sync BOOLEAN DEFAULT true,
  
  -- Configurações específicas
  sync_days_back INTEGER DEFAULT 90,
  import_categorized BOOLEAN DEFAULT true,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_integration_per_account UNIQUE(conta_bancaria_id, provider)
);

-- Indexes
CREATE INDEX idx_integrations_user_id ON integrations(user_id);
CREATE INDEX idx_integrations_conta_id ON integrations(conta_bancaria_id);
CREATE INDEX idx_integrations_status ON integrations(status);

-- RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar suas integrações"
  ON integrations FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- TABELA DE LOGS DE IMPORTAÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_bancaria_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL,
  
  -- Dados da Importação
  tipo VARCHAR(20) NOT NULL, -- file, api, manual
  formato VARCHAR(10), -- ofx, csv, pdf
  provider VARCHAR(50), -- pluggy, belvo, etc
  arquivo_nome TEXT,
  
  -- Resultados
  status VARCHAR(20) DEFAULT 'processing', -- processing, success, error, partial
  transacoes_importadas INTEGER DEFAULT 0,
  transacoes_duplicadas INTEGER DEFAULT 0,
  transacoes_ignoradas INTEGER DEFAULT 0,
  
  -- Detalhes
  erros JSONB DEFAULT '[]'::jsonb,
  avisos JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_import_logs_user_id ON import_logs(user_id);
CREATE INDEX idx_import_logs_conta_id ON import_logs(conta_bancaria_id);
CREATE INDEX idx_import_logs_status ON import_logs(status);
CREATE INDEX idx_import_logs_created_at ON import_logs(created_at DESC);

-- RLS
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus logs"
  ON import_logs FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- TABELA DE AUDITORIA
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Ação
  tabela VARCHAR(50) NOT NULL,
  acao VARCHAR(20) NOT NULL, -- insert, update, delete
  registro_id UUID,
  
  -- Dados
  dados_anteriores JSONB,
  dados_novos JSONB,
  
  -- Contexto
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_tabela ON audit_logs(tabela);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus logs de auditoria"
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNÇÃO PARA CRIAR CONFIGURAÇÕES PADRÃO
-- =====================================================
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar configurações ao criar usuário
CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_user_settings();

-- =====================================================
-- ATUALIZAR TABELA DE CONTAS BANCÁRIAS
-- =====================================================
ALTER TABLE contas_bancarias
ADD COLUMN IF NOT EXISTS api_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS api_status VARCHAR(20) DEFAULT 'disconnected',
ADD COLUMN IF NOT EXISTS api_last_sync TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS api_auto_sync BOOLEAN DEFAULT false;

-- =====================================================
-- FUNÇÃO PARA ATUALIZAR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE user_settings IS 'Configurações gerais do usuário';
COMMENT ON TABLE notification_settings IS 'Configurações de notificações e alertas';
COMMENT ON TABLE integrations IS 'Integrações com APIs bancárias';
COMMENT ON TABLE import_logs IS 'Logs de importações de arquivos e APIs';
COMMENT ON TABLE audit_logs IS 'Logs de auditoria de todas as ações';
