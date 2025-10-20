import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardFilters, FilterState } from "@/components/dashboard/DashboardFilters";
import { ExecutiveKPIs } from "@/components/dashboard/ExecutiveKPIs";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { ExpensesCategoryChart } from "@/components/dashboard/ExpensesCategoryChart";
import { ProfitabilityGauges } from "@/components/dashboard/ProfitabilityGauges";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, differenceInDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek, endOfMonth, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const NewDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState | null>(null);

  // Buscar contas
  const { data: contas = [] } = useQuery({
    queryKey: ["contas"],
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
    queryKey: ["transacoes-dashboard", filters],
    enabled: !!filters,
    queryFn: async () => {
      if (!filters) return [];
      
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
        .gte("data_transacao", filters.dataInicio)
        .lte("data_transacao", filters.dataFim)
        .eq("conciliado", true);

      if (filters.contaIds.length > 0) {
        query = query.in("conta_id", filters.contaIds);
      }

      if (filters.categoriaIds.length > 0) {
        query = query.in("categoria_id", filters.categoriaIds);
      }

      const { data, error } = await query.order("data_transacao", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Calcular KPIs
  const kpiData = {
    faturamentoBruto: transacoes
      .filter((t) => t.tipo === "receita")
      .reduce((sum, t) => sum + Number(t.valor), 0),
    gastosOperacionais: transacoes
      .filter((t) => t.tipo === "despesa")
      .reduce((sum, t) => sum + Number(t.valor), 0),
    lucroOperacional: 0,
    lucroLiquido: 0,
    roi: 0,
    saldoCaixa: contas.reduce((sum, c) => sum + Number(c.saldo_atual), 0),
    variacoes: {
      faturamento: 12.5,
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
  
  const mediaGastosDiarios = kpiData.gastosOperacionais / Math.max(1, differenceInDays(parseISO(filters?.dataFim || new Date().toISOString()), parseISO(filters?.dataInicio || new Date().toISOString())));
  kpiData.diasReserva = mediaGastosDiarios > 0 ? Math.floor(kpiData.saldoCaixa / mediaGastosDiarios) : 999;

  // Preparar dados do gráfico de fluxo de caixa
  const prepararDadosFluxo = () => {
    if (!filters || transacoes.length === 0) return [];

    const inicio = parseISO(filters.dataInicio);
    const fim = parseISO(filters.dataFim);
    let intervalos: Date[] = [];

    switch (filters.granularidade) {
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
        // Para anual, agrupar por ano
        intervalos = eachMonthOfInterval({ start: inicio, end: fim }).filter((_, i) => i % 12 === 0);
        break;
    }

    let saldoAcumulado = 0;

    return intervalos.map((data) => {
      let dataFim: Date;
      
      switch (filters.granularidade) {
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
      switch (filters.granularidade) {
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
  const prepararDadosCategoria = () => {
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
  const dadosRentabilidade = {
    margemBruta: kpiData.margens.operacional + 15, // Simulação
    margemOperacional: kpiData.margens.operacional,
    margemLiquida: kpiData.margens.liquida,
    pontoEquilibrio: kpiData.gastosOperacionais / 0.7, // Simulação
    faturamentoAtual: kpiData.faturamentoBruto,
  };

  // Gerar alertas inteligentes
  const alerts = [];
  
  // Alerta de fluxo de caixa negativo
  if (kpiData.diasReserva < 30) {
    alerts.push({
      id: "1",
      type: "critical" as const,
      title: "Fluxo de caixa crítico!",
      message: `Apenas ${kpiData.diasReserva} dias de reserva. Atenção necessária para evitar problemas de liquidez.`,
      action: {
        label: "Ver Projeção",
        onClick: () => navigate("/fluxo-caixa"),
      },
    });
  }

  // Alerta de gastos elevados
  if (kpiData.margens.operacional < 20) {
    alerts.push({
      id: "2",
      type: "warning" as const,
      title: "Margem operacional baixa",
      message: `Margem de ${kpiData.margens.operacional.toFixed(1)}% está abaixo do ideal (>30%). Revise seus custos.`,
      action: {
        label: "Ver Despesas",
        onClick: () => navigate("/transacoes"),
      },
    });
  }

  // Alerta informativo de crescimento
  if (kpiData.variacoes.faturamento > 10) {
    alerts.push({
      id: "3",
      type: "info" as const,
      title: "Crescimento positivo!",
      message: `Faturamento cresceu ${kpiData.variacoes.faturamento.toFixed(1)}% em relação ao período anterior. Continue assim! 🎉`,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Filtros */}
        <DashboardFilters
          onFiltersChange={setFilters}
          contas={contas}
          categorias={categorias}
        />

        {filters && (
          <>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
                Dashboard Executivo
              </h1>
              <p className="text-muted-foreground mt-2">
                Visão completa das finanças • {format(parseISO(filters.dataInicio), "dd 'de' MMMM", { locale: ptBR })} até {format(parseISO(filters.dataFim), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>

            {/* Layout Principal: Grid com sidebar */}
            <div className="grid lg:grid-cols-[1fr_320px] gap-6">
              {/* Coluna Principal */}
              <div className="space-y-6">
                {/* KPIs Principais */}
                <ExecutiveKPIs data={kpiData} />

                {/* Gráfico de Fluxo de Caixa */}
                <CashFlowChart data={dadosFluxo} granularidade={filters.granularidade} />

                {/* Despesas por Categoria */}
                <ExpensesCategoryChart data={dadosCategoria} totalDespesas={kpiData.gastosOperacionais} />

                {/* Indicadores de Rentabilidade */}
                <ProfitabilityGauges data={dadosRentabilidade} />

                {/* Transações Recentes */}
                <RecentTransactions 
                  transactions={transacoes as any}
                  onViewAll={() => navigate("/transacoes")}
                />
              </div>

              {/* Sidebar de Alertas */}
              <div>
                <AlertsPanel alerts={alerts} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NewDashboard;
