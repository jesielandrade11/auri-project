export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alocacoes_transacao: {
        Row: {
          categoria_id: string
          centro_custo_id: string
          created_at: string | null
          descricao: string | null
          id: string
          transacao_id: string
          valor: number
        }
        Insert: {
          categoria_id: string
          centro_custo_id: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          transacao_id: string
          valor: number
        }
        Update: {
          categoria_id?: string
          centro_custo_id?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          transacao_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "alocacoes_transacao_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacoes_transacao_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacoes_transacao_transacao_id_fkey"
            columns: ["transacao_id"]
            isOneToOne: false
            referencedRelation: "transacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacoes_transacao_transacao_id_fkey"
            columns: ["transacao_id"]
            isOneToOne: false
            referencedRelation: "vw_aging"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacoes_transacao_transacao_id_fkey"
            columns: ["transacao_id"]
            isOneToOne: false
            referencedRelation: "vw_alocacoes_divergentes"
            referencedColumns: ["transacao_id"]
          },
          {
            foreignKeyName: "alocacoes_transacao_transacao_id_fkey"
            columns: ["transacao_id"]
            isOneToOne: false
            referencedRelation: "vw_fluxo_caixa"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          categoria_id: string | null
          centro_custo_id: string | null
          created_at: string | null
          id: string
          mes_referencia: string
          observacoes: string | null
          percentual_utilizado: number | null
          user_id: string
          valor_planejado: number
          valor_realizado: number | null
        }
        Insert: {
          categoria_id?: string | null
          centro_custo_id?: string | null
          created_at?: string | null
          id?: string
          mes_referencia: string
          observacoes?: string | null
          percentual_utilizado?: number | null
          user_id: string
          valor_planejado: number
          valor_realizado?: number | null
        }
        Update: {
          categoria_id?: string | null
          centro_custo_id?: string | null
          created_at?: string | null
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          percentual_utilizado?: number | null
          user_id?: string
          valor_planejado?: number
          valor_realizado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          ativo: boolean | null
          caminho: string | null
          categoria_pai_id: string | null
          centro_custo_id: string
          codigo_contabil: string | null
          cor: string | null
          created_at: string | null
          descricao: string | null
          dre_grupo: string | null
          fixa_variavel: string | null
          icone: string | null
          id: string
          nivel: number | null
          nome: string
          tipo: string
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          caminho?: string | null
          categoria_pai_id?: string | null
          centro_custo_id: string
          codigo_contabil?: string | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          dre_grupo?: string | null
          fixa_variavel?: string | null
          icone?: string | null
          id?: string
          nivel?: number | null
          nome: string
          tipo: string
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          caminho?: string | null
          categoria_pai_id?: string | null
          centro_custo_id?: string
          codigo_contabil?: string | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          dre_grupo?: string | null
          fixa_variavel?: string | null
          icone?: string | null
          id?: string
          nivel?: number | null
          nome?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_categoria_pai_id_fkey"
            columns: ["categoria_pai_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_custo: {
        Row: {
          ativo: boolean | null
          caminho: string | null
          centro_pai_id: string | null
          codigo: string
          created_at: string | null
          id: string
          nivel: number | null
          nome: string
          orcamento_mensal: number | null
          tipo: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          caminho?: string | null
          centro_pai_id?: string | null
          codigo: string
          created_at?: string | null
          id?: string
          nivel?: number | null
          nome: string
          orcamento_mensal?: number | null
          tipo?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          caminho?: string | null
          centro_pai_id?: string | null
          codigo?: string
          created_at?: string | null
          id?: string
          nivel?: number | null
          nome?: string
          orcamento_mensal?: number | null
          tipo?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "centros_custo_centro_pai_id_fkey"
            columns: ["centro_pai_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_bancarias: {
        Row: {
          agencia: string | null
          ativo: boolean | null
          auto_sync: boolean | null
          banco: string | null
          conta: string | null
          created_at: string | null
          data_abertura: string | null
          digito: string | null
          id: string
          nome_banco: string
          numero_conta: string | null
          pluggy_account_id: string | null
          pluggy_connector_id: string | null
          pluggy_item_id: string | null
          saldo_atual: number | null
          saldo_inicial: number | null
          tipo_conta: string | null
          ultima_sincronizacao: string | null
          ultimo_erro_sync: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean | null
          auto_sync?: boolean | null
          banco?: string | null
          conta?: string | null
          created_at?: string | null
          data_abertura?: string | null
          digito?: string | null
          id?: string
          nome_banco: string
          numero_conta?: string | null
          pluggy_account_id?: string | null
          pluggy_connector_id?: string | null
          pluggy_item_id?: string | null
          saldo_atual?: number | null
          saldo_inicial?: number | null
          tipo_conta?: string | null
          ultima_sincronizacao?: string | null
          ultimo_erro_sync?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agencia?: string | null
          ativo?: boolean | null
          auto_sync?: boolean | null
          banco?: string | null
          conta?: string | null
          created_at?: string | null
          data_abertura?: string | null
          digito?: string | null
          id?: string
          nome_banco?: string
          numero_conta?: string | null
          pluggy_account_id?: string | null
          pluggy_connector_id?: string | null
          pluggy_item_id?: string | null
          saldo_atual?: number | null
          saldo_inicial?: number | null
          tipo_conta?: string | null
          ultima_sincronizacao?: string | null
          ultimo_erro_sync?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contrapartes: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          documento: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          papel: string
          telefone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          papel: string
          telefone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          papel?: string
          telefone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dda_boletos: {
        Row: {
          beneficiario: string
          codigo_barras: string | null
          conta_bancaria_id: string
          created_at: string
          data_vencimento: string
          id: string
          linha_digitavel: string | null
          observacoes: string | null
          status: string
          transacao_id: string | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          beneficiario: string
          codigo_barras?: string | null
          conta_bancaria_id: string
          created_at?: string
          data_vencimento: string
          id?: string
          linha_digitavel?: string | null
          observacoes?: string | null
          status?: string
          transacao_id?: string | null
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          beneficiario?: string
          codigo_barras?: string | null
          conta_bancaria_id?: string
          created_at?: string
          data_vencimento?: string
          id?: string
          linha_digitavel?: string | null
          observacoes?: string | null
          status?: string
          transacao_id?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "dda_boletos_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      importacoes: {
        Row: {
          conta_bancaria_id: string | null
          created_at: string
          dados_originais: Json | null
          id: string
          mensagem_erro: string | null
          nome_arquivo: string
          status: string
          tipo_arquivo: string
          total_transacoes: number | null
          transacoes_importadas: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conta_bancaria_id?: string | null
          created_at?: string
          dados_originais?: Json | null
          id?: string
          mensagem_erro?: string | null
          nome_arquivo: string
          status?: string
          tipo_arquivo: string
          total_transacoes?: number | null
          transacoes_importadas?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conta_bancaria_id?: string | null
          created_at?: string
          dados_originais?: Json | null
          id?: string
          mensagem_erro?: string | null
          nome_arquivo?: string
          status?: string
          tipo_arquivo?: string
          total_transacoes?: number | null
          transacoes_importadas?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "importacoes_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      transacoes: {
        Row: {
          anexos: Json | null
          arquivo_origem: string | null
          categoria_id: string | null
          centro_custo_id: string | null
          classificado_auto: boolean | null
          conciliado: boolean | null
          confianca_classificacao: number | null
          conta_bancaria_id: string | null
          contraparte_id: string | null
          created_at: string | null
          data_competencia: string | null
          data_conciliacao: string | null
          data_pagamento: string | null
          data_transacao: string
          data_vencimento: string | null
          descricao: string
          descricao_original: string | null
          forma_pagamento: string | null
          hash_duplicata: string | null
          id: string
          numero_documento: string | null
          observacoes: string | null
          origem: string
          parcela_numero: number | null
          parcela_total: number | null
          recorrencia_id: string | null
          recorrente: boolean | null
          status: string | null
          tags: string[] | null
          tipo: string
          tipo_transferencia: string | null
          transferencia_vinculada_id: string | null
          updated_at: string | null
          user_id: string
          usuario_conciliacao: string | null
          valor: number
        }
        Insert: {
          anexos?: Json | null
          arquivo_origem?: string | null
          categoria_id?: string | null
          centro_custo_id?: string | null
          classificado_auto?: boolean | null
          conciliado?: boolean | null
          confianca_classificacao?: number | null
          conta_bancaria_id?: string | null
          contraparte_id?: string | null
          created_at?: string | null
          data_competencia?: string | null
          data_conciliacao?: string | null
          data_pagamento?: string | null
          data_transacao: string
          data_vencimento?: string | null
          descricao: string
          descricao_original?: string | null
          forma_pagamento?: string | null
          hash_duplicata?: string | null
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          origem: string
          parcela_numero?: number | null
          parcela_total?: number | null
          recorrencia_id?: string | null
          recorrente?: boolean | null
          status?: string | null
          tags?: string[] | null
          tipo: string
          tipo_transferencia?: string | null
          transferencia_vinculada_id?: string | null
          updated_at?: string | null
          user_id: string
          usuario_conciliacao?: string | null
          valor: number
        }
        Update: {
          anexos?: Json | null
          arquivo_origem?: string | null
          categoria_id?: string | null
          centro_custo_id?: string | null
          classificado_auto?: boolean | null
          conciliado?: boolean | null
          confianca_classificacao?: number | null
          conta_bancaria_id?: string | null
          contraparte_id?: string | null
          created_at?: string | null
          data_competencia?: string | null
          data_conciliacao?: string | null
          data_pagamento?: string | null
          data_transacao?: string
          data_vencimento?: string | null
          descricao?: string
          descricao_original?: string | null
          forma_pagamento?: string | null
          hash_duplicata?: string | null
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          origem?: string
          parcela_numero?: number | null
          parcela_total?: number | null
          recorrencia_id?: string | null
          recorrente?: boolean | null
          status?: string | null
          tags?: string[] | null
          tipo?: string
          tipo_transferencia?: string | null
          transferencia_vinculada_id?: string | null
          updated_at?: string | null
          user_id?: string
          usuario_conciliacao?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_conta_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_contraparte_id_fkey"
            columns: ["contraparte_id"]
            isOneToOne: false
            referencedRelation: "contrapartes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_aging: {
        Row: {
          contraparte_nome: string | null
          contraparte_papel: string | null
          data_vencimento: string | null
          descricao: string | null
          dias_atraso: number | null
          faixa_atraso: string | null
          id: string | null
          status: string | null
          tipo: string | null
          user_id: string | null
          valor: number | null
        }
        Relationships: []
      }
      vw_alocacoes_divergentes: {
        Row: {
          descricao: string | null
          divergencia: number | null
          transacao_id: string | null
          valor_alocado: number | null
          valor_transacao: number | null
        }
        Relationships: []
      }
      vw_dre_centro_custo: {
        Row: {
          categoria_tipo: string | null
          centro_custo_codigo: string | null
          centro_custo_id: string | null
          centro_custo_nome: string | null
          despesas: number | null
          dre_grupo: string | null
          mes_competencia: string | null
          receitas: number | null
          resultado: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alocacoes_transacao_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_fluxo_caixa: {
        Row: {
          categoria_nome: string | null
          centro_custo_nome: string | null
          contraparte_nome: string | null
          contraparte_papel: string | null
          data_pagamento: string | null
          data_referencia: string | null
          data_transacao: string | null
          data_vencimento: string | null
          descricao: string | null
          id: string | null
          status: string | null
          tipo: string | null
          tipo_fluxo: string | null
          user_id: string | null
          valor: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      atualizar_status_vencidas: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
