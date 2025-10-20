import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// Types
export type Transacao = Tables<"transacoes">;
export type Categoria = Tables<"categorias">;
export type CentroCusto = Tables<"centros_custo">;
export type ContaBancaria = Tables<"contas_bancarias">;
export type Contraparte = Tables<"contrapartes">;
export type Budget = Tables<"budgets">;
export type DDABoleto = Tables<"dda_boletos">;

// Base API class with error handling
class BaseAPI {
  protected async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw new Error(`Erro de autenticação: ${error.message}`);
    if (!user) throw new Error("Usuário não autenticado");
    return user;
  }

  protected handleError(error: any, operation: string): never {
    console.error(`Erro em ${operation}:`, error);
    
    if (error.code === 'PGRST116') {
      throw new Error('Nenhum registro encontrado');
    }
    
    if (error.code === '23505') {
      throw new Error('Já existe um registro com esses dados');
    }
    
    if (error.code === '23503') {
      throw new Error('Não é possível excluir este registro pois está sendo usado em outros locais');
    }
    
    throw new Error(error.message || `Erro ao ${operation}`);
  }
}

// Transações API
export class TransacoesAPI extends BaseAPI {
  async getAll(filters?: {
    status?: string;
    tipo?: string;
    dataInicio?: string;
    dataFim?: string;
    contaId?: string;
    categoriaId?: string;
    limit?: number;
  }) {
    try {
      const user = await this.getCurrentUser();
      
      let query = supabase
        .from("transacoes")
        .select(`
          *,
          categoria:categoria_id(nome, icone, cor, tipo),
          centro_custo:centro_custo_id(nome, codigo),
          conta:conta_id(nome_banco),
          contraparte:contraparte_id(nome, papel)
        `)
        .eq("user_id", user.id);

      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.tipo) query = query.eq("tipo", filters.tipo);
      if (filters?.dataInicio) query = query.gte("data_transacao", filters.dataInicio);
      if (filters?.dataFim) query = query.lte("data_transacao", filters.dataFim);
      if (filters?.contaId) query = query.eq("conta_id", filters.contaId);
      if (filters?.categoriaId) query = query.eq("categoria_id", filters.categoriaId);
      if (filters?.limit) query = query.limit(filters.limit);

      query = query.order("data_transacao", { ascending: false });

      const { data, error } = await query;
      if (error) this.handleError(error, "buscar transações");
      
      return data || [];
    } catch (error) {
      this.handleError(error, "buscar transações");
    }
  }

  async getById(id: string) {
    try {
      const user = await this.getCurrentUser();
      
      const { data, error } = await supabase
        .from("transacoes")
        .select(`
          *,
          categoria:categoria_id(nome, icone, cor, tipo),
          centro_custo:centro_custo_id(nome, codigo),
          conta:conta_id(nome_banco),
          contraparte:contraparte_id(nome, papel)
        `)
        .eq("user_id", user.id)
        .eq("id", id)
        .single();

      if (error) this.handleError(error, "buscar transação");
      return data;
    } catch (error) {
      this.handleError(error, "buscar transação");
    }
  }

  async create(transacao: Omit<TablesInsert<"transacoes">, "user_id">) {
    try {
      const user = await this.getCurrentUser();
      
      const { data, error } = await supabase
        .from("transacoes")
        .insert({
          ...transacao,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) this.handleError(error, "criar transação");
      return data;
    } catch (error) {
      this.handleError(error, "criar transação");
    }
  }

  async update(id: string, updates: TablesUpdate<"transacoes">) {
    try {
      const user = await this.getCurrentUser();
      
      const { data, error } = await supabase
        .from("transacoes")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) this.handleError(error, "atualizar transação");
      return data;
    } catch (error) {
      this.handleError(error, "atualizar transação");
    }
  }

  async delete(id: string) {
    try {
      const user = await this.getCurrentUser();
      
      const { error } = await supabase
        .from("transacoes")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) this.handleError(error, "excluir transação");
    } catch (error) {
      this.handleError(error, "excluir transação");
    }
  }

  async conciliar(ids: string[]) {
    try {
      const user = await this.getCurrentUser();
      const agora = new Date().toISOString();
      
      const { error } = await supabase
        .from("transacoes")
        .update({
          status: "pago",
          conciliado: true,
          data_conciliacao: agora,
          usuario_conciliacao: user.id,
          updated_at: agora,
        })
        .in("id", ids)
        .eq("user_id", user.id);

      if (error) this.handleError(error, "conciliar transações");
    } catch (error) {
      this.handleError(error, "conciliar transações");
    }
  }
}

