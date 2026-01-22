import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";

interface ComparisonData {
  periodo: string;
  receitas: number;
  despesas: number;
}

interface RevenueExpenseComparisonProps {
  data: ComparisonData[];
  totalReceitas: number;
  totalDespesas: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCompact = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const receitas = payload.find((p: any) => p.dataKey === "receitas")?.value || 0;
    const despesas = payload.find((p: any) => p.dataKey === "despesas")?.value || 0;
    const saldo = receitas - despesas;
    
    return (
      <div className="bg-card border rounded-lg p-4 shadow-lg">
        <p className="font-semibold mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-success"></span>
            <span className="text-muted-foreground">Receitas:</span>
            <span className="font-medium text-success">{formatCurrency(receitas)}</span>
          </p>
          <p className="text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-danger"></span>
            <span className="text-muted-foreground">Despesas:</span>
            <span className="font-medium text-danger">{formatCurrency(despesas)}</span>
          </p>
          <div className="border-t pt-1 mt-1">
            <p className="text-sm flex items-center gap-2">
              <span className="text-muted-foreground">Resultado:</span>
              <span className={`font-semibold ${saldo >= 0 ? "text-success" : "text-danger"}`}>
                {formatCurrency(saldo)}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const RevenueExpenseComparison = ({ data, totalReceitas, totalDespesas }: RevenueExpenseComparisonProps) => {
  const saldo = totalReceitas - totalDespesas;
  const percentualDespesas = totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Comparativo Receitas vs Despesas
            </CardTitle>
            <CardDescription>Análise mensal do balanço financeiro</CardDescription>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Receitas</p>
              <p className="text-lg font-bold text-success flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4" />
                {formatCompact(totalReceitas)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Despesas</p>
              <p className="text-lg font-bold text-danger flex items-center gap-1">
                <ArrowDownRight className="h-4 w-4" />
                {formatCompact(totalDespesas)}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6 mb-4">
          <div className="flex-1 p-4 rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground mb-1">Resultado do Período</p>
            <p className={`text-2xl font-bold ${saldo >= 0 ? "text-success" : "text-danger"}`}>
              {formatCurrency(saldo)}
            </p>
          </div>
          <div className="flex-1 p-4 rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground mb-1">Despesas / Receitas</p>
            <p className={`text-2xl font-bold ${percentualDespesas <= 70 ? "text-success" : percentualDespesas <= 85 ? "text-warning" : "text-danger"}`}>
              {percentualDespesas.toFixed(1)}%
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="periodo" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatCompact(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: "10px" }}
              iconType="circle"
            />
            <Bar 
              dataKey="receitas" 
              name="Receitas"
              fill="hsl(var(--success))" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="despesas" 
              name="Despesas"
              fill="hsl(var(--danger))" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
