import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "./useNotifications";

interface DadosSincronizacao {
  contaId: string;
  transacoes: Array<{
    data_transacao: string;
    descricao: string;
    valor: number;
    tipo: "receita" | "despesa";
    categoria_id?: string;
    centro_custo_id?: string;
    status: string;
    origem: string;
    hash_duplicata?: string;
  }>;
  saldoAtual: number;
  dataSincronizacao: string;
}

export const useBankSync = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { notificarSincronizacaoConta, notificarErroSincronizacao } = useNotifications();

  // Sincronizar conta individual
  const syncContaMutation = useMutation({
    mutationFn: async (contaId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Buscar dados da conta
      const { data: conta, error: contaError } = await supabase
        .from("contas_bancarias")
        .select("*")
        .eq("id", contaId)
        .eq("user_id", user.id)
        .single();

      if (contaError) throw contaError;

      // Simular sincronização com API bancária
      // Em produção, aqui você faria a chamada real para a API do banco
      const dadosSincronizacao = await simularSincronizacaoAPI(conta);

      // Atualizar saldo da conta
      const { error: updateError } = await supabase
        .from("contas_bancarias")
        .update({
          saldo_atual: dadosSincronizacao.saldoAtual,
          ultima_sincronizacao: dadosSincronizacao.dataSincronizacao,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contaId);

      if (updateError) throw updateError;

      // Inserir transações novas
      if (dadosSincronizacao.transacoes.length > 0) {
        const transacoesParaInserir = dadosSincronizacao.transacoes.map(transacao => ({
          ...transacao,
          user_id: user.id,
          conta_id: contaId,
          conciliado: false,
          created_at: new Date().toISOString(),
        }));

        const { error: transacoesError } = await supabase
          .from("transacoes")
          .insert(transacoesParaInserir);

        if (transacoesError) throw transacoesError;
      }

      return {
        contaId,
        transacoesImportadas: dadosSincronizacao.transacoes.length,
        saldoAtual: dadosSincronizacao.saldoAtual,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["contas-bancarias"] });
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      
      toast({
        title: "Sincronização concluída",
        description: `${result.transacoesImportadas} transações importadas`,
      });

      notificarSincronizacaoConta(
        `Conta ${result.contaId}`, 
        result.transacoesImportadas
      );
    },
    onError: (error: any) => {
      toast({
        title: "Erro na sincronização",
        description: error.message,
        variant: "destructive",
      });

      notificarErroSincronizacao("Conta", error.message);
    },
  });

  // Sincronizar todas as contas
  const syncTodasContasMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Buscar todas as contas ativas
      const { data: contas, error: contasError } = await supabase
        .from("contas_bancarias")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true);

      if (contasError) throw contasError;

      const resultados = [];
      let totalTransacoes = 0;

      // Sincronizar cada conta
      for (const conta of contas || []) {
        try {
          const resultado = await syncContaMutation.mutateAsync(conta.id);
          resultados.push(resultado);
          totalTransacoes += resultado.transacoesImportadas;
        } catch (error) {
          console.error(`Erro ao sincronizar conta ${conta.nome_banco}:`, error);
          // Continuar com as outras contas mesmo se uma falhar
        }
      }

      return {
        contasSincronizadas: resultados.length,
        totalTransacoes,
        totalContas: contas?.length || 0,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["contas-bancarias"] });
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      
      toast({
        title: "Sincronização em lote concluída",
        description: `${result.contasSincronizadas}/${result.totalContas} contas sincronizadas. ${result.totalTransacoes} transações importadas.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na sincronização em lote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Simular sincronização com API bancária
  const simularSincronizacaoAPI = async (conta: any): Promise<DadosSincronizacao> => {
    // Simular delay da API
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simular dados de transações
    const transacoes = [
      {
        data_transacao: new Date().toISOString().split("T")[0],
        descricao: "Transferência recebida",
        valor: 1500.00,
        tipo: "receita" as const,
        status: "pago",
        origem: "api",
        hash_duplicata: `hash_${Date.now()}_1`,
      },
      {
        data_transacao: new Date(Date.now() - 86400000).toISOString().split("T")[0],
        descricao: "Pagamento de fornecedor",
        valor: 350.00,
        tipo: "despesa" as const,
        status: "pago",
        origem: "api",
        hash_duplicata: `hash_${Date.now()}_2`,
      },
      {
        data_transacao: new Date(Date.now() - 172800000).toISOString().split("T")[0],
        descricao: "Salário funcionários",
        valor: 2500.00,
        tipo: "despesa" as const,
        status: "pago",
        origem: "api",
        hash_duplicata: `hash_${Date.now()}_3`,
      },
    ];

    // Simular saldo atual
    const saldoAtual = Number(conta.saldo_atual || 0) + 
      transacoes.reduce((acc, t) => acc + (t.tipo === "receita" ? t.valor : -t.valor), 0);

    return {
      contaId: conta.id,
      transacoes,
      saldoAtual,
      dataSincronizacao: new Date().toISOString(),
    };
  };

  // Verificar duplicatas antes de inserir
  const verificarDuplicatas = async (transacoes: any[], contaId: string) => {
    const hashes = transacoes.map(t => t.hash_duplicata).filter(Boolean);
    
    if (hashes.length === 0) return transacoes;

    const { data: duplicatas } = await supabase
      .from("transacoes")
      .select("hash_duplicata")
      .eq("conta_id", contaId)
      .in("hash_duplicata", hashes);

    const hashesExistentes = new Set(duplicatas?.map(d => d.hash_duplicata) || []);
    
    return transacoes.filter(t => !t.hash_duplicata || !hashesExistentes.has(t.hash_duplicata));
  };

  // Aplicar regras de categorização automática
  const aplicarCategorizacaoAutomatica = async (transacoes: any[]) => {
    // Buscar regras de categorização
    const { data: regras } = await supabase
      .from("regras_categorizacao")
      .select("*")
      .eq("ativo", true);

    return transacoes.map(transacao => {
      // Aplicar regras de categorização
      for (const regra of regras || []) {
        if (transacao.descricao.toLowerCase().includes(regra.descricao_padrao.toLowerCase())) {
          return {
            ...transacao,
            categoria_id: regra.categoria_id,
            classificado_auto: true,
            confianca_classificacao: regra.confianca,
          };
        }
      }
      return transacao;
    });
  };

  return {
    syncConta: syncContaMutation.mutate,
    syncTodasContas: syncTodasContasMutation.mutate,
    isSyncing: syncContaMutation.isPending,
    isSyncingAll: syncTodasContasMutation.isPending,
  };
};