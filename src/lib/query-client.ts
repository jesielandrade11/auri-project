import { QueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

// Configuração global do React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tempo que os dados ficam "frescos" (não refetch automaticamente)
      staleTime: 5 * 60 * 1000, // 5 minutos
      
      // Tempo que os dados ficam em cache
      gcTime: 10 * 60 * 1000, // 10 minutos (anteriormente cacheTime)
      
      // Retry automático em caso de erro
      retry: (failureCount, error: any) => {
        // Não retry em erros de autenticação
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        
        // Retry até 2 vezes para outros erros
        return failureCount < 2;
      },
      
      // Intervalo entre retries (exponential backoff)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch quando a janela ganha foco
      refetchOnWindowFocus: false,
      
      // Refetch quando reconecta à internet
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry para mutations em caso de erro de rede
      retry: (failureCount, error: any) => {
        // Não retry em erros de cliente (4xx)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        
        // Retry até 1 vez para erros de servidor
        return failureCount < 1;
      },
      
      // Handler global de erro para mutations
      onError: (error: any) => {
        // Só mostra toast se não foi tratado especificamente
        if (!error.handled) {
          toast({
            title: "Erro",
            description: error.message || "Ocorreu um erro inesperado",
            variant: "destructive",
          });
        }
      },
    },
  },
});

// Configurações específicas por tipo de query
export const queryKeys = {
  // Dados mestres (mudam pouco)
  categorias: (ativo?: boolean) => ["categorias", ativo],
  centrosCusto: (ativo?: boolean) => ["centros-custo", ativo],
  contrapartes: (ativo?: boolean) => ["contrapartes", ativo],
  contasBancarias: (ativo?: boolean) => ["contas-bancarias", ativo],
  
  // Dados transacionais (mudam frequentemente)
  transacoes: (filters?: any) => ["transacoes", filters],
  budgets: (filters?: any) => ["budgets", filters],
  
  // Relatórios (dados calculados)
  fluxoCaixaReport: (dataInicio: string, dataFim: string) => 
    ["fluxo-caixa-report", dataInicio, dataFim],
  dreReport: (mesReferencia: string, centroCustoId?: string) => 
    ["dre-centro-custo-report", mesReferencia, centroCustoId],
  agingReport: (papel?: string) => 
    ["aging-report", papel],
  
  // Dashboard
  dashboard: (filters?: any) => ["dashboard", filters],
} as const;

// Prefetch de dados importantes
export const prefetchEssentialData = async () => {
  // Prefetch categorias ativas
  queryClient.prefetchQuery({
    queryKey: queryKeys.categorias(true),
    staleTime: 10 * 60 * 1000, // 10 minutos para dados mestres
  });
  
  // Prefetch centros de custo ativos
  queryClient.prefetchQuery({
    queryKey: queryKeys.centrosCusto(true),
    staleTime: 10 * 60 * 1000,
  });
  
  // Prefetch contas bancárias ativas
  queryClient.prefetchQuery({
    queryKey: queryKeys.contasBancarias(true),
    staleTime: 5 * 60 * 1000,
  });
};

// Invalidação inteligente de cache
export const invalidateRelatedQueries = {
  transacoes: () => {
    queryClient.invalidateQueries({ queryKey: ["transacoes"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["fluxo-caixa-report"] });
    queryClient.invalidateQueries({ queryKey: ["dre-centro-custo-report"] });
    queryClient.invalidateQueries({ queryKey: ["aging-report"] });
  },
  
  categorias: () => {
    queryClient.invalidateQueries({ queryKey: ["categorias"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  },
  
  centrosCusto: () => {
    queryClient.invalidateQueries({ queryKey: ["centros-custo"] });
    queryClient.invalidateQueries({ queryKey: ["dre-centro-custo-report"] });
  },
  
  contasBancarias: () => {
    queryClient.invalidateQueries({ queryKey: ["contas-bancarias"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  },
  
  budgets: () => {
    queryClient.invalidateQueries({ queryKey: ["budgets"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  },
};