import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TransacaoParaCategorizar {
  id: string;
  descricao: string;
  valor: number;
  tipo: string;
  data_transacao: string;
  categoria_sugerida?: {
    id: string;
    nome: string;
    confianca: number;
    motivo: string;
  };
}

interface RegraCategorizacao {
  id: string;
  descricao_padrao: string;
  categoria_id: string;
  confianca: number;
  ativo: boolean;
  categoria?: {
    id: string;
    nome: string;
    tipo: string;
  };
}

export const useCategorization = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar transações não categorizadas
  const { data: transacoesNaoCategorizadas = [], isLoading } = useQuery({
    queryKey: ["transacoes-nao-categorizadas"],
    queryFn: async (): Promise<TransacaoParaCategorizar[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("transacoes")
        .select(`
          id,
          descricao,
          valor,
          tipo,
          data_transacao,
          categoria_id
        `)
        .eq("user_id", user.id)
        .is("categoria_id", null)
        .eq("conciliado", true)
        .order("data_transacao", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });

  // Buscar regras de categorização
  const { data: regrasCategorizacao = [] } = useQuery({
    queryKey: ["regras-categorizacao"],
    queryFn: async (): Promise<RegraCategorizacao[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("regras_categorizacao")
        .select(`
          *,
          categoria:categorias(id, nome, tipo)
        `)
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("confianca", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Aplicar categorização automática
  const categorizarMutation = useMutation({
    mutationFn: async ({ transacaoId, categoriaId }: { transacaoId: string; categoriaId: string }) => {
      const { error } = await supabase
        .from("transacoes")
        .update({
          categoria_id: categoriaId,
          classificado_auto: true,
          confianca_classificacao: 0.8, // Simulação
          updated_at: new Date().toISOString(),
        })
        .eq("id", transacaoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacoes-nao-categorizadas"] });
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: "Transação categorizada com sucesso",
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

  // Categorizar em lote
  const categorizarLoteMutation = useMutation({
    mutationFn: async (categorizacoes: { transacaoId: string; categoriaId: string }[]) => {
      const updates = categorizacoes.map(({ transacaoId, categoriaId }) => ({
        id: transacaoId,
        categoria_id: categoriaId,
        classificado_auto: true,
        confianca_classificacao: 0.8,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("transacoes")
        .upsert(updates);

      if (error) throw error;
    },
    onSuccess: (_, categorizacoes) => {
      queryClient.invalidateQueries({ queryKey: ["transacoes-nao-categorizadas"] });
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: `${categorizacoes.length} transações categorizadas com sucesso`,
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

  // Sugerir categoria baseada em regras
  const sugerirCategoria = (descricao: string, valor: number, tipo: string) => {
    const descricaoLower = descricao.toLowerCase();
    
    for (const regra of regrasCategorizacao) {
      const padraoLower = regra.descricao_padrao.toLowerCase();
      
      // Verificar se a descrição contém o padrão
      if (descricaoLower.includes(padraoLower)) {
        return {
          id: regra.categoria_id,
          nome: regra.categoria?.nome || "",
          confianca: regra.confianca,
          motivo: `Contém "${regra.descricao_padrao}"`,
        };
      }
    }

    // Sugestões baseadas em palavras-chave comuns
    const sugestoesComuns = [
      { palavras: ["alimentação", "restaurante", "lanchonete", "supermercado"], categoria: "Alimentação" },
      { palavras: ["combustível", "gasolina", "posto"], categoria: "Combustível" },
      { palavras: ["farmácia", "medicamento", "drogaria"], categoria: "Saúde" },
      { palavras: ["transporte", "uber", "taxi", "ônibus"], categoria: "Transporte" },
      { palavras: ["energia", "luz", "eletricidade"], categoria: "Energia" },
      { palavras: ["água", "saneamento"], categoria: "Água" },
      { palavras: ["internet", "telefone", "telecomunicação"], categoria: "Telecomunicações" },
    ];

    for (const sugestao of sugestoesComuns) {
      if (sugestao.palavras.some(palavra => descricaoLower.includes(palavra))) {
        return {
          id: "", // Será preenchido quando a categoria for encontrada
          nome: sugestao.categoria,
          confianca: 0.6,
          motivo: `Palavra-chave: ${sugestao.palavras.find(p => descricaoLower.includes(p))}`,
        };
      }
    }

    return null;
  };

  // Aplicar categorização automática em lote
  const aplicarCategorizacaoAutomatica = () => {
    const categorizacoes: { transacaoId: string; categoriaId: string }[] = [];

    transacoesNaoCategorizadas.forEach(transacao => {
      const sugestao = sugerirCategoria(transacao.descricao, transacao.valor, transacao.tipo);
      if (sugestao && sugestao.confianca > 0.7) {
        // Buscar ID da categoria pelo nome
        const categoria = regrasCategorizacao.find(r => r.categoria?.nome === sugestao.nome);
        if (categoria) {
          categorizacoes.push({
            transacaoId: transacao.id,
            categoriaId: categoria.categoria_id,
          });
        }
      }
    });

    if (categorizacoes.length > 0) {
      categorizarLoteMutation.mutate(categorizacoes);
    } else {
      toast({
        title: "Nenhuma sugestão",
        description: "Não foram encontradas transações com sugestões de alta confiança",
        variant: "destructive",
      });
    }
  };

  return {
    transacoesNaoCategorizadas,
    regrasCategorizacao,
    isLoading,
    categorizar: categorizarMutation.mutate,
    categorizarLote: categorizarLoteMutation.mutate,
    aplicarCategorizacaoAutomatica,
    sugerirCategoria,
    isCategorizando: categorizarMutation.isPending,
    isCategorizandoLote: categorizarLoteMutation.isPending,
  };
};