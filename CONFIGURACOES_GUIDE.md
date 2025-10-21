# ⚙️ Guia Completo de Configurações

## 🎯 Visão Geral

Sistema completo de configurações inspirado em QuickBooks, Conta Azul e Omie, com 7 seções principais e backend completo no Supabase.

---

## 📦 Arquivos Criados

### Backend (Supabase)
```sql
supabase/migrations/20251020220000_create_settings_tables.sql
```
**Tabelas criadas:**
- `user_settings` - Configurações gerais do usuário
- `notification_settings` - Preferências de notificações
- `integrations` - Integrações com APIs
- `import_logs` - Histórico de importações
- `audit_logs` - Logs de auditoria

**Triggers:**
- Auto-criação de configurações padrão ao criar usuário
- Auto-update de `updated_at`

### Frontend - Serviços
```typescript
src/services/settingsService.ts
```
**Funções:**
- `getUserSettings()` / `updateUserSettings()`
- `getNotificationSettings()` / `updateNotificationSettings()`
- `exportData()` / `downloadBlob()`
- `resetToDefault()` / `clearCache()`
- `getImportLogs()` / `getAuditLogs()`

### Frontend - Componentes
```typescript
src/components/settings/
├── UserProfile.tsx              - Perfil do usuário
├── GeneralSettings.tsx          - Configurações gerais
├── NotificationSettings.tsx     - Notificações e alertas
├── SecuritySettings.tsx         - Segurança e senha
├── AppearanceSettings.tsx       - Tema e interface
├── IntegrationSettings.tsx      - APIs e integrações
└── DataExport.tsx               - Exportação de dados
```

### Frontend - Página
```typescript
src/pages/Configuracoes.tsx      - Página principal
```

---

## 🎨 Seções de Configuração

### 1️⃣ **Perfil** (`UserProfile`)

**Funcionalidades:**
- ✅ Foto de perfil (avatar)
- ✅ Nome completo
- ✅ E-mail (somente leitura)
- ✅ Telefone
- ✅ Informações da empresa
  - Nome da empresa
  - CNPJ
  - Endereço
- ✅ Salvar alterações

**Campos:**
```typescript
- nome_completo: string
- email: string (readonly)
- telefone: string
- nome_empresa: string
- documento_empresa: string (CNPJ)
- endereco: string
- avatar_url: string
```

---

### 2️⃣ **Geral** (`GeneralSettings`)

**Funcionalidades:**
- ✅ Idioma (Português, English, Español)
- ✅ Fuso horário (Brasília, Manaus, etc.)
- ✅ Moeda (BRL, USD, EUR)
- ✅ Formato de data (DD/MM/YYYY, MM/DD/YYYY, etc.)
- ✅ Formato de hora (24h, 12h)
- ✅ Casas decimais (0, 2, 4)
- ✅ Primeiro dia da semana
- ✅ Primeiro mês do ano fiscal
- ✅ Dashboard padrão
- ✅ Período padrão do dashboard

**Campos:**
```typescript
- idioma: 'pt-BR' | 'en-US' | 'es-ES'
- timezone: string
- moeda: 'BRL' | 'USD' | 'EUR'
- formato_data: string
- formato_hora: '24h' | '12h'
- casas_decimais: 0 | 2 | 4
- primeiro_dia_semana: 0-6
- primeiro_mes_ano_fiscal: 1-12
- dashboard_padrao: string
- periodo_padrao_dashboard: string
```

---

### 3️⃣ **Notificações** (`NotificationSettings`)

**Funcionalidades:**

**Canais:**
- ✅ E-mail
- ✅ Push (navegador)
- ✅ Sistema (in-app)

**Alertas Financeiros:**
- ✅ Saldo baixo (com valor configurável)
- ✅ Vencimentos próximos (com dias de antecedência)
- ✅ Orçamento excedido (com % configurável)

**Relatórios Automáticos:**
- ✅ Relatório diário
- ✅ Relatório semanal (com dia da semana)
- ✅ Relatório mensal (com dia do mês)

**Lembretes:**
- ✅ Conciliação bancária
- ✅ Categorização pendente
- ✅ Backup de dados

**E-mails:**
- ✅ E-mail para alertas
- ✅ E-mail para relatórios

