import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, Eye, Edit } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Transaction {
  id: string;
  data_transacao: string;
  descricao: string;
  tipo: "receita" | "despesa";
  valor: number;
  categoria?: {
    nome: string;
    icone?: string;
    cor?: string;
  };
  status?: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  onViewAll?: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const RecentTransactions = ({ transactions, onViewAll }: RecentTransactionsProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">Transações Recentes</CardTitle>
        {onViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll} className="text-primary">
            Ver todas <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
            <div className="col-span-2">DATA</div>
            <div className="col-span-4">DESCRIÇÃO</div>
            <div className="col-span-2">CATEGORIA</div>
            <div className="col-span-1 text-center">TIPO</div>
            <div className="col-span-2 text-right">VALOR</div>
            <div className="col-span-1"></div>
          </div>

          {/* Transactions */}
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Nenhuma transação encontrada</p>
            </div>
          ) : (
            transactions.slice(0, 8).map((transaction) => (
              <div
                key={transaction.id}
                className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-accent/50 rounded-lg transition-colors group items-center"
              >
                {/* Data */}
                <div className="col-span-2 text-sm">
                  {format(new Date(transaction.data_transacao), "dd/MM/yyyy", { locale: ptBR })}
                </div>

                {/* Descrição */}
                <div className="col-span-4">
                  <p className="text-sm font-medium truncate">{transaction.descricao}</p>
                </div>

                {/* Categoria */}
                <div className="col-span-2">
                  {transaction.categoria && (
                    <Badge variant="outline" className="text-xs font-normal">
                      {transaction.categoria.icone && (
                        <span className="mr-1">{transaction.categoria.icone}</span>
                      )}
                      {transaction.categoria.nome}
                    </Badge>
                  )}
                </div>

                {/* Tipo */}
                <div className="col-span-1 flex justify-center">
                  <Badge
                    variant={transaction.tipo === "receita" ? "default" : "destructive"}
                    className={`text-xs ${
                      transaction.tipo === "receita"
                        ? "bg-success/10 text-success hover:bg-success/20"
                        : "bg-danger/10 text-danger hover:bg-danger/20"
                    }`}
                  >
                    {transaction.tipo === "receita" ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                  </Badge>
                </div>

                {/* Valor */}
                <div className="col-span-2 text-right">
                  <p
                    className={`text-sm font-semibold ${
                      transaction.tipo === "receita" ? "text-success" : "text-danger"
                    }`}
                  >
                    {transaction.tipo === "receita" ? "+" : "-"}
                    {formatCurrency(Math.abs(transaction.valor))}
                  </p>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer totals */}
        {transactions.length > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
            <div className="flex gap-6">
              <div>
                <span className="text-muted-foreground">Entradas: </span>
                <span className="font-semibold text-success">
                  {formatCurrency(
                    transactions
                      .filter((t) => t.tipo === "receita")
                      .reduce((sum, t) => sum + t.valor, 0)
                  )}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Saídas: </span>
                <span className="font-semibold text-danger">
                  {formatCurrency(
                    transactions
                      .filter((t) => t.tipo === "despesa")
                      .reduce((sum, t) => sum + t.valor, 0)
                  )}
                </span>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Saldo: </span>
              <span className="font-bold">
                {formatCurrency(
                  transactions
                    .filter((t) => t.tipo === "receita")
                    .reduce((sum, t) => sum + t.valor, 0) -
                    transactions
                      .filter((t) => t.tipo === "despesa")
                      .reduce((sum, t) => sum + t.valor, 0)
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
