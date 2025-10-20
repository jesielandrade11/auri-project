import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CategoryData {
  categoria: string;
  valor: number;
  percentualDespesas: number;
  percentualFaturamento: number;
  variacao: number;
  cor: string;
  icone: string;
}

interface ExpensesCategoryChartProps {
  data: CategoryData[];
  totalDespesas: number;
}

const COLORS = [
  "hsl(271 91% 65%)", // roxo
  "hsl(32 95% 44%)", // laranja
  "hsl(262 83% 58%)", // indigo
  "hsl(330 81% 60%)", // pink
  "hsl(173 58% 39%)", // teal
  "hsl(221 83% 53%)", // azul
  "hsl(142 76% 36%)", // verde
  "hsl(0 84% 60%)", // vermelho
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border rounded-lg p-4 shadow-lg">
        <p className="font-semibold mb-2">
          {data.icone} {data.categoria}
        </p>
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Valor:</span>{" "}
            <span className="font-medium">{formatCurrency(data.valor)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">% das despesas:</span>{" "}
            <span className="font-medium">{data.percentualDespesas.toFixed(1)}%</span>
          </p>
          <p>
            <span className="text-muted-foreground">% do faturamento:</span>{" "}
            <span className="font-medium">{data.percentualFaturamento.toFixed(1)}%</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export const ExpensesCategoryChart = ({ data, totalDespesas }: ExpensesCategoryChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Principais Gastos por Categoria</CardTitle>
        <CardDescription>Análise detalhada das despesas operacionais</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-[1.5fr,2fr] gap-6">
          {/* Gráfico de Rosca */}
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="valor"
                  label={({ percentualDespesas }) => `${percentualDespesas.toFixed(0)}%`}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center mt-4">
              <p className="text-2xl font-bold">{formatCurrency(totalDespesas)}</p>
              <p className="text-sm text-muted-foreground">Total de Gastos</p>
            </div>
          </div>

          {/* Tabela Detalhada */}
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">% Desp</TableHead>
                  <TableHead className="text-center">% Fat</TableHead>
                  <TableHead className="text-center">Variação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item, index) => (
                  <TableRow
                    key={item.categoria}
                    className={item.percentualDespesas > 30 ? "bg-danger-light/20" : ""}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span>{item.icone}</span>
                        <span>{item.categoria}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.valor)}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.percentualDespesas.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center">
                      {item.percentualFaturamento.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {item.variacao > 0 ? (
                          <TrendingUp className="h-4 w-4 text-danger" />
                        ) : item.variacao < 0 ? (
                          <TrendingDown className="h-4 w-4 text-success" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span
                          className={
                            item.variacao > 0
                              ? "text-danger"
                              : item.variacao < 0
                              ? "text-success"
                              : "text-muted-foreground"
                          }
                        >
                          {item.variacao > 0 ? "+" : ""}
                          {item.variacao.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold bg-muted/50">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalDespesas)}</TableCell>
                  <TableCell className="text-center">100%</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