**Campos:**
```typescript
- notificacoes_email: boolean
- alerta_saldo_baixo: boolean
- alerta_saldo_baixo_valor: number
- alerta_vencimentos: boolean
- alerta_vencimentos_dias: number
- relatorio_diario: boolean
- relatorio_semanal: boolean
- relatorio_mensal: boolean
- email_alertas: string
- email_relatorios: string
```

---

### 4️⃣ **Segurança** (`SecuritySettings`)

**Funcionalidades:**
- ✅ Autenticação de dois fatores (2FA)
- ✅ Tempo de expiração da sessão
- ✅ Exigir senha em ações críticas
- ✅ Alterar senha
  - Nova senha
  - Confirmar senha
  - Validação (mínimo 8 caracteres)

**Campos:**
```typescript
- autenticacao_dois_fatores: boolean
- sessao_expira_minutos: number
- exigir_senha_acoes_criticas: boolean
```

---

### 5️⃣ **Aparência** (`AppearanceSettings`)

**Funcionalidades:**
- ✅ Tema (Claro, Escuro, Sistema)
- ✅ Modo compacto
- ✅ Animações habilitadas
- ✅ Sons de notificação
- ✅ Preview em tempo real

**Campos:**
```typescript
- tema: 'light' | 'dark' | 'system'
- modo_compacto: boolean
- animacoes_habilitadas: boolean
- som_notificacoes: boolean
```

---

### 6️⃣ **Integrações** (`IntegrationSettings`)

**Funcionalidades:**
- ✅ Listar todas as integrações ativas
- ✅ Status da conexão
  - Conectado (verde)
  - Desconectado (cinza)
  - Erro (vermelho)
- ✅ Última sincronização
- ✅ Sincronizar manualmente
- ✅ Desconectar integração
- ✅ Ver histórico

**Tabela:**
```
| Conta       | Provedor | Status    | Última Sync | Ações       |
|-------------|----------|-----------|-------------|-------------|
| BB - 12345  | Pluggy   | Conectado | há 2 horas  | [Sync] [X]  |
| Itaú - 6789 | Belvo    | Conectado | há 6 horas  | [Sync] [X]  |
```

---

### 7️⃣ **Exportar** (`DataExport`)

**Funcionalidades:**
- ✅ Formatos de exportação:
  - CSV (Excel)
  - XLSX (Excel avançado)
  - JSON (dados completos)
  - PDF (relatório)

- ✅ Período customizável
  - Data inicial e final
  - Atalhos: Mês Atual, Ano Atual, Último Ano, Tudo

- ✅ Dados a incluir:
  - Transações
  - Categorias
  - Centros de custo
  - Clientes/Fornecedores
  - Contas bancárias
  - Planejamentos

- ✅ Download automático do arquivo

**Exemplo de uso:**
```typescript
const options: ExportOptions = {
  formato: 'csv',
  periodo: {
    inicio: '2025-01-01',
    fim: '2025-12-31'
  },
  incluir: {
    transacoes: true,
    categorias: true,
    // ...
  }
};

const blob = await exportData(options);
downloadBlob(blob, 'export.csv');
```

---

## 🗄️ Estrutura do Banco de Dados

### Tabela: `user_settings`

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  
  -- Preferências Gerais
  idioma VARCHAR(10) DEFAULT 'pt-BR',
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  moeda VARCHAR(3) DEFAULT 'BRL',
  formato_data VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  
  -- Dashboard
  dashboard_padrao VARCHAR(50),
  kpis_favoritos JSONB,
  periodo_padrao_dashboard VARCHAR(20),
  
  -- Notificações
  notificacoes_email BOOLEAN DEFAULT true,
  notificacoes_push BOOLEAN DEFAULT true,
  
  -- Segurança
  autenticacao_dois_fatores BOOLEAN DEFAULT false,
  sessao_expira_minutos INTEGER DEFAULT 480,
  
  -- UI/UX
  tema VARCHAR(20) DEFAULT 'light',
  modo_compacto BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabela: `notification_settings`

