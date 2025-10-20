import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FilterState {
  dataInicio: string;
  dataFim: string;
  granularidade: "diario" | "semanal" | "mensal" | "anual";
  contaIds: string[];
  categoriaIds: string[];
}

interface KPIData {
  faturamentoBruto: number;
  gastosOperacionais: number;
  lucroOperacional: number;
  lucroLiquido: number;
  roi: number;
  saldoCaixa: number;
  variacoes: {
    faturamento: number;
    gastos: number;
    lucroOp: number;
    lucroLiq: number;
  };
  margens: {
    operacional: number;
    liquida: number;
  };
  diasReserva: number;
}

interface FluxoCaixaData {
  periodo: string;
  receitas: number;
  despesas: number;
  saldo: number;
  saldoAcumulado: number;
}

interface CategoriaData {
  categoria: string;
  valor: number;
  icone: string;
  cor: string;
  percentualDespesas: number;
  percentualFaturamento: number;
  variacao: number;
}

interface RentabilidadeData {
  margemBruta: number;
  margemOperacional: number;
  margemLiquida: number;
  pontoEquilibrio: number;
  faturamentoAtual: number;
}

interface Alerta {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const useDashboard = (filtros?: FilterState) => {
  // Buscar contas
  const { data: contas = [] } = useQuery({
    queryKey: ["contas-bancarias"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("contas_bancarias")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true);

      if (error) throw error;
      return data || [];
    },
  });