// Categorias API
export class CategoriasAPI extends BaseAPI {
  async getAll(ativo?: boolean) {
    try {
      const user = await this.getCurrentUser();
      
      let query = supabase
        .from("categorias")
        .select("*")
        .eq("user_id", user.id);

      if (ativo !== undefined) query = query.eq("ativo", ativo);
      query = query.order("nome");

      const { data, error } = await query;
      if (error) this.handleError(error, "buscar categorias");
      
      return data || [];
    } catch (error) {
      this.handleError(error, "buscar categorias");
    }
  }

  async create(categoria: Omit<TablesInsert<"categorias">, "user_id">) {
    try {
      const user = await this.getCurrentUser();
      
      const { data, error } = await supabase
        .from("categorias")
        .insert({
          ...categoria,
          user_id: user.id,
          ativo: true,
        })
        .select()
        .single();

      if (error) this.handleError(error, "criar categoria");
      return data;
    } catch (error) {
      this.handleError(error, "criar categoria");
    }
  }

  async update(id: string, updates: TablesUpdate<"categorias">) {
    try {
      const user = await this.getCurrentUser();
      
      const { data, error } = await supabase
        .from("categorias")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) this.handleError(error, "atualizar categoria");
      return data;
    } catch (error) {
      this.handleError(error, "atualizar categoria");
    }
  }

  async delete(id: string) {
    try {
      const user = await this.getCurrentUser();
      
      const { error } = await supabase
        .from("categorias")
        .update({ ativo: false })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) this.handleError(error, "excluir categoria");
    } catch (error) {
      this.handleError(error, "excluir categoria");
    }
  }
}

// Centros de Custo API
export class CentrosCustoAPI extends BaseAPI {
  async getAll(ativo?: boolean) {
    try {
      const user = await this.getCurrentUser();
      
      let query = supabase
        .from("centros_custo")
        .select("*")
        .eq("user_id", user.id);

      if (ativo !== undefined) query = query.eq("ativo", ativo);
      query = query.order("nome");

      const { data, error } = await query;
      if (error) this.handleError(error, "buscar centros de custo");
      
      return data || [];
    } catch (error) {
      this.handleError(error, "buscar centros de custo");
    }
  }

  async create(centroCusto: Omit<TablesInsert<"centros_custo">, "user_id">) {
    try {
      const user = await this.getCurrentUser();
      
      const { data, error } = await supabase
        .from("centros_custo")
        .insert({
          ...centroCusto,
          user_id: user.id,
          ativo: true,
        })
        .select()
        .single();

      if (error) this.handleError(error, "criar centro de custo");
      return data;
    } catch (error) {
      this.handleError(error, "criar centro de custo");
    }
  }

  async update(id: string, updates: TablesUpdate<"centros_custo">) {
    try {
      const user = await this.getCurrentUser();
      
      const { data, error } = await supabase
        .from("centros_custo")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) this.handleError(error, "atualizar centro de custo");
      return data;
    } catch (error) {
      this.handleError(error, "atualizar centro de custo");
    }
  }

  async delete(id: string) {
    try {
      const user = await this.getCurrentUser();
      
      const { error } = await supabase
        .from("centros_custo")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) this.handleError(error, "excluir centro de custo");
    } catch (error) {
      this.handleError(error, "excluir centro de custo");
    }
  }
}

