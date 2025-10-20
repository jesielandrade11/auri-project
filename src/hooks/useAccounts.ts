import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type ContaBancaria = Tables<"contas_bancarias">;
type ContaBancariaInsert = TablesInsert<"contas_bancarias">;
type ContaBancariaUpdate = TablesUpdate<"contas_bancarias">;

interface ContaComDados extends ContaBancaria {
  saldo_calculado?: number;
  ultima_transacao?: string;
  total_receitas?: number;
  total_despesas?: number;
}

export const useAccounts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar contas bancárias
  const {
    data: contas = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["contas-bancarias"],
    queryFn: async (): Promise<ContaComDados[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("contas_bancarias")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calcular saldo e estatísticas para cada conta
      const contasComDados = await Promise.all(
        (data || []).map(async (conta) => {
          // Buscar transações conciliadas para calcular saldo
          const { data: transacoes } = await supabase
            .from("transacoes")
            .select("valor, tipo, data_transacao")
            .eq("conta_id", conta.id)
            .eq("conciliado", true)
            .order("data_transacao", { ascending: false });

          const saldoCalculado = (transacoes || []).reduce((acc, t) => {
            return acc + (t.tipo === "receita" ? Number(t.valor) : -Number(t.valor));
          }, Number(conta.saldo_inicial || 0));

          const totalReceitas = (transacoes || [])
            .filter(t => t.tipo === "receita")
            .reduce((acc, t) => acc + Number(t.valor), 0);

          const totalDespesas = (transacoes || [])
            .filter(t => t.tipo === "despesa")
            .reduce((acc, t) => acc + Number(t.valor), 0);

          const ultimaTransacao = transacoes?.[0]?.data_transacao;

          return {
            ...conta,
            saldo_calculado: saldoCalculado,
            ultima_transacao: ultimaTransacao,
            total_receitas: totalReceitas,
            total_despesas: totalDespesas,
          };
        })
      );

      return contasComDados;
    },
  });

  // Criar conta bancária
  const createMutation = useMutation({
    mutationFn: async (dados: ContaBancariaInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("contas_bancarias")
        .insert({
          ...dados,
          user_id: user.id,
          ativo: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-bancarias"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: "Conta bancária criada com sucesso",
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

  // Atualizar conta bancária
  const updateMutation = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: ContaBancariaUpdate }) => {
      const { error } = await supabase
        .from("contas_bancarias")
        .update({
          ...dados,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-bancarias"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: "Conta bancária atualizada com sucesso",
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

  // Deletar conta bancária
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contas_bancarias")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-bancarias"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: "Conta bancária desativada com sucesso",
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

  // Sincronizar conta (simulação)
  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      // Simular sincronização
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { error } = await supabase
        .from("contas_bancarias")
        .update({
          ultima_sincronizacao: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-bancarias"] });
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sincronização concluída",
        description: "Conta sincronizada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na sincronização",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Atualizar saldo da conta
  const updateSaldoMutation = useMutation({
    mutationFn: async ({ id, novoSaldo }: { id: string; novoSaldo: number }) => {
      const { error } = await supabase
        .from("contas_bancarias")
        .update({
          saldo_atual: novoSaldo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-bancarias"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: "Saldo atualizado com sucesso",
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
    contas,
    isLoading,
    error,
    refetch,
    createAccount: createMutation.mutate,
    updateAccount: updateMutation.mutate,
    deleteAccount: deleteMutation.mutate,
    syncAccount: syncMutation.mutate,
    updateSaldo: updateSaldoMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSyncing: syncMutation.isPending,
    isUpdatingSaldo: updateSaldoMutation.isPending,
  };
};