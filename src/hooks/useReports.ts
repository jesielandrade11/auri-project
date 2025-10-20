import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FiltrosRelatorio {
  dataInicio: string;
  dataFim: string;
  contaIds?: string[];
  categoriaIds?: string[];
  centroCustoIds?: string[];
  tipo?: "receita" | "despesa";
}

interface DadosFluxoCaixa {
  data: string;
  receitas: number;
  despesas: number;
  saldo: number;
  saldoAcumulado: number;
}

interface DadosDRE {
  categoria: string;
  tipo: string;
  valor: number;
  percentual: number;
  variacao: number;
}

interface DadosAging {
  contraparte: string;
  valor: number;
  diasAtraso: number;
  faixaAtraso: string;
  status: string;
}

export const useReports = (filtros: FiltrosRelatorio) => {
  // Relatório de Fluxo de Caixa
  const { data: fluxoCaixa, isLoading: loadingFluxoCaixa } = useQuery({
    queryKey: ["relatorio-fluxo-caixa", filtros],
    queryFn: async (): Promise<DadosFluxoCaixa[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let query = supabase
        .from("vw_fluxo_caixa")
        .select("*")
        .eq("user_id", user.id)
        .gte("data_referencia", filtros.dataInicio)
        .lte("data_referencia", filtros.dataFim)
        .order("data_referencia", { ascending: true });

      if (filtros.contaIds && filtros.contaIds.length > 0) {
        // Implementar filtro por conta se necessário
      }

      const { data, error } = await query;
      if (error) throw error;

      // Processar dados para o formato esperado
      const dadosProcessados: DadosFluxoCaixa[] = [];
      let saldoAcumulado = 0;

      (data || []).forEach(item => {
        const receitas = item.tipo === "receita" ? Number(item.valor) : 0;
        const despesas = item.tipo === "despesa" ? Number(item.valor) : 0;
        const saldo = receitas - despesas;
        saldoAcumulado += saldo;

        dadosProcessados.push({
          data: item.data_referencia || "",
          receitas,
          despesas,
          saldo,
          saldoAcumulado,
        });
      });

      return dadosProcessados;
    },
  });

  // Relatório DRE por Centro de Custo
  const { data: dreCentroCusto, isLoading: loadingDRE } = useQuery({
    queryKey: ["relatorio-dre-centro-custo", filtros],
    queryFn: async (): Promise<DadosDRE[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let query = supabase
        .from("vw_dre_centro_custo")
        .select("*")
        .eq("user_id", user.id)
        .gte("mes_competencia", filtros.dataInicio)
        .lte("mes_competencia", filtros.dataFim)
        .order("mes_competencia", { ascending: true });

      if (filtros.centroCustoIds && filtros.centroCustoIds.length > 0) {
        query = query.in("centro_custo_id", filtros.centroCustoIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Processar dados para o formato esperado
      const dadosProcessados: DadosDRE[] = [];
      const totalReceitas = (data || []).reduce((acc, item) => acc + (item.receitas || 0), 0);
      const totalDespesas = (data || []).reduce((acc, item) => acc + (item.despesas || 0), 0);

      (data || []).forEach(item => {
        const valor = item.receitas || item.despesas || 0;
        const percentual = totalReceitas > 0 ? (valor / totalReceitas) * 100 : 0;

        dadosProcessados.push({
          categoria: item.centro_custo_nome || "",
          tipo: item.categoria_tipo || "",
          valor,
          percentual,
          variacao: 0, // Implementar cálculo de variação se necessário
        });
      });

      return dadosProcessados;
    },
  });

  // Relatório de Aging
  const { data: aging, isLoading: loadingAging } = useQuery({
    queryKey: ["relatorio-aging", filtros],
    queryFn: async (): Promise<DadosAging[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("vw_aging")
        .select("*")
        .eq("user_id", user.id)
        .order("dias_atraso", { ascending: false });

      if (error) throw error;

      // Processar dados para o formato esperado
      const dadosProcessados: DadosAging[] = (data || []).map(item => ({
        contraparte: item.contraparte_nome || "",
        valor: item.valor || 0,
        diasAtraso: item.dias_atraso || 0,
        faixaAtraso: item.faixa_atraso || "",
        status: item.status || "",
      }));

      return dadosProcessados;
    },
  });

  // Relatório de Despesas por Categoria
  const { data: despesasCategoria, isLoading: loadingDespesasCategoria } = useQuery({
    queryKey: ["relatorio-despesas-categoria", filtros],
    queryFn: async (): Promise<DadosDRE[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let query = supabase
        .from("transacoes")
        .select(`
          valor,
          categoria:categoria_id(nome, tipo)
        `)
        .eq("user_id", user.id)
        .eq("tipo", "despesa")
        .eq("conciliado", true)
        .gte("data_transacao", filtros.dataInicio)
        .lte("data_transacao", filtros.dataFim);

      if (filtros.categoriaIds && filtros.categoriaIds.length > 0) {
        query = query.in("categoria_id", filtros.categoriaIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Agrupar por categoria
      const agrupado = new Map<string, { valor: number; categoria: string; tipo: string }>();
      
      (data || []).forEach(item => {
        const categoria = item.categoria?.nome || "Sem categoria";
        const tipo = item.categoria?.tipo || "despesa";
        const valor = Number(item.valor);

        if (agrupado.has(categoria)) {
          agrupado.get(categoria)!.valor += valor;
        } else {
          agrupado.set(categoria, { valor, categoria, tipo });
        }
      });

      const totalDespesas = Array.from(agrupado.values()).reduce((acc, item) => acc + item.valor, 0);

      return Array.from(agrupado.values()).map(item => ({
        categoria: item.categoria,
        tipo: item.tipo,
        valor: item.valor,
        percentual: totalDespesas > 0 ? (item.valor / totalDespesas) * 100 : 0,
        variacao: 0, // Implementar cálculo de variação se necessário
      }));
    },
  });

  // Relatório de Receitas por Categoria
  const { data: receitasCategoria, isLoading: loadingReceitasCategoria } = useQuery({
    queryKey: ["relatorio-receitas-categoria", filtros],
    queryFn: async (): Promise<DadosDRE[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let query = supabase
        .from("transacoes")
        .select(`
          valor,
          categoria:categoria_id(nome, tipo)
        `)
        .eq("user_id", user.id)
        .eq("tipo", "receita")
        .eq("conciliado", true)
        .gte("data_transacao", filtros.dataInicio)
        .lte("data_transacao", filtros.dataFim);

      if (filtros.categoriaIds && filtros.categoriaIds.length > 0) {
        query = query.in("categoria_id", filtros.categoriaIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Agrupar por categoria
      const agrupado = new Map<string, { valor: number; categoria: string; tipo: string }>();
      
      (data || []).forEach(item => {
        const categoria = item.categoria?.nome || "Sem categoria";
        const tipo = item.categoria?.tipo || "receita";
        const valor = Number(item.valor);

        if (agrupado.has(categoria)) {
          agrupado.get(categoria)!.valor += valor;
        } else {
          agrupado.set(categoria, { valor, categoria, tipo });
        }
      });

      const totalReceitas = Array.from(agrupado.values()).reduce((acc, item) => acc + item.valor, 0);

      return Array.from(agrupado.values()).map(item => ({
        categoria: item.categoria,
        tipo: item.tipo,
        valor: item.valor,
        percentual: totalReceitas > 0 ? (item.valor / totalReceitas) * 100 : 0,
        variacao: 0, // Implementar cálculo de variação se necessário
      }));
    },
  });

  return {
    fluxoCaixa,
    dreCentroCusto,
    aging,
    despesasCategoria,
    receitasCategoria,
    isLoading: loadingFluxoCaixa || loadingDRE || loadingAging || loadingDespesasCategoria || loadingReceitasCategoria,
  };
};