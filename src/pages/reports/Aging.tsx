import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AgingItem {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  tipo: string;
  status: string;
  contraparte_nome: string | null;
  contraparte_papel: string | null;
  faixa_atraso: string;
  dias_atraso: number;
}

export default function Aging() {
  const [papel, setPapel] = useState<string>("todos");

  const { data: agingDados, isLoading } = useQuery({
    queryKey: ["aging", papel],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Não autenticado");

      let query = supabase
        .from("vw_aging")
        .select("*")
        .eq("user_id", user.user.id);

      if (papel !== "todos") {
        query = query.eq("contraparte_papel", papel);
      }

      const { data, error } = await query.order("data_vencimento");
      if (error) throw error;
      return data as AgingItem[];
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getFaixaLabel = (faixa: string) => {
    const labels: Record<string, string> = {
      a_vencer: "A Vencer",
      "0_7_dias": "0-7 dias",
      "8_15_dias": "8-15 dias",
      "16_30_dias": "16-30 dias",
      "31_60_dias": "31-60 dias",
      "61_90_dias": "61-90 dias",
      acima_90_dias: "Acima de 90 dias",
    };
    return labels[faixa] || faixa;
  };

  const getFaixaVariant = (faixa: string): "default" | "secondary" | "destructive" | "outline" => {
    if (faixa === "a_vencer") return "default";
    if (faixa === "0_7_dias" || faixa === "8_15_dias") return "secondary";
    return "destructive";
  };

  // Agrupar por faixa
  const agingAgrupado = agingDados?.reduce((acc: any, item) => {
    const faixa = item.faixa_atraso;
    if (!acc[faixa]) {
      acc[faixa] = {
        faixa,
        totalReceber: 0,
        totalPagar: 0,
        quantidade: 0,
      };
    }
    const valor = Number(item.valor);
    if (item.tipo === "receita") {
      acc[faixa].totalReceber += valor;
    } else {
      acc[faixa].totalPagar += valor;
    }
    acc[faixa].quantidade += 1;
    return acc;
  }, {});

  const faixasOrdenadas = ["a_vencer", "0_7_dias", "8_15_dias", "16_30_dias", "31_60_dias", "61_90_dias", "acima_90_dias"];
  const agingArray = faixasOrdenadas
    .map((faixa) => agingAgrupado?.[faixa])
    .filter(Boolean);

  const totais = agingDados?.reduce(
    (acc, item) => {
      const valor = Number(item.valor);
      if (item.tipo === "receita") {
        acc.totalReceber += valor;
        acc.qtdReceber += 1;
      } else {
        acc.totalPagar += valor;
        acc.qtdPagar += 1;
      }
      return acc;
    },
    { totalReceber: 0, totalPagar: 0, qtdReceber: 0, qtdPagar: 0 }
  ) || { totalReceber: 0, totalPagar: 0, qtdReceber: 0, qtdPagar: 0 };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Aging (Contas a Pagar/Receber)</h1>
        <p className="text-muted-foreground">Análise de vencimentos por faixa de atraso</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="papel">Tipo</Label>
              <Select value={papel} onValueChange={setPapel}>
                <SelectTrigger id="papel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="cliente">Contas a Receber (Clientes)</SelectItem>
                  <SelectItem value="fornecedor">Contas a Pagar (Fornecedores)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totais.totalReceber)}</div>
            <p className="text-xs text-muted-foreground mt-1">{totais.qtdReceber} título(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">A Pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totais.totalPagar)}</div>
            <p className="text-xs text-muted-foreground mt-1">{totais.qtdPagar} título(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totais.totalReceber - totais.totalPagar >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(totais.totalReceber - totais.totalPagar)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Títulos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totais.qtdReceber + totais.qtdPagar}</div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo por Faixa */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo por Faixa de Atraso</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faixa</TableHead>
                  <TableHead className="text-right">A Receber</TableHead>
                  <TableHead className="text-right">A Pagar</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agingArray.map((item) => (
                  <TableRow key={item.faixa}>
                    <TableCell>
                      <Badge variant={getFaixaVariant(item.faixa)}>
                        {getFaixaLabel(item.faixa)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-success">
                      {formatCurrency(item.totalReceber)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(item.totalPagar)}
                    </TableCell>
                    <TableCell className="text-right">{item.quantidade}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detalhamento */}
      <Card>
        <CardHeader>
          <CardTitle>Títulos Detalhados</CardTitle>
          <CardDescription>Todas as contas em aberto</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Contraparte</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Faixa</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agingDados?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.dias_atraso > 0 && <AlertCircle className="h-4 w-4 text-destructive" />}
                        {format(new Date(item.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{item.descricao}</TableCell>
                    <TableCell>{item.contraparte_nome || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={item.tipo === "receita" ? "default" : "destructive"}>
                        {item.tipo === "receita" ? "Receber" : "Pagar"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getFaixaVariant(item.faixa_atraso)}>
                        {getFaixaLabel(item.faixa_atraso)}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${item.tipo === "receita" ? "text-success" : "text-destructive"}`}>
                      {formatCurrency(item.valor)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