// Contas Bancárias API
export class ContasBancariasAPI extends BaseAPI {
  async getAll(ativo?: boolean) {
    try {
      const user = await this.getCurrentUser();
      
      let query = supabase
        .from("contas_bancarias")
        .select("*")
        .eq("user_id", user.id);

      if (ativo !== undefined) query = query.eq("ativo", ativo);
      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) this.handleError(error, "buscar contas bancárias");
      
      return data || [];
    } catch (error) {
      this.handleError(error, "buscar contas bancárias");
    }
  }

  async create(conta: Omit<TablesInsert<"contas_bancarias">, "user_id">) {
    try {
      const user = await this.getCurrentUser();
      
      const { data, error } = await supabase
        .from("contas_bancarias")
        .insert({
          ...conta,
          user_id: user.id,
          ativo: true,
          data_abertura: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) this.handleError(error, "criar conta bancária");
      return data;
    } catch (error) {
      this.handleError(error, "criar conta bancária");
    }
  }

  async update(id: string, updates: TablesUpdate<"contas_bancarias">) {
    try {
      const user = await this.getCurrentUser();
      
      const { data, error } = await supabase
        .from("contas_bancarias")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) this.handleError(error, "atualizar conta bancária");
      return data;
    } catch (error) {
      this.handleError(error, "atualizar conta bancária");
    }
  }

  async delete(id: string) {
    try {
      const user = await this.getCurrentUser();
      
      const { error } = await supabase
        .from("contas_bancarias")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) this.handleError(error, "excluir conta bancária");
    } catch (error) {
      this.handleError(error, "excluir conta bancária");
    }
  }
}

// Contrapartes API
export class ContrapartesAPI extends BaseAPI {
  async getAll(ativo?: boolean) {
    try {
      const user = await this.getCurrentUser();
      
      let query = supabase
        .from("contrapartes")
        .select("*")
        .eq("user_id", user.id);

      if (ativo !== undefined) query = query.eq("ativo", ativo);
      query = query.order("nome");

      const { data, error } = await query;
      if (error) this.handleError(error, "buscar contrapartes");
      
      return data || [];
    } catch (error) {
      this.handleError(error, "buscar contrapartes");
    }
  }

  async create(contraparte: Omit<TablesInsert<"contrapartes">, "user_id">) {
    try {
      const user = await this.getCurrentUser();
      
      const { data, error } = await supabase
        .from("contrapartes")
        .insert({
          ...contraparte,
          user_id: user.id,
          ativo: true,
        })
        .select()
        .single();

      if (error) this.handleError(error, "criar contraparte");
      return data;
    } catch (error) {
      this.handleError(error, "criar contraparte");
    }
  }

  async update(id: string, updates: TablesUpdate<"contrapartes">) {
    try {
      const user = await this.getCurrentUser();
      
      const { data, error } = await supabase
        .from("contrapartes")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) this.handleError(error, "atualizar contraparte");
      return data;
    } catch (error) {
      this.handleError(error, "atualizar contraparte");
    }
  }

  async delete(id: string) {
    try {
      const user = await this.getCurrentUser();
      
      const { error } = await supabase
        .from("contrapartes")
        .update({ ativo: false })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) this.handleError(error, "inativar contraparte");
    } catch (error) {
      this.handleError(error, "inativar contraparte");
    }
  }
}

// Budget/Planejamento API
export class BudgetAPI extends BaseAPI {
  async getAll(filters?: {
    anoReferencia?: number;
    mesReferencia?: string;
    categoriaId?: string;
    centroCustoId?: string;
  }) {
    try {
      const user = await this.getCurrentUser();
      
      let query = supabase
        .from("budgets")
        .select(`
          *,
          categoria:categoria_id(id, nome, tipo),
          centro_custo:centro_custo_id(id, nome)
        `)
        .eq("user_id", user.id);

      if (filters?.anoReferencia) {
        const startDate = `${filters.anoReferencia}-01-01`;
        const endDate = `${filters.anoReferencia}-12-31`;
        query = query.gte("mes_referencia", startDate).lte("mes_referencia", endDate);
      }

      if (filters?.mesReferencia) {
        query = query.eq("mes_referencia", filters.mesReferencia);
      }

      if (filters?.categoriaId) {
        query = query.eq("categoria_id", filters.categoriaId);
      }

      if (filters?.centroCustoId) {
        query = query.eq("centro_custo_id", filters.centroCustoId);
      }

      query = query.order("mes_referencia", { ascending: true });

      const { data, error } = await query;
      if (error) this.handleError(error, "buscar planejamentos");
      
      return data || [];
    } catch (error) {
      this.handleError(error, "buscar planejamentos");
    }
  }

