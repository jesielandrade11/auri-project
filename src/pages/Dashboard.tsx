import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, TrendingDown, AlertCircle, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface DashboardStats {
  saldoTotal: number;
  receitasMes: number;
  despesasMes: number;
  saldoMes: number;
}

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    saldoTotal: 0,
    receitasMes: 0,
    despesasMes: 0,
    saldoMes: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar saldo total das contas
      const { data: contas } = await supabase
        .from("contas_bancarias")
        .select("saldo_atual")
        .eq("user_id", user.id)
        .eq("ativo", true);

      const saldoTotal = contas?.reduce((sum, conta) => sum + Number(conta.saldo_atual), 0) || 0;

      // Buscar transações do mês atual
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      
      const { data: transacoes } = await supabase
        .from("transacoes")
        .select("*")
        .eq("user_id", user.id)
        .gte("data_transacao", primeiroDiaMes.toISOString().split("T")[0])
        .order("data_transacao", { ascending: false })
        .limit(10);

      const receitas = transacoes?.filter(t => t.tipo === "receita") || [];
      const despesas = transacoes?.filter(t => t.tipo === "despesa") || [];

      const receitasMes = receitas.reduce((sum, t) => sum + Number(t.valor), 0);
      const despesasMes = despesas.reduce((sum, t) => sum + Number(t.valor), 0);

      setStats({
        saldoTotal,
        receitasMes,
        despesasMes,
        saldoMes: receitasMes - despesasMes,
      });

      setRecentTransactions(transacoes || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Financeiro</h1>
          <p className="text-muted-foreground">
            Visão geral das suas finanças
          </p>
        </div>
        <Button onClick={() => navigate("/transacoes")}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Transação
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Saldo Total"
          value={formatCurrency(stats.saldoTotal)}
          icon={<Wallet className="h-5 w-5" />}
          variant="info"
        />
        <KPICard
          title="Receitas do Mês"
          value={formatCurrency(stats.receitasMes)}
          trend={{ value: 12, label: "vs mês anterior" }}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="success"
        />
        <KPICard
          title="Despesas do Mês"
          value={formatCurrency(stats.despesasMes)}
          trend={{ value: -5, label: "vs mês anterior" }}
          icon={<TrendingDown className="h-5 w-5" />}
          variant="danger"
        />
        <KPICard
          title="Resultado do Mês"
          value={formatCurrency(stats.saldoMes)}
          icon={<TrendingUp className="h-5 w-5" />}
          variant={stats.saldoMes >= 0 ? "success" : "danger"}
        />
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
          <CardDescription>
            Suas últimas movimentações financeiras
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma transação encontrada</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate("/transacoes")}
              >
                Adicionar primeira transação
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate("/transacoes")}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      transaction.tipo === "receita" 
                        ? "bg-success/10 text-success" 
                        : "bg-danger/10 text-danger"
                    }`}>
                      {transaction.tipo === "receita" ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : (
                        <TrendingDown className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.descricao}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(transaction.data_transacao)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      transaction.tipo === "receita" 
                        ? "text-success" 
                        : "text-danger"
                    }`}>
                      {transaction.tipo === "receita" ? "+" : "-"}
                      {formatCurrency(Math.abs(transaction.valor))}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {transaction.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
