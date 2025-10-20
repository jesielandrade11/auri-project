import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  transacoesAPI,
  categoriasAPI,
  centrosCustoAPI,
  contasBancariasAPI,
  contrapartesAPI,
  budgetAPI,
  reportsAPI,
  type Transacao,
  type Categoria,
  type CentroCusto,
  type ContaBancaria,
  type Contraparte,
  type Budget,
} from "@/services/api";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// Transações hooks
export function useTransacoes(filters?: Parameters<typeof transacoesAPI.getAll>[0]) {
  return useQuery({
    queryKey: ["transacoes", filters],
    queryFn: () => transacoesAPI.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useTransacao(id: string) {
  return useQuery({
    queryKey: ["transacao", id],
    queryFn: () => transacoesAPI.getById(id),
    enabled: !!id,
  });
}

export function useCreateTransacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: Omit<TablesInsert<"transacoes">, "user_id">) =>
      transacoesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      toast({
        title: "Sucesso",
        description: "Transação criada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTransacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TablesUpdate<"transacoes"> }) =>
      transacoesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      queryClient.invalidateQueries({ queryKey: ["transacao"] });
      toast({
        title: "Sucesso",
        description: "Transação atualizada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTransacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => transacoesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      toast({
        title: "Sucesso",
        description: "Transação excluída com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useConciliarTransacoes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (ids: string[]) => transacoesAPI.conciliar(ids),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      toast({
        title: "Sucesso",
        description: `${ids.length} transação(ões) conciliada(s) com sucesso`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Categorias hooks
export function useCategorias(ativo?: boolean) {
  return useQuery({
    queryKey: ["categorias", ativo],
    queryFn: () => categoriasAPI.getAll(ativo),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useCreateCategoria() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: Omit<TablesInsert<"categorias">, "user_id">) =>
      categoriasAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      toast({
        title: "Sucesso",
        description: "Categoria criada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateCategoria() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TablesUpdate<"categorias"> }) =>
      categoriasAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      toast({
        title: "Sucesso",
        description: "Categoria atualizada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteCategoria() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => categoriasAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      toast({
        title: "Sucesso",
        description: "Categoria excluída com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Centros de Custo hooks
export function useCentrosCusto(ativo?: boolean) {
  return useQuery({
    queryKey: ["centros-custo", ativo],
    queryFn: () => centrosCustoAPI.getAll(ativo),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateCentroCusto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: Omit<TablesInsert<"centros_custo">, "user_id">) =>
      centrosCustoAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centros-custo"] });
      toast({
        title: "Sucesso",
        description: "Centro de custo criado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateCentroCusto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TablesUpdate<"centros_custo"> }) =>
      centrosCustoAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centros-custo"] });
      toast({
        title: "Sucesso",
        description: "Centro de custo atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteCentroCusto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => centrosCustoAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centros-custo"] });
      toast({
        title: "Sucesso",
        description: "Centro de custo excluído com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Contas Bancárias hooks
export function useContasBancarias(ativo?: boolean) {
  return useQuery({
    queryKey: ["contas-bancarias", ativo],
    queryFn: () => contasBancariasAPI.getAll(ativo),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateContaBancaria() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: Omit<TablesInsert<"contas_bancarias">, "user_id">) =>
      contasBancariasAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-bancarias"] });
      toast({
        title: "Sucesso",
        description: "Conta bancária criada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateContaBancaria() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TablesUpdate<"contas_bancarias"> }) =>
      contasBancariasAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-bancarias"] });
      toast({
        title: "Sucesso",
        description: "Conta bancária atualizada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteContaBancaria() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => contasBancariasAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-bancarias"] });
      toast({
        title: "Sucesso",
        description: "Conta bancária excluída com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Contrapartes hooks
export function useContrapartes(ativo?: boolean) {
  return useQuery({
    queryKey: ["contrapartes", ativo],
    queryFn: () => contrapartesAPI.getAll(ativo),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateContraparte() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: Omit<TablesInsert<"contrapartes">, "user_id">) =>
      contrapartesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrapartes"] });
      toast({
        title: "Sucesso",
        description: "Contraparte criada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateContraparte() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TablesUpdate<"contrapartes"> }) =>
      contrapartesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrapartes"] });
      toast({
        title: "Sucesso",
        description: "Contraparte atualizada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteContraparte() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => contrapartesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrapartes"] });
      toast({
        title: "Sucesso",
        description: "Contraparte inativada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Budget/Planejamento hooks
export function useBudgets(filters?: Parameters<typeof budgetAPI.getAll>[0]) {
  return useQuery({
    queryKey: ["budgets", filters],
    queryFn: () => budgetAPI.getAll(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: Omit<TablesInsert<"budgets">, "user_id">) =>
      budgetAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast({
        title: "Sucesso",
        description: "Planejamento criado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TablesUpdate<"budgets"> }) =>
      budgetAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast({
        title: "Sucesso",
        description: "Planejamento atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => budgetAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast({
        title: "Sucesso",
        description: "Planejamento excluído com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Reports hooks
export function useFluxoCaixaReport(dataInicio: string, dataFim: string) {
  return useQuery({
    queryKey: ["fluxo-caixa-report", dataInicio, dataFim],
    queryFn: () => reportsAPI.getFluxoCaixa(dataInicio, dataFim),
    enabled: !!dataInicio && !!dataFim,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

export function useDRECentroCustoReport(mesReferencia: string, centroCustoId?: string) {
  return useQuery({
    queryKey: ["dre-centro-custo-report", mesReferencia, centroCustoId],
    queryFn: () => reportsAPI.getDRECentroCusto(mesReferencia, centroCustoId),
    enabled: !!mesReferencia,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAgingReport(papel?: string) {
  return useQuery({
    queryKey: ["aging-report", papel],
    queryFn: () => reportsAPI.getAging(papel),
    staleTime: 2 * 60 * 1000,
  });
}