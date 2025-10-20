import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tempo de cache padrão: 5 minutos
      staleTime: 5 * 60 * 1000,
      // Tempo de garbage collection: 10 minutos
      gcTime: 10 * 60 * 1000,
      // Retry automático em caso de erro
      retry: (failureCount, error: any) => {
        // Não tentar novamente para erros 4xx (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Tentar até 3 vezes para outros erros
        return failureCount < 3;
      },
      // Refetch automático quando a janela ganha foco
      refetchOnWindowFocus: true,
      // Refetch automático quando reconecta à internet
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry automático para mutations
      retry: (failureCount, error: any) => {
        // Não tentar novamente para erros 4xx
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Tentar até 2 vezes para outros erros
        return failureCount < 2;
      },
    },
  },
});

// Configurações específicas para diferentes tipos de queries
export const queryKeys = {
  // Transações
  transacoes: ["transacoes"] as const,
  transacoesDashboard: (filtros: any) => ["transacoes-dashboard", filtros] as const,
  transacoesAVencer: ["transacoes-a-vencer"] as const,
  ddaBoletos: ["dda-boletos"] as const,
  
  // Contas bancárias
  contasBancarias: ["contas-bancarias"] as const,
  
  // Categorias
  categorias: ["categorias"] as const,
  categoriasPorTipo: (tipo: string) => ["categorias", tipo] as const,
  
  // Centros de custo
  centrosCusto: ["centros-custo"] as const,
  
  // Orçamentos
  budgets: ["budgets"] as const,
  budgetsPorAno: (ano: number) => ["budgets", ano] as const,
  
  // Dashboard
  dashboard: (filtros: any) => ["dashboard", filtros] as const,
  
  // Categorização
  transacoesNaoCategorizadas: ["transacoes-nao-categorizadas"] as const,
  regrasCategorizacao: ["regras-categorizacao"] as const,
  
  // Relatórios
  relatorioFluxoCaixa: (filtros: any) => ["relatorio-fluxo-caixa", filtros] as const,
  relatorioDRECentroCusto: (filtros: any) => ["relatorio-dre-centro-custo", filtros] as const,
  relatorioAging: (filtros: any) => ["relatorio-aging", filtros] as const,
  relatorioDespesasCategoria: (filtros: any) => ["relatorio-despesas-categoria", filtros] as const,
  relatorioReceitasCategoria: (filtros: any) => ["relatorio-receitas-categoria", filtros] as const,
} as const;

// Função para invalidar queries relacionadas
export const invalidateRelatedQueries = (type: keyof typeof queryKeys) => {
  switch (type) {
    case "transacoes":
      queryClient.invalidateQueries({ queryKey: queryKeys.transacoes });
      queryClient.invalidateQueries({ queryKey: queryKeys.transacoesAVencer });
      queryClient.invalidateQueries({ queryKey: queryKeys.ddaBoletos });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      break;
    case "contasBancarias":
      queryClient.invalidateQueries({ queryKey: queryKeys.contasBancarias });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      break;
    case "categorias":
      queryClient.invalidateQueries({ queryKey: queryKeys.categorias });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      break;
    case "centrosCusto":
      queryClient.invalidateQueries({ queryKey: queryKeys.centrosCusto });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      break;
    case "budgets":
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      break;
    default:
      queryClient.invalidateQueries({ queryKey: queryKeys[type] });
  }
};