  async create(budget: Omit<TablesInsert<"budgets">, "user_id">) {
    try {
      const user = await this.getCurrentUser();
      
      const { data, error } = await supabase
        .from("budgets")
        .insert({
          ...budget,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) this.handleError(error, "criar planejamento");
      return data;
    } catch (error) {
      this.handleError(error, "criar planejamento");
    }
  }

  async update(id: string, updates: TablesUpdate<"budgets">) {
    try {
      const user = await this.getCurrentUser();
      
      const { data, error } = await supabase
        .from("budgets")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) this.handleError(error, "atualizar planejamento");
      return data;
    } catch (error) {
      this.handleError(error, "atualizar planejamento");
    }
  }

  async delete(id: string) {
    try {
      const user = await this.getCurrentUser();
      
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) this.handleError(error, "excluir planejamento");
    } catch (error) {
      this.handleError(error, "excluir planejamento");
    }
  }
}

// Reports API
export class ReportsAPI extends BaseAPI {
  async getFluxoCaixa(dataInicio: string, dataFim: string) {
    try {
      const user = await this.getCurrentUser();
      
      const { data, error } = await supabase
        .from("vw_fluxo_caixa")
        .select("*")
        .eq("user_id", user.id)
        .gte("data_referencia", dataInicio)
        .lte("data_referencia", dataFim)
        .order("data_referencia");

      if (error) this.handleError(error, "buscar dados de fluxo de caixa");
      return data || [];
    } catch (error) {
      this.handleError(error, "buscar dados de fluxo de caixa");
    }
  }

  async getDRECentroCusto(mesReferencia: string, centroCustoId?: string) {
    try {
      const user = await this.getCurrentUser();
      
      const [ano, mes] = mesReferencia.split("-");
      const dataInicio = `${ano}-${mes}-01`;
      const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
      const dataFim = `${ano}-${mes}-${ultimoDia}`;

      let query = supabase
        .from("vw_dre_centro_custo")
        .select("*")
        .eq("user_id", user.id)
        .gte("mes_competencia", dataInicio)
        .lte("mes_competencia", dataFim);

      if (centroCustoId && centroCustoId !== "todos") {
        query = query.eq("centro_custo_id", centroCustoId);
      }

      const { data, error } = await query;
      if (error) this.handleError(error, "buscar dados de DRE");
      
      return data || [];
    } catch (error) {
      this.handleError(error, "buscar dados de DRE");
    }
  }

  async getAging(papel?: string) {
    try {
      const user = await this.getCurrentUser();
      
      let query = supabase
        .from("vw_aging")
        .select("*")
        .eq("user_id", user.id);

      if (papel && papel !== "todos") {
        query = query.eq("contraparte_papel", papel);
      }

      const { data, error } = await query.order("data_vencimento");
      if (error) this.handleError(error, "buscar dados de aging");
      
      return data || [];
    } catch (error) {
      this.handleError(error, "buscar dados de aging");
    }
  }
}

// Export API instances
export const transacoesAPI = new TransacoesAPI();
export const categoriasAPI = new CategoriasAPI();
export const centrosCustoAPI = new CentrosCustoAPI();
export const contasBancariasAPI = new ContasBancariasAPI();
export const contrapartesAPI = new ContrapartesAPI();
export const budgetAPI = new BudgetAPI();
export const reportsAPI = new ReportsAPI();