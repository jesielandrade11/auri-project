/**
 * Serviço de Configurações do Sistema
 * Gerencia preferências, notificações, integrações e exportações
 */

import { supabase } from "@/integrations/supabase/client";

export interface UserSettings {
  id?: string;
  user_id: string;
  
  // Preferências Gerais
  idioma: string;
  timezone: string;
  moeda: string;
  formato_data: string;
  formato_hora: string;
  
  // Preferências Financeiras
  primeiro_dia_semana: number;
  primeiro_mes_ano_fiscal: number;
  casas_decimais: number;
  separador_decimal: string;
  separador_milhares: string;
  
  // Dashboard
  dashboard_padrao: string;
  kpis_favoritos: string[];
  periodo_padrao_dashboard: string;
  granularidade_padrao: string;
  
  // Notificações
  notificacoes_email: boolean;
  notificacoes_push: boolean;
  notificacoes_sistema: boolean;
  
  // Importação/Exportação
  auto_categorizar: boolean;
  permitir_duplicatas: boolean;
  backup_automatico: boolean;
  frequencia_backup: string;
  
  // Segurança
  autenticacao_dois_fatores: boolean;
  sessao_expira_minutos: number;
  exigir_senha_acoes_criticas: boolean;
  
  // UI/UX
  tema: string;
  modo_compacto: boolean;
  animacoes_habilitadas: boolean;
  som_notificacoes: boolean;
  
  created_at?: string;
  updated_at?: string;
}

export interface NotificationSettings {
  id?: string;
  user_id: string;
  
  // Alertas Financeiros
  alerta_saldo_baixo: boolean;
  alerta_saldo_baixo_valor: number;
  alerta_vencimentos: boolean;
  alerta_vencimentos_dias: number;
  alerta_orcamento_excedido: boolean;
  alerta_orcamento_percentual: number;
  
  // Relatórios Automáticos
  relatorio_diario: boolean;
  relatorio_semanal: boolean;
  relatorio_mensal: boolean;
  dia_relatorio_semanal: number;
  dia_relatorio_mensal: number;
  
  // Lembretes
  lembrete_conciliacao: boolean;
  lembrete_conciliacao_frequencia: string;
  lembrete_categorizacao: boolean;
  lembrete_backup: boolean;
  
  // Canais
  email_alertas: string | null;
  email_relatorios: string | null;
  whatsapp: string | null;
  telegram_chat_id: string | null;
  
  created_at?: string;
  updated_at?: string;
}

export interface ExportOptions {
  formato: 'csv' | 'xlsx' | 'pdf' | 'json';
  periodo: {
    inicio: string;
    fim: string;
  };
  incluir: {
    transacoes: boolean;
    categorias: boolean;
    centrosCusto: boolean;
    contrapartes: boolean;
    contas: boolean;
    budgets: boolean;
  };
  filtros?: {
    contaIds?: string[];
    categoriaIds?: string[];
    status?: string[];
  };
}

/**
 * Buscar configurações do usuário
 */
export async function getUserSettings(): Promise<UserSettings | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Atualizar configurações do usuário
 */
