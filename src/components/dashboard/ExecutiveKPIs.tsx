import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Wallet, DollarSign, PiggyBank, Target, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ExecutiveKPIsProps {
  data: KPIData;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
};

export const ExecutiveKPIs = ({ data }: ExecutiveKPIsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {/* Card 1: Faturamento Bruto */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="hover:shadow-md transition-shadow cursor-help">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-muted-foreground">Faturamento Bruto</p>
                  <div className="p-2 rounded-lg bg-success/10">
                    <DollarSign className="h-5 w-5 text-success" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-success">{formatCurrency(data.faturamentoBruto)}</p>
                  <div className="flex items-center gap-1 text-sm">
                    {data.variacoes.faturamento >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-danger" />
                    )}
                    <span className={cn(
                      "font-medium",
                      data.variacoes.faturamento >= 0 ? "text-success" : "text-danger"
                    )}>
                      {formatPercent(data.variacoes.faturamento)}
                    </span>
                    <span className="text-muted-foreground">vs anterior</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold mb-1">Faturamento Bruto</p>
            <p className="text-sm">Toda a receita gerada antes de descontar qualquer custo ou despesa</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Card 2: Gastos Operacionais */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="hover:shadow-md transition-shadow cursor-help bg-danger-light/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-muted-foreground">Gastos Operacionais</p>
                  <div className="p-2 rounded-lg bg-danger/10">
                    <TrendingDown className="h-5 w-5 text-danger" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-danger">{formatCurrency(data.gastosOperacionais)}</p>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {((data.gastosOperacionais / data.faturamentoBruto) * 100).toFixed(1)}% do faturamento
                    </p>
                    <div className="flex items-center gap-1 text-sm">
                      {data.variacoes.gastos >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-danger" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-success" />
                      )}
                      <span className={cn(
                        "font-medium",
                        data.variacoes.gastos >= 0 ? "text-danger" : "text-success"
                      )}>
                        {formatPercent(data.variacoes.gastos)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold mb-1">Gastos Operacionais</p>
            <p className="text-sm">Todas as despesas necessárias para manter o negócio funcionando. Mantenha abaixo de 70% do faturamento.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Card 3: Lucro Operacional */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className={cn(
              "hover:shadow-md transition-shadow cursor-help",
              data.lucroOperacional >= 0 ? "bg-success-light/30" : "bg-danger-light/30"
            )}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-muted-foreground">Lucro Operacional</p>
                  <div className={cn(
                    "p-2 rounded-lg",
                    data.lucroOperacional >= 0 ? "bg-success/10" : "bg-danger/10"
                  )}>
                    <Target className={cn(
                      "h-5 w-5",
                      data.lucroOperacional >= 0 ? "text-success" : "text-danger"
                    )} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className={cn(
                    "text-3xl font-bold",
                    data.lucroOperacional >= 0 ? "text-success" : "text-danger"
                  )}>
                    {formatCurrency(data.lucroOperacional)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Margem: {data.margens.operacional.toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold mb-1">Lucro Operacional</p>
            <p className="text-sm">Quanto sobra após pagar todas as despesas do dia a dia. Esse é o dinheiro disponível para pagar impostos e ter lucro líquido.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Card 4: Lucro Líquido */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className={cn(
              "hover:shadow-md transition-shadow cursor-help",
              data.lucroLiquido >= 0 ? "bg-success/5" : "bg-danger/5"
            )}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-muted-foreground">Lucro Líquido</p>
                  <div className={cn(
                    "p-2 rounded-lg",
                    data.lucroLiquido >= 0 ? "bg-success/10" : "bg-danger/10"
                  )}>
                    <PiggyBank className={cn(
                      "h-5 w-5",
                      data.lucroLiquido >= 0 ? "text-success" : "text-danger"
                    )} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className={cn(
                    "text-3xl font-bold",
                    data.lucroLiquido >= 0 ? "text-success" : "text-danger"
                  )}>
                    {formatCurrency(data.lucroLiquido)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Margem: {data.margens.liquida.toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold mb-1">Lucro Líquido</p>
            <p className="text-sm">O dinheiro que realmente sobrou após pagar TUDO (despesas, impostos, juros). Esse é o lucro real do negócio.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Card 5: ROI */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="hover:shadow-md transition-shadow cursor-help bg-info-light/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-muted-foreground">ROI</p>
                  <div className="p-2 rounded-lg bg-info/10">
                    <Target className="h-5 w-5 text-info" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-info">{data.roi.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">
                    R$ {(data.roi / 100).toFixed(2)} de retorno por R$ 1,00
                  </p>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold mb-1">ROI - Retorno sobre Investimento</p>
            <p className="text-sm">Mostra quanto você ganhou em relação ao que investiu. Acima de 100% significa que o investimento valeu a pena.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Card 6: Saldo em Caixa */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className={cn(
              "hover:shadow-md transition-shadow cursor-help",
              data.diasReserva >= 60 ? "bg-success-light/20" : data.diasReserva >= 30 ? "bg-warning-light/20" : "bg-danger-light/30"
            )}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-muted-foreground">Saldo em Caixa</p>
                  <div className={cn(
                    "p-2 rounded-lg",
                    data.diasReserva >= 60 ? "bg-success/10" : data.diasReserva >= 30 ? "bg-warning/10" : "bg-danger/10"
                  )}>
                    <Wallet className={cn(
                      "h-5 w-5",
                      data.diasReserva >= 60 ? "text-success" : data.diasReserva >= 30 ? "text-warning" : "text-danger"
                    )} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-bold">{formatCurrency(data.saldoCaixa)}</p>
                  <p className={cn(
                    "text-xs font-medium",
                    data.diasReserva >= 60 ? "text-success" : data.diasReserva >= 30 ? "text-warning" : "text-danger"
                  )}>
                    {data.diasReserva} dias de reserva
                  </p>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold mb-1">Saldo em Caixa</p>
            <p className="text-sm">Quanto dinheiro você tem disponível agora. Dias de reserva = quantos dias sua empresa consegue operar sem novas entradas. Ideal: manter acima de 60 dias.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