  // Buscar categorias
  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true);

      if (error) throw error;
      return data || [];
    },
  });

  // Buscar transações com filtros
  const { data: transacoes = [], isLoading } = useQuery({
    queryKey: ["transacoes-dashboard", filtros],
    enabled: !!filtros,
    queryFn: async () => {
      if (!filtros) return [];
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let query = supabase
        .from("transacoes")
        .select(`
          *,
          categoria:categoria_id(id, nome, tipo, icone, cor),
          centro_custo:centro_custo_id(id, nome)
        `)
        .eq("user_id", user.id)
        .gte("data_transacao", filtros.dataInicio)
        .lte("data_transacao", filtros.dataFim)
        .eq("conciliado", true);

      if (filtros.contaIds.length > 0) {
        query = query.in("conta_id", filtros.contaIds);
      }

      if (filtros.categoriaIds.length > 0) {
        query = query.in("categoria_id", filtros.categoriaIds);
      }

      const { data, error } = await query.order("data_transacao", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Calcular KPIs
  const kpiData: KPIData = {
    faturamentoBruto: transacoes
      .filter((t) => t.tipo === "receita")
      .reduce((sum, t) => sum + Number(t.valor), 0),
    gastosOperacionais: transacoes
      .filter((t) => t.tipo === "despesa")
      .reduce((sum, t) => sum + Number(t.valor), 0),
    lucroOperacional: 0,
    lucroLiquido: 0,
    roi: 0,
    saldoCaixa: contas.reduce((sum, c) => sum + Number(c.saldo_atual || 0), 0),
    variacoes: {
      faturamento: 12.5, // Simulação - implementar cálculo real
      gastos: 7.2,
      lucroOp: 18.3,
      lucroLiq: 22.1,
    },
    margens: {
      operacional: 0,
      liquida: 0,
    },
    diasReserva: 0,
  };

  kpiData.lucroOperacional = kpiData.faturamentoBruto - kpiData.gastosOperacionais;
  kpiData.lucroLiquido = kpiData.lucroOperacional * 0.82; // Simulação de impostos
  kpiData.roi = kpiData.faturamentoBruto > 0 ? (kpiData.lucroLiquido / kpiData.faturamentoBruto) * 100 : 0;
  kpiData.margens.operacional = kpiData.faturamentoBruto > 0 ? (kpiData.lucroOperacional / kpiData.faturamentoBruto) * 100 : 0;
  kpiData.margens.liquida = kpiData.faturamentoBruto > 0 ? (kpiData.lucroLiquido / kpiData.faturamentoBruto) * 100 : 0;
  
  const mediaGastosDiarios = kpiData.gastosOperacionais / Math.max(1, differenceInDays(parseISO(filtros?.dataFim || new Date().toISOString()), parseISO(filtros?.dataInicio || new Date().toISOString())));
  kpiData.diasReserva = mediaGastosDiarios > 0 ? Math.floor(kpiData.saldoCaixa / mediaGastosDiarios) : 999;

  // Preparar dados do gráfico de fluxo de caixa
  const prepararDadosFluxo = (): FluxoCaixaData[] => {
    if (!filtros || transacoes.length === 0) return [];

    const inicio = parseISO(filtros.dataInicio);
    const fim = parseISO(filtros.dataFim);
    let intervalos: Date[] = [];

    switch (filtros.granularidade) {
      case "diario":
        intervalos = eachDayOfInterval({ start: inicio, end: fim });
        break;
      case "semanal":
        intervalos = eachWeekOfInterval({ start: inicio, end: fim });
        break;
      case "mensal":
        intervalos = eachMonthOfInterval({ start: inicio, end: fim });
        break;
      case "anual":
        intervalos = eachMonthOfInterval({ start: inicio, end: fim }).filter((_, i) => i % 12 === 0);
        break;
    }

    let saldoAcumulado = 0;

    return intervalos.map((data) => {
      let dataFim: Date;
      
      switch (filtros.granularidade) {
        case "diario":
          dataFim = data;
          break;
        case "semanal":
          dataFim = endOfWeek(data, { locale: ptBR });
          break;
        case "mensal":
          dataFim = endOfMonth(data);
          break;
        default:
          dataFim = data;
      }

      const transacoesPeriodo = transacoes.filter((t) => {
        const dataTransacao = parseISO(t.data_transacao);
        return dataTransacao >= data && dataTransacao <= dataFim;
      });

      const receitas = transacoesPeriodo
        .filter((t) => t.tipo === "receita")
        .reduce((sum, t) => sum + Number(t.valor), 0);
      
      const despesas = transacoesPeriodo
        .filter((t) => t.tipo === "despesa")
        .reduce((sum, t) => sum + Number(t.valor), 0);

      const saldo = receitas - despesas;
      saldoAcumulado += saldo;

      let label = "";
      switch (filtros.granularidade) {
        case "diario":
          label = format(data, "dd/MM", { locale: ptBR });
          break;
        case "semanal":
          label = `Sem ${format(data, "w", { locale: ptBR })}`;
          break;
        case "mensal":
          label = format(data, "MMM/yy", { locale: ptBR });
          break;
        case "anual":
          label = format(data, "yyyy", { locale: ptBR });
          break;
      }

      return {
        periodo: label,
        receitas,
        despesas,
        saldo,
        saldoAcumulado,
      };
    });
  };

  // Preparar dados de despesas por categoria
  const prepararDadosCategoria = (): CategoriaData[] => {
    const despesasPorCategoria = new Map<string, {
      categoria: string;
      valor: number;
      icone: string;
      cor: string;
    }>();

    transacoes
      .filter((t) => t.tipo === "despesa" && t.categoria)
      .forEach((t) => {
        const cat = t.categoria!;
        const existing = despesasPorCategoria.get(cat.nome) || {
          categoria: cat.nome,
          valor: 0,
          icone: cat.icone || "💸",
          cor: cat.cor || "#EF4444",
        };
        
        existing.valor += Number(t.valor);
        despesasPorCategoria.set(cat.nome, existing);
      });

    const dados = Array.from(despesasPorCategoria.values())
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8)
      .map((d) => ({
        ...d,
        percentualDespesas: (d.valor / kpiData.gastosOperacionais) * 100,
        percentualFaturamento: (d.valor / kpiData.faturamentoBruto) * 100,
        variacao: Math.random() * 30 - 10, // Simulação
      }));

    return dados;
  };

  const dadosFluxo = prepararDadosFluxo();
  const dadosCategoria = prepararDadosCategoria();

  // Dados de rentabilidade
  const dadosRentabilidade: RentabilidadeData = {
    margemBruta: kpiData.margens.operacional + 15, // Simulação
    margemOperacional: kpiData.margens.operacional,
    margemLiquida: kpiData.margens.liquida,
    pontoEquilibrio: kpiData.gastosOperacionais / 0.7, // Simulação
    faturamentoAtual: kpiData.faturamentoBruto,
  };

  // Gerar alertas inteligentes
  const gerarAlertas = (): Alerta[] => {
    const alerts: Alerta[] = [];
    
    // Alerta de fluxo de caixa negativo
    if (kpiData.diasReserva < 30) {
      alerts.push({
        id: "1",
        type: "critical",
        title: "Fluxo de caixa crítico!",
        message: `Apenas ${kpiData.diasReserva} dias de reserva. Atenção necessária para evitar problemas de liquidez.`,
        action: {
          label: "Ver Projeção",
          onClick: () => {}, // Será implementado na página
        },
      });
    }

    // Alerta de gastos elevados
    if (kpiData.margens.operacional < 20) {
      alerts.push({
        id: "2",
        type: "warning",
        title: "Margem operacional baixa",
        message: `Margem de ${kpiData.margens.operacional.toFixed(1)}% está abaixo do ideal (>30%). Revise seus custos.`,
        action: {
          label: "Ver Despesas",
          onClick: () => {}, // Será implementado na página
        },
      });
    }

    // Alerta informativo de crescimento
    if (kpiData.variacoes.faturamento > 10) {
      alerts.push({
        id: "3",
        type: "info",
        title: "Crescimento positivo!",
        message: `Faturamento cresceu ${kpiData.variacoes.faturamento.toFixed(1)}% em relação ao período anterior. Continue assim! 🎉`,
      });
    }

    return alerts;
  };

  const alertas = gerarAlertas();

  return {
    contas,
    categorias,
    transacoes,
    kpiData,
    dadosFluxo,
    dadosCategoria,
    dadosRentabilidade,
    alertas,
    isLoading,
  };
};