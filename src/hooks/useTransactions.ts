import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type Transacao = Tables<"transacoes">;
type TransacaoInsert = TablesInsert<"transacoes">;
type TransacaoUpdate = TablesUpdate<"transacoes">;

interface TransacaoComDados extends Transacao {
  categoria?: {
    id: string;
    nome: string;
    icone: string | null;
    cor: string | null;
    tipo: string;
  } | null;
  centro_custo?: {
    id: string;
    nome: string;
    codigo: string;
  } | null;
  conta?: {
    id: string;
    nome_banco: string;
    numero_conta: string | null;
  } | null;
  contraparte?: {
    id: string;
    nome: string;
    papel: string;
  } | null;
}

interface FiltrosTransacoes {
  dataInicio?: string;
  dataFim?: string;
  contaIds?: string[];
  categoriaIds?: string[];
  tipo?: "receita" | "despesa";
  status?: string[];
  conciliado?: boolean;
  origem?: string[];
}

export const useTransactions = (filtros?: FiltrosTransacoes) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar transações com filtros
  const {
    data: transacoes = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["transacoes", filtros],
    queryFn: async (): Promise<TransacaoComDados[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let query = supabase
        .from("transacoes")
        .select(`
          *,
          categoria:categoria_id(id, nome, icone, cor, tipo),
          centro_custo:centro_custo_id(id, nome, codigo),
          conta:conta_id(id, nome_banco, numero_conta),
          contraparte:contraparte_id(id, nome, papel)
        `)
        .eq("user_id", user.id)
        .order("data_transacao", { ascending: false });

      if (filtros?.dataInicio) {
        query = query.gte("data_transacao", filtros.dataInicio);
      }
      if (filtros?.dataFim) {
        query = query.lte("data_transacao", filtros.dataFim);
      }
      if (filtros?.contaIds && filtros.contaIds.length > 0) {
        query = query.in("conta_id", filtros.contaIds);
      }
      if (filtros?.categoriaIds && filtros.categoriaIds.length > 0) {
        query = query.in("categoria_id", filtros.categoriaIds);
      }
      if (filtros?.tipo) {
        query = query.eq("tipo", filtros.tipo);
      }
      if (filtros?.status && filtros.status.length > 0) {
        query = query.in("status", filtros.status);
      }
      if (filtros?.conciliado !== undefined) {
        query = query.eq("conciliado", filtros.conciliado);
      }
      if (filtros?.origem && filtros.origem.length > 0) {
        query = query.in("origem", filtros.origem);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Criar transação
  const createMutation = useMutation({
    mutationFn: async (dados: TransacaoInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("transacoes")
        .insert({
          ...dados,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: "Transação criada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Atualizar transação
  const updateMutation = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: TransacaoUpdate }) => {
      const { error } = await supabase
        .from("transacoes")
        .update({
          ...dados,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: "Transação atualizada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Deletar transação
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transacoes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: "Transação excluída com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Conciliar transações
  const conciliarMutation = useMutation({
    mutationFn: async ({ ids, dataConciliacao }: { ids: string[]; dataConciliacao: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const agora = new Date().toISOString();

      const { error } = await supabase
        .from("transacoes")
        .update({
          status: "pago",
          conciliado: true,
          data_conciliacao: agora,
          data_pagamento: dataConciliacao,
          usuario_conciliacao: user.id,
          updated_at: agora,
        })
        .in("id", ids);

      if (error) throw error;
    },
    onSuccess: (_, { ids }) => {
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: `${ids.length} transação(ões) conciliada(s) com sucesso`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Buscar transações a vencer
  const { data: transacoesAVencer = [] } = useQuery({
    queryKey: ["transacoes-a-vencer"],
    queryFn: async (): Promise<TransacaoComDados[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const hoje = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("transacoes")
        .select(`
          *,
          categoria:categoria_id(id, nome, icone, cor, tipo),
          centro_custo:centro_custo_id(id, nome, codigo),
          conta:conta_id(id, nome_banco, numero_conta)
        `)
        .eq("user_id", user.id)
        .in("status", ["pendente", "agendado"])
        .gte("data_transacao", hoje)
        .order("data_transacao", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Buscar DDA boletos
  const { data: ddaBoletos = [] } = useQuery({
    queryKey: ["dda-boletos"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("dda_boletos")
        .select(`
          *,
          contas_bancarias!dda_boletos_conta_bancaria_id_fkey(id, nome_banco, numero_conta)
        `)
        .eq("user_id", user.id)
        .in("status", ["pendente", "vencido"])
        .order("data_vencimento", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  return {
    transacoes,
    transacoesAVencer,
    ddaBoletos,
    isLoading,
    error,
    refetch,
    createTransaction: createMutation.mutate,
    updateTransaction: updateMutation.mutate,
    deleteTransaction: deleteMutation.mutate,
    conciliarTransactions: conciliarMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isConciliando: conciliarMutation.isPending,
  };
};