export async function updateUserSettings(settings: Partial<UserSettings>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { error } = await supabase
    .from("user_settings")
    .upsert({
      user_id: user.id,
      ...settings,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

/**
 * Buscar configurações de notificações
 */
export async function getNotificationSettings(): Promise<NotificationSettings | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Atualizar configurações de notificações
 */
export async function updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { error } = await supabase
    .from("notification_settings")
    .upsert({
      user_id: user.id,
      ...settings,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

/**
 * Exportar dados do sistema
 */
export async function exportData(options: ExportOptions): Promise<Blob> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const dados: any = {};

  // Buscar dados conforme opções
  if (options.incluir.transacoes) {
    const { data } = await supabase
      .from("transacoes")
      .select("*, categoria:categoria_id(nome), centro_custo:centro_custo_id(nome), conta:conta_id(nome_banco)")
      .eq("user_id", user.id)
      .gte("data_transacao", options.periodo.inicio)
      .lte("data_transacao", options.periodo.fim);
    dados.transacoes = data;
  }

  if (options.incluir.categorias) {
    const { data } = await supabase
      .from("categorias")
      .select("*")
      .eq("user_id", user.id);
    dados.categorias = data;
  }

  if (options.incluir.centrosCusto) {
    const { data } = await supabase
      .from("centros_custo")
      .select("*")
      .eq("user_id", user.id);
    dados.centrosCusto = data;
  }

  if (options.incluir.contrapartes) {
    const { data } = await supabase
      .from("contrapartes")
      .select("*")
      .eq("user_id", user.id);
    dados.contrapartes = data;
  }

  if (options.incluir.contas) {
    const { data } = await supabase
      .from("contas_bancarias")
      .select("*")
      .eq("user_id", user.id);
    dados.contas = data;
  }

  if (options.incluir.budgets) {
    const { data } = await supabase
      .from("budgets")
      .select("*, categoria:categoria_id(nome), centro_custo:centro_custo_id(nome)")
      .eq("user_id", user.id);
    dados.budgets = data;
  }

  // Converter para o formato solicitado
  return formatarExportacao(dados, options.formato);
}

/**
 * Formatar dados para exportação
 */
function formatarExportacao(dados: any, formato: ExportOptions['formato']): Blob {
  switch (formato) {
    case 'json':
      return new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    
    case 'csv':
      return convertToCSV(dados);
    
    case 'xlsx':
      // Requer biblioteca xlsx
      return convertToXLSX(dados);
    
    case 'pdf':
      // Requer biblioteca jspdf
      return convertToPDF(dados);
    
    default:
      return new Blob([JSON.stringify(dados)], { type: 'application/json' });
  }
}

/**
 * Converter para CSV
 */
function convertToCSV(dados: any): Blob {
  let csv = '';
  
  // Transações
  if (dados.transacoes && dados.transacoes.length > 0) {
    csv += 'TRANSAÇÕES\n';
    csv += 'Data,Descrição,Valor,Tipo,Categoria,Centro de Custo,Conta,Status\n';
    
    dados.transacoes.forEach((t: any) => {
      csv += `${t.data_transacao},`;
      csv += `"${t.descricao}",`;
      csv += `${t.valor},`;
      csv += `${t.tipo},`;
      csv += `"${t.categoria?.nome || ''}",`;
      csv += `"${t.centro_custo?.nome || ''}",`;
      csv += `"${t.conta?.nome_banco || ''}",`;
      csv += `${t.status}\n`;
    });
    csv += '\n';
  }
  
  // Categorias
  if (dados.categorias && dados.categorias.length > 0) {
    csv += 'CATEGORIAS\n';
    csv += 'Nome,Tipo,DRE Grupo,Fixa/Variável\n';
    
    dados.categorias.forEach((c: any) => {
      csv += `"${c.nome}",${c.tipo},"${c.dre_grupo || ''}","${c.fixa_variavel || ''}"\n`;
    });
  }
  
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Converter para XLSX (placeholder - requer biblioteca)
 */
function convertToXLSX(dados: any): Blob {
  // TODO: Implementar com biblioteca XLSX
  // Por enquanto, retornar CSV
  return convertToCSV(dados);
}

/**
 * Converter para PDF (placeholder - requer biblioteca)
 */
function convertToPDF(dados: any): Blob {
  // TODO: Implementar com jsPDF
  return new Blob(['PDF export not implemented yet'], { type: 'application/pdf' });
}

/**
 * Download de arquivo
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Resetar configurações para padrão
 */
export async function resetToDefault(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  await supabase
    .from("user_settings")
    .delete()
    .eq("user_id", user.id);

  await supabase
    .from("notification_settings")
    .delete()
    .eq("user_id", user.id);

  // Recriar com valores padrão
  await supabase
    .from("user_settings")
    .insert({ user_id: user.id });

  await supabase
    .from("notification_settings")
    .insert({ user_id: user.id });
}

/**
 * Limpar cache e dados temporários
 */
export async function clearCache(): Promise<void> {
  // Limpar localStorage
  const keysToKeep = ['supabase.auth.token'];
  const allKeys = Object.keys(localStorage);
  
  allKeys.forEach(key => {
    if (!keysToKeep.includes(key)) {
      localStorage.removeItem(key);
    }
  });
  
  // Limpar sessionStorage
  sessionStorage.clear();
}

/**
 * Buscar logs de importação
 */
export async function getImportLogs(limit: number = 50) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from("import_logs")
    .select("*, conta_bancaria:conta_bancaria_id(nome_banco)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Buscar logs de auditoria
 */
export async function getAuditLogs(limit: number = 100) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
