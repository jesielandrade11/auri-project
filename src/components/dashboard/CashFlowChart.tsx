import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

interface CashFlowData {
  periodo: string;
  receitas: number;
  despesas: number;
  saldo: number;
  saldoAcumulado: number;
}

interface CashFlowChartProps {
  data: CashFlowData[];
  granularidade: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border rounded-lg p-4 shadow-lg">
        <p className="font-semibold mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-success"></span>
            <span className="text-muted-foreground">Receitas:</span>
            <span className="font-medium text-success">{formatCurrency(payload[0].value)}</span>
          </p>
          <p className="text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-danger"></span>
            <span className="text-muted-foreground">Despesas:</span>
            <span className="font-medium text-danger">{formatCurrency(payload[1].value)}</span>
          </p>
          <p className="text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-info"></span>
            <span className="text-muted-foreground">Saldo:</span>
            <span className="font-medium">{formatCurrency(payload[2].value)}</span>
          </p>
          <p className="text-sm flex items-center gap-2 pt-1 border-t">
            <span className="text-muted-foreground">Saldo Acumulado:</span>
            <span className="font-semibold text-info">{formatCurrency(payload[3].value)}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export const CashFlowChart = ({ data, granularidade }: CashFlowChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de Caixa - Análise Temporal</CardTitle>
        <CardDescription>
          Visualização de receitas, despesas e saldo ao longo do tempo (granularidade: {granularidade})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={500}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--danger))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--danger))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="periodo"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="circle"
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            
            <Area
              type="monotone"
              dataKey="receitas"
              name="Receitas"
              stroke="hsl(var(--success))"
              strokeWidth={3}
              fill="url(#colorReceitas)"
              dot={{ r: 4, fill: "hsl(var(--success))" }}
              activeDot={{ r: 6 }}
            />
            <Area
              type="monotone"
              dataKey="despesas"
              name="Despesas"
              stroke="hsl(var(--danger))"
              strokeWidth={3}
              fill="url(#colorDespesas)"
              dot={{ r: 4, fill: "hsl(var(--danger))" }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="saldo"
              name="Saldo do Período"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey="saldoAcumulado"
              name="Saldo Acumulado"
              stroke="hsl(var(--info))"
              strokeWidth={2.5}
              strokeDasharray="5 5"
              dot={{ r: 5, fill: "hsl(var(--info))" }}
              activeDot={{ r: 7 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
