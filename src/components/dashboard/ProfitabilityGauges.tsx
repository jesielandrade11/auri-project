import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfitabilityData {
  margemBruta: number;
  margemOperacional: number;
  margemLiquida: number;
  pontoEquilibrio: number;
  faturamentoAtual: number;
}

interface ProfitabilityGaugesProps {
  data: ProfitabilityData;
}

const getMarginColor = (value: number, thresholds: { red: number; yellow: number }) => {
  if (value >= thresholds.yellow) return "success";
  if (value >= thresholds.red) return "warning";
  return "danger";
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const ProfitabilityGauges = ({ data }: ProfitabilityGaugesProps) => {
  const margemBrutaColor = getMarginColor(data.margemBruta, { red: 30, yellow: 50 });
  const margemOperacionalColor = getMarginColor(data.margemOperacional, { red: 15, yellow: 30 });
  const margemLiquidaColor = getMarginColor(data.margemLiquida, { red: 10, yellow: 20 });
  
  const percentualAcimaEquilibrio = ((data.faturamentoAtual / data.pontoEquilibrio) * 100) - 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Indicadores de Rentabilidade e Eficiência</CardTitle>
        <CardDescription>Métricas essenciais de performance financeira</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Gauge 1: Margem Bruta */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-3 cursor-help">
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Margem Bruta</p>
                    <p className={cn(
                      "text-4xl font-bold",
                      margemBrutaColor === "success" ? "text-success" :
                      margemBrutaColor === "warning" ? "text-warning" : "text-danger"
                    )}>
                      {data.margemBruta.toFixed(1)}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Crítico</span>
                      <span>Saudável</span>
                    </div>
                    <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                      <div className="absolute inset-0 flex">
                        <div className="w-[30%] bg-danger" />
                        <div className="w-[20%] bg-warning" />
                        <div className="flex-1 bg-success" />
                      </div>
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-foreground"
                        style={{ left: `${Math.min(data.margemBruta, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span className="text-muted-foreground">Meta: 50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold mb-1">Margem Bruta</p>
                <p className="text-sm">Quanto sobra após pagar os custos diretos. Indica a eficiência operacional básica.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Gauge 2: Margem Operacional */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-3 cursor-help">
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Margem Operacional</p>
                    <p className={cn(
                      "text-4xl font-bold",
                      margemOperacionalColor === "success" ? "text-success" :
                      margemOperacionalColor === "warning" ? "text-warning" : "text-danger"
                    )}>
                      {data.margemOperacional.toFixed(1)}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Crítico</span>
                      <span>Saudável</span>
                    </div>
                    <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                      <div className="absolute inset-0 flex">
                        <div className="w-[15%] bg-danger" />
                        <div className="w-[15%] bg-warning" />
                        <div className="flex-1 bg-success" />
                      </div>
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-foreground"
                        style={{ left: `${Math.min(data.margemOperacional, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span className="text-muted-foreground">Meta: 35%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold mb-1">Margem Operacional</p>
                <p className="text-sm">Percentual do faturamento que vira lucro antes de impostos. Indica eficiência geral do negócio.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Gauge 3: Margem Líquida */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-3 cursor-help">
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Margem Líquida</p>
                    <p className={cn(
                      "text-4xl font-bold",
                      margemLiquidaColor === "success" ? "text-success" :
                      margemLiquidaColor === "warning" ? "text-warning" : "text-danger"
                    )}>
                      {data.margemLiquida.toFixed(1)}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Crítico</span>
                      <span>Saudável</span>
                    </div>
                    <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                      <div className="absolute inset-0 flex">
                        <div className="w-[10%] bg-danger" />
                        <div className="w-[10%] bg-warning" />
                        <div className="flex-1 bg-success" />
                      </div>
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-foreground"
                        style={{ left: `${Math.min(data.margemLiquida, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span className="text-muted-foreground">Meta: 25%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold mb-1">Margem Líquida</p>
                <p className="text-sm">O lucro real do negócio. Mostra quanto do faturamento sobra após pagar TUDO.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Card de Ponto de Equilíbrio */}
        <div className="border rounded-lg p-6 bg-muted/30">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 rounded-lg bg-info/10">
              <CheckCircle2 className="h-5 w-5 text-info" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">⚖️ Ponto de Equilíbrio (Break-even)</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Você precisa faturar <span className="font-semibold text-foreground">{formatCurrency(data.pontoEquilibrio)}/mês</span> para não ter prejuízo
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-semibold">{((data.faturamentoAtual / data.pontoEquilibrio) * 100).toFixed(0)}%</span>
            </div>
            <Progress
              value={Math.min((data.faturamentoAtual / data.pontoEquilibrio) * 100, 100)}
              className="h-3"
            />
            <div className="flex justify-between text-sm pt-2">
              <span className="text-muted-foreground">Faturamento atual:</span>
              <span className="font-semibold">{formatCurrency(data.faturamentoAtual)}</span>
            </div>
            {data.faturamentoAtual > data.pontoEquilibrio && (
              <div className="flex items-center gap-2 text-sm pt-1 text-success">
                <CheckCircle2 className="h-4 w-4" />
                <span>Acima do break-even: {formatCurrency(data.faturamentoAtual - data.pontoEquilibrio)} ({percentualAcimaEquilibrio.toFixed(1)}%)</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
