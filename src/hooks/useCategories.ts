import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type Categoria = Tables<"categorias">;
type CategoriaInsert = TablesInsert<"categorias">;
type CategoriaUpdate = TablesUpdate<"categorias">;

interface CategoriaComDados extends Categoria {
  total_transacoes?: number;
  valor_total?: number;
  ultima_utilizacao?: string;
}

export const useCategories = (tipo?: "receita" | "despesa") => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar categorias
  const {
    data: categorias = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["categorias", tipo],
    queryFn: async (): Promise<CategoriaComDados[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let query = supabase
        .from("categorias")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("tipo")
        .order("nome");

      if (tipo) {
        query = query.eq("tipo", tipo);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calcular estatísticas para cada categoria
      const categoriasComDados = await Promise.all(
        (data || []).map(async (categoria) => {
          const { data: transacoes } = await supabase
            .from("transacoes")
            .select("valor, data_transacao")
            .eq("categoria_id", categoria.id)
            .eq("conciliado", true)
            .order("data_transacao", { ascending: false });

          const totalTransacoes = transacoes?.length || 0;
          const valorTotal = transacoes?.reduce((acc, t) => acc + Number(t.valor), 0) || 0;
          const ultimaUtilizacao = transacoes?.[0]?.data_transacao;

          return {
            ...categoria,
            total_transacoes: totalTransacoes,
            valor_total: valorTotal,
            ultima_utilizacao: ultimaUtilizacao,
          };
        })
      );

      return categoriasComDados;
    },
  });

  // Criar categoria
  const createMutation = useMutation({
    mutationFn: async (dados: CategoriaInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("categorias")
        .insert({
          ...dados,
          user_id: user.id,
          ativo: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: "Categoria criada com sucesso",
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

  // Atualizar categoria
  const updateMutation = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: CategoriaUpdate }) => {
      const { error } = await supabase
        .from("categorias")
        .update({
          ...dados,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: "Categoria atualizada com sucesso",
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

  // Deletar categoria (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("categorias")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Sucesso",
        description: "Categoria desativada com sucesso",
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

  // Buscar categorias por tipo
  const receitas = categorias.filter(c => c.tipo === "receita");
  const despesas = categorias.filter(c => c.tipo === "despesa");

  return {
    categorias,
    receitas,
    despesas,
    isLoading,
    error,
    refetch,
    createCategory: createMutation.mutate,
    updateCategory: updateMutation.mutate,
    deleteCategory: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};