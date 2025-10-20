import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";

interface FluxoCaixaItem {
  id: string;
  data_referencia: string;
  data_transacao: string;
  tipo: string;
  valor: number;
  status: string;
  descricao: string;
  categoria_nome: string | null;
  centro_custo_nome: string | null;
  contraparte_nome: string | null;
  tipo_fluxo: string;
}

export default function FluxoCaixa() {
  const [dataInicio, setDataInicio] = useState(() => {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return inicio.toISOString().split("T")[0];
  });
  
  const [dataFim, setDataFim] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split("T")[0];
  });

  const [tipoFluxo, setTipoFluxo] = useState<"todos" | "previsto" | "realizado">("todos");

  const { data: fluxoCaixa, isLoading } = useQuery({
    queryKey: ["fluxo-caixa", dataInicio, dataFim],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("vw_fluxo_caixa")
        .select("*")
        .eq("user_id", user.user.id)
        .gte("data_referencia", dataInicio)
        .lte("data_referencia", dataFim)
        .order("data_referencia");

      if (error) throw error;
      return data as FluxoCaixaItem[];
    },
  });

  // Processar dados para o gráfico
  const dadosGrafico = fluxoCaixa?.reduce((acc: any[], item) => {
    const data = format(new Date(item.data_referencia), "dd/MM", { locale: ptBR });
    const existing = acc.find(d => d.data === data);

    if (existing) {
      if (item.tipo === "receita") {
        if (item.tipo_fluxo === "realizado") existing.receitasRealizadas += Number(item.valor);
        else existing.receitasPrevistas += Number(item.valor);
      } else {
        if (item.tipo_fluxo === "realizado") existing.despesasRealizadas += Number(item.valor);
        else existing.despesasPrevistas += Number(item.valor);
      }
    } else {
      acc.push({
        data,
        receitasRealizadas: item.tipo === "receita" && item.tipo_fluxo === "realizado" ? Number(item.valor) : 0,
        receitasPrevistas: item.tipo === "receita" && item.tipo_fluxo === "previsto" ? Number(item.valor) : 0,
        despesasRealizadas: item.tipo === "despesa" && item.tipo_fluxo === "realizado" ? Number(item.valor) : 0,
        despesasPrevistas: item.tipo === "despesa" && item.tipo_fluxo === "previsto" ? Number(item.valor) : 0,
      });
    }

    return acc;
  }, []) || [];

  // Calcular totais
  const totais = fluxoCaixa?.reduce((acc, item) => {
    const valor = Number(item.valor);
    if (item.tipo === "receita") {
      if (item.tipo_fluxo === "realizado") acc.receitasRealizadas += valor;
      else acc.receitasPrevistas += valor;
    } else {
      if (item.tipo_fluxo === "realizado") acc.despesasRealizadas += valor;
      else acc.despesasPrevistas += valor;
    }
    return acc;
  }, {
    receitasRealizadas: 0,
    receitasPrevistas: 0,
    despesasRealizadas: 0,
    despesasPrevistas: 0,
  }) || { receitasRealizadas: 0, receitasPrevistas: 0, despesasRealizadas: 0, despesasPrevistas: 0 };

  const saldoRealizado = totais.receitasRealizadas - totais.despesasRealizadas;
  const saldoPrevisto = totais.receitasPrevistas - totais.despesasPrevistas;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const filtrarPorTipo = (items: FluxoCaixaItem[]) => {
    if (tipoFluxo === "todos") return items;
    return items.filter(item => item.tipo_fluxo === tipoFluxo);
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fluxo de Caixa</h1>
        <p className="text-muted-foreground">Análise de entradas e saídas previstas e realizadas</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Receitas Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totais.receitasRealizadas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Receitas Previstas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success opacity-60">{formatCurrency(totais.receitasPrevistas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Despesas Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totais.despesasRealizadas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Despesas Previstas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive opacity-60">{formatCurrency(totais.despesasPrevistas)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Saldos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {saldoRealizado >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
              Saldo Realizado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${saldoRealizado >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(saldoRealizado)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {saldoPrevisto >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
              Saldo Previsto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold opacity-60 ${saldoPrevisto >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(saldoPrevisto)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução do Fluxo de Caixa</CardTitle>
          <CardDescription>Visualização de receitas e despesas ao longo do período</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="receitasRealizadas" name="Receitas Realizadas" stroke="hsl(var(--success))" strokeWidth={2} />
                <Line type="monotone" dataKey="receitasPrevistas" name="Receitas Previstas" stroke="hsl(var(--success))" strokeWidth={2} strokeDasharray="5 5" opacity={0.6} />
                <Line type="monotone" dataKey="despesasRealizadas" name="Despesas Realizadas" stroke="hsl(var(--destructive))" strokeWidth={2} />
                <Line type="monotone" dataKey="despesasPrevistas" name="Despesas Previstas" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="5 5" opacity={0.6} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Transações Detalhadas</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tipoFluxo} onValueChange={(v: any) => setTipoFluxo(v)} className="mb-4">
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="realizado">Realizado</TabsTrigger>
              <TabsTrigger value="previsto">Previsto</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <p>Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrarPorTipo(fluxoCaixa || []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{format(new Date(item.data_referencia), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell className="font-medium">{item.descricao}</TableCell>
                    <TableCell>{item.categoria_nome || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={item.tipo === "receita" ? "default" : "destructive"}>
                        {item.tipo === "receita" ? "Entrada" : "Saída"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.tipo_fluxo === "realizado" ? "default" : "outline"}>
                        {item.tipo_fluxo === "realizado" ? "Realizado" : "Previsto"}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${item.tipo === "receita" ? "text-success" : "text-destructive"}`}>
                      {formatCurrency(Number(item.valor))}
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
