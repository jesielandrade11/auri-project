import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

/**
 * Hook para buscar transações com cache e sincronização em tempo real
 */
export function useTransacoes(filters?: {
  dataInicio?: string;
  dataFim?: string;
  contaIds?: string[];
  categoriaIds?: string[];
  status?: string[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["transacoes", filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let query = supabase
        .from("transacoes")
        .select(`
          *,
          categoria:categoria_id(id, nome, tipo, icone, cor, dre_grupo),
          centro_custo:centro_custo_id(id, nome, codigo),
          conta:conta_id(id, nome_banco),
          contraparte:contraparte_id(id, nome, papel)
        `)
        .eq("user_id", user.id)
        .order("data_transacao", { ascending: false });

      if (filters?.dataInicio) {
        query = query.gte("data_transacao", filters.dataInicio);
      }
      if (filters?.dataFim) {
        query = query.lte("data_transacao", filters.dataFim);
      }
      if (filters?.contaIds && filters.contaIds.length > 0) {
        query = query.in("conta_id", filters.contaIds);
      }
      if (filters?.categoriaIds && filters.categoriaIds.length > 0) {
        query = query.in("categoria_id", filters.categoriaIds);
      }
      if (filters?.status && filters.status.length > 0) {
        query = query.in("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000, // Cache por 30 segundos
  });

  // Sincronização em tempo real
  useEffect(() => {
    const channel = supabase
      .channel('transacoes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transacoes'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["transacoes"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

/**
 * Hook para buscar categorias ativas
 */
export function useCategorias(tipo?: "receita" | "despesa") {
  return useQuery({
    queryKey: ["categorias", tipo],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let query = supabase
        .from("categorias")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("nome");

      if (tipo) {
        query = query.eq("tipo", tipo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000, // Cache por 5 minutos
  });
}

/**
 * Hook para buscar centros de custo ativos
 */
export function useCentrosCusto() {
  return useQuery({
    queryKey: ["centros-custo"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("centros_custo")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data || [];
    },
    staleTime: 300000, // Cache por 5 minutos
  });
}

/**
 * Hook para buscar contas bancárias
 */
export function useContasBancarias() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["contas-bancarias"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("contas_bancarias")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("nome_banco");

      if (error) throw error;
      return data || [];
    },
    staleTime: 60000, // Cache por 1 minuto
  });

  // Sincronização em tempo real
  useEffect(() => {
    const channel = supabase
      .channel('contas_bancarias_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contas_bancarias'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["contas-bancarias"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

/**
 * Hook para buscar contrapartes (clientes e fornecedores)
 */
export function useContrapartes(papel?: "cliente" | "fornecedor" | "ambos") {
  return useQuery({
    queryKey: ["contrapartes", papel],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let query = supabase
        .from("contrapartes")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("nome");

      if (papel) {
        query = query.or(`papel.eq.${papel},papel.eq.ambos`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000, // Cache por 5 minutos
  });
}

/**
 * Hook para buscar budgets (planejamento)
 */
export function useBudgets(mesReferencia?: string) {
  return useQuery({
    queryKey: ["budgets", mesReferencia],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let query = supabase
        .from("budgets")
        .select(`
          *,
          categoria:categoria_id(id, nome, tipo, dre_grupo),
          centro_custo:centro_custo_id(id, nome, codigo)
        `)
        .eq("user_id", user.id)
        .order("mes_referencia", { ascending: false });

      if (mesReferencia) {
        query = query.eq("mes_referencia", mesReferencia);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000, // Cache por 1 minuto
  });
}

/**
 * Hook para buscar dados do Aging (contas a pagar/receber)
 */
export function useAging(papel?: "cliente" | "fornecedor") {
  return useQuery({
    queryKey: ["aging", papel],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let query = supabase
        .from("vw_aging")
        .select("*")
        .eq("user_id", user.id)
        .order("data_vencimento");

      if (papel) {
        query = query.eq("contraparte_papel", papel);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000, // Cache por 1 minuto
  });
}

/**
 * Hook para buscar dados da DRE por centro de custo
 */
export function useDRECentroCusto(mesReferencia: string, centroCustoId?: string) {
  return useQuery({
    queryKey: ["dre-centro-custo", mesReferencia, centroCustoId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

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
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000, // Cache por 1 minuto
  });
}

/**
 * Hook para buscar dados do fluxo de caixa
 */
export function useFluxoCaixa(dataInicio: string, dataFim: string) {
  return useQuery({
    queryKey: ["fluxo-caixa", dataInicio, dataFim],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("vw_fluxo_caixa")
        .select("*")
        .eq("user_id", user.id)
        .gte("data_referencia", dataInicio)
        .lte("data_referencia", dataFim)
        .order("data_referencia");

      if (error) throw error;
      return data || [];
    },
    staleTime: 60000, // Cache por 1 minuto
  });
}
