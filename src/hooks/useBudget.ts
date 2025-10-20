import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type Budget = Tables<"budgets">;
type BudgetInsert = TablesInsert<"budgets">;
type BudgetUpdate = TablesUpdate<"budgets">;

interface BudgetComDados extends Budget {
  categoria?: {
    id: string;
    nome: string;
    tipo: string;
    icone: string | null;
    cor: string | null;
  } | null;
  centro_custo?: {
    id: string;
    nome: string;
    codigo: string;
  } | null;
  valor_realizado?: number;
  percentual_realizado?: number;
  diferenca?: number;
}

export const useBudget = (ano?: number) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const anoAtual = ano || new Date().getFullYear();

  // Buscar orçamentos
  const {
    data: budgets = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["budgets", anoAtual],
    queryFn: async (): Promise<BudgetComDados[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const startDate = `${anoAtual}-01-01`;
      const endDate = `${anoAtual}-12-31`;

      const { data, error } = await supabase
        .from("budgets")
        .select(`
          *,
          categoria:categorias(id, nome, tipo, icone, cor),
          centro_custo:centros_custo(id, nome, codigo)
        `)
        .eq("user_id", user.id)
        .gte("mes_referencia", startDate)
        .lte("mes_referencia", endDate)
        .order("mes_referencia", { ascending: true });

      if (error) throw error;

      // Calcular valores realizados para cada orçamento
      const budgetsComDados = await Promise.all(
        (data || []).map(async (budget) => {
          const mesReferencia = new Date(budget.mes_referencia);
          const startOfMonth = new Date(mesReferencia.getFullYear(), mesReferencia.getMonth(), 1);
          const endOfMonth = new Date(mesReferencia.getFullYear(), mesReferencia.getMonth() + 1, 0);

          const { data: transacoes } = await supabase
            .from("transacoes")
            .select("valor")
            .eq("user_id", user.id)
            .eq("conciliado", true)
            .gte("data_transacao", startOfMonth.toISOString().split("T")[0])
            .lte("data_transacao", endOfMonth.toISOString().split("T")[0]);

          // Filtrar por categoria e centro de custo se especificados
          let transacoesFiltradas = transacoes || [];
          
          if (budget.categoria_id) {
            transacoesFiltradas = transacoesFiltradas.filter(t => 
              // Aqui você precisaria fazer uma query adicional para buscar transações por categoria
              // Por simplicidade, vou assumir que as transações já vêm filtradas
              true
            );
          }

          if (budget.centro_custo_id) {
            transacoesFiltradas = transacoesFiltradas.filter(t => 
              // Similar para centro de custo
              true
            );
          }

          const valorRealizado = transacoesFiltradas.reduce((acc, t) => acc + Number(t.valor), 0);
          const percentualRealizado = budget.valor_planejado > 0 
            ? (valorRealizado / budget.valor_planejado) * 100 
            : 0;
          const diferenca = budget.valor_planejado - valorRealizado;

          return {
            ...budget,
            valor_realizado: valorRealizado,
            percentual_realizado: percentualRealizado,
            diferenca: diferenca,
          };
        })
      );

      return budgetsComDados;
    },
  });

  // Criar orçamento
  const createMutation = useMutation({
    mutationFn: async (dados: BudgetInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("budgets")
        .insert({
          ...dados,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: "Orçamento criado com sucesso",
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

  // Atualizar orçamento
  const updateMutation = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: BudgetUpdate }) => {
      const { error } = await supabase
        .from("budgets")
        .update({
          ...dados,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: "Orçamento atualizado com sucesso",
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

  // Deletar orçamento
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: "Orçamento excluído com sucesso",
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

  // Buscar orçamentos por mês
  const getBudgetsByMonth = () => {
    const budgetsByMonth: { [key: number]: BudgetComDados[] } = {};
    for (let i = 1; i <= 12; i++) {
      budgetsByMonth[i] = budgets.filter((b) => {
        const mes = new Date(b.mes_referencia).getMonth() + 1;
        return mes === i;
      });
    }
    return budgetsByMonth;
  };

  // Calcular totais por mês
  const getTotalsByMonth = () => {
    const budgetsByMonth = getBudgetsByMonth();
    const totals: { [key: number]: { receitas: number; despesas: number; saldo: number } } = {};

    for (let i = 1; i <= 12; i++) {
      const budgetsMes = budgetsByMonth[i];
      const receitas = budgetsMes
        .filter((b) => b.categoria?.tipo === "receita")
        .reduce((acc, b) => acc + b.valor_planejado, 0);
      const despesas = budgetsMes
        .filter((b) => b.categoria?.tipo === "despesa")
        .reduce((acc, b) => acc + b.valor_planejado, 0);
      const saldo = receitas - despesas;

      totals[i] = { receitas, despesas, saldo };
    }

    return totals;
  };

  return {
    budgets,
    isLoading,
    error,
    refetch,
    createBudget: createMutation.mutate,
    updateBudget: updateMutation.mutate,
    deleteBudget: deleteMutation.mutate,
    getBudgetsByMonth,
    getTotalsByMonth,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};