```sql
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  
  -- Alertas
  alerta_saldo_baixo BOOLEAN DEFAULT true,
  alerta_saldo_baixo_valor DECIMAL(15,2) DEFAULT 1000,
  alerta_vencimentos BOOLEAN DEFAULT true,
  alerta_vencimentos_dias INTEGER DEFAULT 3,
  
  -- Relatórios
  relatorio_diario BOOLEAN DEFAULT false,
  relatorio_semanal BOOLEAN DEFAULT true,
  relatorio_mensal BOOLEAN DEFAULT true,
  
  -- Canais
  email_alertas TEXT,
  email_relatorios TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabela: `integrations`

```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  conta_bancaria_id UUID REFERENCES contas_bancarias,
  
  provider VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'disconnected',
  credentials_encrypted TEXT,
  
  last_sync TIMESTAMPTZ,
  auto_sync BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🎯 Como Usar

### 1. Acessar Configurações

```typescript
// No menu lateral
Menu → Configurações
```

### 2. Navegar entre Seções

```typescript
// 7 abas disponíveis
[Perfil] [Geral] [Notificações] [Segurança] [Aparência] [Integrações] [Exportar]
```

### 3. Editar e Salvar

```typescript
// Cada seção tem seu próprio botão "Salvar"
1. Altere os campos desejados
2. Clique em "Salvar"
3. Confirmação automática via toast
```

### 4. Exemplos de Uso

#### Alterar Tema
```typescript
Configurações → Aparência → Tema → [Escuro]
```

#### Configurar Alerta de Saldo
```typescript
Configurações → Notificações → Alerta de Saldo Baixo
→ Ativar → Valor: R$ 1.000,00
```

#### Exportar Dados
```typescript
Configurações → Exportar → Formato: CSV
→ Período: Ano Atual → [Exportar]
```

#### Alterar Senha
```typescript
Configurações → Segurança → Alterar Senha
→ Nova senha → Confirmar → [Alterar Senha]
```

---

## 🔧 Funcionalidades Especiais

### Histórico de Importações

**Localização:** Botão "Histórico" no header

**Informações mostradas:**
- Data e hora da importação
- Tipo (arquivo, API, manual)
- Formato (OFX, CSV, PDF)
- Conta bancária
- Status (sucesso, erro, parcial)
- Quantidade de transações importadas

### Resetar Configurações

**Localização:** Botão "Resetar" no header

**Ação:**
- Reseta todas as configurações para valores padrão
- Requer confirmação
- Recarrega a página automaticamente

### Limpar Cache

**Localização:** Botão "Limpar Cache" no header

**Ação:**
- Remove dados temporários
- Mantém sessão ativa
- Útil para resolver problemas

---

## 🎨 Interface

### Layout Principal

```
┌─────────────────────────────────────────┐
│ ⚙️ Configurações                        │
│ Gerencie preferências e integrações    │
│ [Histórico] [Limpar Cache] [Resetar]  │
├─────────────────────────────────────────┤
│ 👤 João Silva                           │
│ joao@email.com                         │
├─────────────────────────────────────────┤
│ [Perfil][Geral][Notif][Segur][Apar]   │
│ [Integrações][Exportar]                │
├─────────────────────────────────────────┤
│                                         │
│  [Conteúdo da aba selecionada]        │
│                                         │
│  [Salvar Configurações]                │
└─────────────────────────────────────────┘
```

---

## 📊 Valores Padrão

```typescript
const DEFAULT_SETTINGS = {
  // Geral
  idioma: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  moeda: 'BRL',
  formato_data: 'DD/MM/YYYY',
  formato_hora: '24h',
  casas_decimais: 2,
  
  // Dashboard
  dashboard_padrao: 'executive',
  periodo_padrao_dashboard: 'mes_atual',
  
  // Notificações
  notificacoes_email: true,
  alerta_saldo_baixo: true,
  alerta_saldo_baixo_valor: 1000,
  alerta_vencimentos: true,
  alerta_vencimentos_dias: 3,
  relatorio_semanal: true,
  relatorio_mensal: true,
  
  // Segurança
  autenticacao_dois_fatores: false,
  sessao_expira_minutos: 480, // 8 horas
  exigir_senha_acoes_criticas: true,
  
  // Aparência
  tema: 'light',
  modo_compacto: false,
  animacoes_habilitadas: true,
  som_notificacoes: false,
};
```

---

## 🔄 Fluxo de Dados

### Carregar Configurações

```
1. Componente monta
   ↓
2. useEffect chama loadSettings()
   ↓
3. Busca no Supabase (user_settings)
   ↓
4. Seta estado local
   ↓
5. Renderiza formulário
```

### Salvar Configurações

