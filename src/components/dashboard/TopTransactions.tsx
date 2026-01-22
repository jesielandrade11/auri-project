import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Receipt } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  descricao: string;
  valor: number;
  tipo: string;
  data_transacao: string;
  categoria?: {
    nome: string;
    icone: string;
    cor: string;
  } | null;
}

interface TopTransactionsProps {
  receitas: Transaction[];
  despesas: Transaction[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const TransactionItem = ({ transaction, isRevenue }: { transaction: Transaction; isRevenue: boolean }) => (
  <div className="flex items-center justify-between py-3 border-b last:border-0">
    <div className="flex items-center gap-3">
      <div className={cn(
        "p-2 rounded-lg",
        isRevenue ? "bg-success/10" : "bg-danger/10"
      )}>
        {isRevenue ? (
          <ArrowUpRight className="h-4 w-4 text-success" />
        ) : (
          <ArrowDownRight className="h-4 w-4 text-danger" />
        )}
      </div>
      <div>
        <p className="font-medium text-sm truncate max-w-[180px]">
          {transaction.descricao}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{format(parseISO(transaction.data_transacao), "dd/MM/yy", { locale: ptBR })}</span>
          {transaction.categoria && (
            <>
              <span>•</span>
              <span>{transaction.categoria.icone} {transaction.categoria.nome}</span>
            </>
          )}
        </div>
      </div>
    </div>
    <p className={cn(
      "font-semibold tabular-nums",
      isRevenue ? "text-success" : "text-danger"
    )}>
      {isRevenue ? "+" : "-"}{formatCurrency(transaction.valor)}
    </p>
  </div>
);

export const TopTransactions = ({ receitas, despesas }: TopTransactionsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Maiores Movimentações
        </CardTitle>
        <CardDescription>Top 5 receitas e despesas do período</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Receitas */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                Maiores Receitas
              </Badge>
            </div>
            <div className="space-y-0">
              {receitas.length > 0 ? (
                receitas.map((t) => (
                  <TransactionItem key={t.id} transaction={t} isRevenue={true} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma receita no período
                </p>
              )}
            </div>
          </div>

          {/* Top Despesas */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="bg-danger/10 text-danger border-danger/20">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                Maiores Despesas
              </Badge>
            </div>
            <div className="space-y-0">
              {despesas.length > 0 ? (
                despesas.map((t) => (
                  <TransactionItem key={t.id} transaction={t} isRevenue={false} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma despesa no período
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
