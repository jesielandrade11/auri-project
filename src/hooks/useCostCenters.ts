import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type CentroCusto = Tables<"centros_custo">;
type CentroCustoInsert = TablesInsert<"centros_custo">;
type CentroCustoUpdate = TablesUpdate<"centros_custo">;

interface CentroCustoComDados extends CentroCusto {
  total_transacoes?: number;
  valor_total?: number;
  ultima_utilizacao?: string;
  percentual_utilizado?: number;
}

export const useCostCenters = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar centros de custo
  const {
    data: centrosCusto = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["centros-custo"],
    queryFn: async (): Promise<CentroCustoComDados[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("centros_custo")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calcular estatísticas para cada centro de custo
      const centrosComDados = await Promise.all(
        (data || []).map(async (centro) => {
          const { data: transacoes } = await supabase
            .from("transacoes")
            .select("valor, data_transacao")
            .eq("centro_custo_id", centro.id)
            .eq("conciliado", true)
            .order("data_transacao", { ascending: false });

          const totalTransacoes = transacoes?.length || 0;
          const valorTotal = transacoes?.reduce((acc, t) => acc + Number(t.valor), 0) || 0;
          const ultimaUtilizacao = transacoes?.[0]?.data_transacao;
          
          // Calcular percentual utilizado do orçamento mensal
          const percentualUtilizado = centro.orcamento_mensal && centro.orcamento_mensal > 0
            ? (valorTotal / centro.orcamento_mensal) * 100
            : 0;

          return {
            ...centro,
            total_transacoes: totalTransacoes,
            valor_total: valorTotal,
            ultima_utilizacao: ultimaUtilizacao,
            percentual_utilizado: percentualUtilizado,
          };
        })
      );

      return centrosComDados;
    },
  });

  // Criar centro de custo
  const createMutation = useMutation({
    mutationFn: async (dados: CentroCustoInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("centros_custo")
        .insert({
          ...dados,
          user_id: user.id,
          ativo: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centros-custo"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: "Centro de custo criado com sucesso",
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

  // Atualizar centro de custo
  const updateMutation = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: CentroCustoUpdate }) => {
      const { error } = await supabase
        .from("centros_custo")
        .update({
          ...dados,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centros-custo"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: "Centro de custo atualizado com sucesso",
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

  // Deletar centro de custo
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("centros_custo")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centros-custo"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: "Centro de custo excluído com sucesso",
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

  return {
    centrosCusto,
    isLoading,
    error,
    refetch,
    createCostCenter: createMutation.mutate,
    updateCostCenter: updateMutation.mutate,
    deleteCostCenter: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};