```
1. Usuário altera campos
   ↓
2. Estado local atualizado
   ↓
3. Clica em "Salvar"
   ↓
4. handleSave() chamado
   ↓
5. Upsert no Supabase
   ↓
6. Toast de confirmação
   ↓
7. Configurações aplicadas
```

### Aplicar Tema

```
1. Usuário seleciona tema
   ↓
2. setTheme() chamado
   ↓
3. Adiciona/remove classe 'dark'
   ↓
4. Tema aplicado imediatamente
   ↓
5. Salva no banco ao clicar "Salvar"
```

---

## 🚀 Exemplos de Código

### Usar Configurações em Outros Componentes

```typescript
import { useQuery } from "@tanstack/react-query";
import { getUserSettings } from "@/services/settingsService";

function MeuComponente() {
  const { data: settings } = useQuery({
    queryKey: ["user-settings"],
    queryFn: getUserSettings,
  });

  // Usar configurações
  const moeda = settings?.moeda || 'BRL';
  const casasDecimais = settings?.casas_decimais || 2;
  
  return (
    <div>
      Moeda: {moeda}
    </div>
  );
}
```

### Exportar Dados

```typescript
import { exportData, downloadBlob } from "@/services/settingsService";

async function exportarTransacoes() {
  const blob = await exportData({
    formato: 'csv',
    periodo: {
      inicio: '2025-01-01',
      fim: '2025-12-31'
    },
    incluir: {
      transacoes: true,
      categorias: false,
      centrosCusto: false,
      contrapartes: false,
      contas: false,
      budgets: false,
    }
  });
  
  downloadBlob(blob, 'transacoes_2025.csv');
}
```

### Verificar Permissões

```typescript
import { getUserSettings } from "@/services/settingsService";

async function verificarPermissao() {
  const settings = await getUserSettings();
  
  if (settings?.exigir_senha_acoes_criticas) {
    // Solicitar senha antes de ação crítica
    await solicitarSenha();
  }
  
  // Executar ação
}
```

---

## 🛡️ Segurança

### RLS (Row Level Security)

Todas as tabelas têm RLS habilitado:

```sql
-- Usuários só podem ver/editar suas próprias configurações
CREATE POLICY "policy_name"
  ON user_settings
  USING (auth.uid() = user_id);
```

### Criptografia

⚠️ **IMPORTANTE:** Em produção:

```typescript
// NÃO salvar credenciais em plain text
const encrypted = await encryptCredentials(credentials);

await supabase
  .from("integrations")
  .update({ credentials_encrypted: encrypted });
```

### Auditoria

Todas as ações são registradas:

```typescript
// Logs automáticos em audit_logs
{
  user_id: "uuid",
  tabela: "transacoes",
  acao: "delete",
  dados_anteriores: {...},
  ip_address: "192.168.1.1",
  created_at: "2025-10-20T..."
}
```

---

## 📈 Performance

### Cache

```typescript
// Configurações são cached por 5 minutos
staleTime: 300000
```

### Lazy Loading

```typescript
// Componentes carregam apenas quando necessário
<TabsContent value="perfil">
  <UserProfile /> {/* Só renderiza quando aba ativa */}
</TabsContent>
```

---

## ✅ Checklist de Implementação

- [x] Migration do banco criada
- [x] Serviço de configurações criado
- [x] Componente de perfil criado
- [x] Componente de configurações gerais criado
- [x] Componente de notificações criado
- [x] Componente de segurança criado
- [x] Componente de aparência criado
- [x] Componente de integrações criado
- [x] Componente de exportação criado
- [x] Página principal criada
- [x] Rota adicionada no App.tsx
- [x] RLS configurado
- [x] Triggers configurados
- [x] Documentação criada

---

## 🎉 Resultado Final

Você agora tem uma **página de configurações profissional e completa** com:

✅ **7 seções** de configuração  
✅ **Backend completo** no Supabase  
✅ **5 tabelas** no banco  
✅ **Triggers automáticos**  
✅ **RLS** para segurança  
✅ **Exportação** de dados  
✅ **Histórico** de importações  
✅ **Logs** de auditoria  
✅ **Temas** (claro/escuro)  
✅ **Notificações** configuráveis  
✅ **Segurança** robusta  

**Sistema de configurações profissional pronto para produção!** 🚀
