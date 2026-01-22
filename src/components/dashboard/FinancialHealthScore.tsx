import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Heart, TrendingUp, Wallet, PiggyBank, ShieldCheck, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthMetric {
  name: string;
  score: number; // 0-100
  status: "good" | "warning" | "critical";
  description: string;
  icon: React.ReactNode;
}

interface FinancialHealthScoreProps {
  margemOperacional: number;
  diasReserva: number;
  percentualDespesas: number;
  tendenciaReceitas: number;
}

const getOverallScore = (metrics: HealthMetric[]) => {
  return Math.round(metrics.reduce((acc, m) => acc + m.score, 0) / metrics.length);
};

const getScoreColor = (score: number) => {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-danger";
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return { label: "Excelente", color: "bg-success" };
  if (score >= 60) return { label: "Bom", color: "bg-success/70" };
  if (score >= 40) return { label: "Regular", color: "bg-warning" };
  if (score >= 20) return { label: "Atenção", color: "bg-warning/70" };
  return { label: "Crítico", color: "bg-danger" };
};

const StatusIcon = ({ status }: { status: "good" | "warning" | "critical" }) => {
  if (status === "good") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-warning" />;
  return <XCircle className="h-4 w-4 text-danger" />;
};

export const FinancialHealthScore = ({
  margemOperacional,
  diasReserva,
  percentualDespesas,
  tendenciaReceitas,
}: FinancialHealthScoreProps) => {
  const metrics: HealthMetric[] = [
    {
      name: "Margem Operacional",
      score: Math.min(100, Math.max(0, margemOperacional * 2.5)),
      status: margemOperacional >= 30 ? "good" : margemOperacional >= 15 ? "warning" : "critical",
      description: `${margemOperacional.toFixed(1)}% - ${margemOperacional >= 30 ? "Saudável" : margemOperacional >= 15 ? "Aceitável" : "Muito baixa"}`,
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      name: "Reserva de Caixa",
      score: Math.min(100, (diasReserva / 90) * 100),
      status: diasReserva >= 60 ? "good" : diasReserva >= 30 ? "warning" : "critical",
      description: `${diasReserva} dias - ${diasReserva >= 60 ? "Ideal" : diasReserva >= 30 ? "Mínimo" : "Insuficiente"}`,
      icon: <Wallet className="h-4 w-4" />,
    },
    {
      name: "Controle de Gastos",
      score: Math.min(100, Math.max(0, (100 - percentualDespesas) * 1.5)),
      status: percentualDespesas <= 70 ? "good" : percentualDespesas <= 85 ? "warning" : "critical",
      description: `${percentualDespesas.toFixed(1)}% do faturamento - ${percentualDespesas <= 70 ? "Controlado" : percentualDespesas <= 85 ? "Elevado" : "Crítico"}`,
      icon: <PiggyBank className="h-4 w-4" />,
    },
    {
      name: "Tendência de Crescimento",
      score: Math.min(100, Math.max(0, 50 + tendenciaReceitas * 2)),
      status: tendenciaReceitas >= 5 ? "good" : tendenciaReceitas >= 0 ? "warning" : "critical",
      description: `${tendenciaReceitas >= 0 ? "+" : ""}${tendenciaReceitas.toFixed(1)}% - ${tendenciaReceitas >= 5 ? "Crescendo" : tendenciaReceitas >= 0 ? "Estável" : "Em queda"}`,
      icon: <TrendingUp className="h-4 w-4" />,
    },
  ];

  const overallScore = getOverallScore(metrics);
  const scoreInfo = getScoreLabel(overallScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          Saúde Financeira
        </CardTitle>
        <CardDescription>Diagnóstico completo da situação financeira</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Score Principal */}
          <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-xl min-w-[180px]">
            <div className="relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke={overallScore >= 70 ? "hsl(var(--success))" : overallScore >= 40 ? "hsl(var(--warning))" : "hsl(var(--danger))"}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(overallScore / 100) * 352} 352`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("text-4xl font-bold", getScoreColor(overallScore))}>
                  {overallScore}
                </span>
                <span className="text-xs text-muted-foreground">de 100</span>
              </div>
            </div>
            <Badge className={cn("mt-4", scoreInfo.color)}>
              {scoreInfo.label}
            </Badge>
          </div>

          {/* Métricas Detalhadas */}
          <div className="flex-1 space-y-4">
            {metrics.map((metric) => (
              <TooltipProvider key={metric.name}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-2 cursor-help">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "p-1.5 rounded-md",
                            metric.status === "good" ? "bg-success/10 text-success" :
                            metric.status === "warning" ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"
                          )}>
                            {metric.icon}
                          </div>
                          <span className="font-medium text-sm">{metric.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{metric.score.toFixed(0)}%</span>
                          <StatusIcon status={metric.status} />
                        </div>
                      </div>
                      <Progress 
                        value={metric.score} 
                        className={cn(
                          "h-2",
                          metric.status === "good" ? "[&>div]:bg-success" :
                          metric.status === "warning" ? "[&>div]:bg-warning" : "[&>div]:bg-danger"
                        )}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">{metric.name}</p>
                    <p className="text-sm">{metric.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
