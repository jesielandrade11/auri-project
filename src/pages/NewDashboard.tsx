import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DashboardFilters, FilterState } from "@/components/dashboard/DashboardFilters";
import { ExecutiveKPIs } from "@/components/dashboard/ExecutiveKPIs";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { ExpensesCategoryChart } from "@/components/dashboard/ExpensesCategoryChart";
import { ProfitabilityGauges } from "@/components/dashboard/ProfitabilityGauges";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { useDashboard } from "@/hooks/useDashboard";

const NewDashboard = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState | null>(null);

  // Usar hook customizado para dados do dashboard
  const {
    contas,
    categorias,
    transacoes,
    kpiData,
    dadosFluxo,
    dadosCategoria,
    dadosRentabilidade,
    alertas,
    isLoading
  } = useDashboard(filters || undefined);

  // Configurar ações dos alertas
  const alertasComAcoes = alertas.map(alerta => ({
    ...alerta,
    action: alerta.action ? {
      ...alerta.action,
      onClick: () => {
        if (alerta.id === "1") navigate("/fluxo-caixa");
        if (alerta.id === "2") navigate("/transacoes");
      }
    } : undefined
  }));

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
                <AlertsPanel alerts={alertasComAcoes} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NewDashboard;
