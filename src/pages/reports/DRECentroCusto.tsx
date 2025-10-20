import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DREItem {
  centro_custo_id: string;
  centro_custo_codigo: string;
  centro_custo_nome: string;
  categoria_tipo: string;
  dre_grupo: string | null;
  mes_competencia: string;
  receitas: number;
  despesas: number;
  resultado: number;
}

interface CentroCusto {
  id: string;
  codigo: string;
  nome: string;
}

export default function DRECentroCusto() {
  const [mesReferencia, setMesReferencia] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  });

  const [centroCustoSelecionado, setCentroCustoSelecionado] = useState<string>("todos");

  const { data: centrosCusto } = useQuery({
    queryKey: ["centros-custo-select"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("centros_custo")
        .select("id, codigo, nome")
        .eq("user_id", user.user.id)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as CentroCusto[];
    },
  });

  const { data: dreDados, isLoading } = useQuery({
    queryKey: ["dre-centro-custo", mesReferencia, centroCustoSelecionado],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Não autenticado");

      const [ano, mes] = mesReferencia.split("-");
      const dataInicio = `${ano}-${mes}-01`;
      const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
      const dataFim = `${ano}-${mes}-${ultimoDia}`;

      let query = supabase
        .from("vw_dre_centro_custo")
        .select("*")
        .eq("user_id", user.user.id)
        .gte("mes_competencia", dataInicio)
        .lte("mes_competencia", dataFim);

      if (centroCustoSelecionado !== "todos") {
        query = query.eq("centro_custo_id", centroCustoSelecionado);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DREItem[];
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Agrupar por centro de custo
  const dreAgrupado = dreDados?.reduce((acc: any, item) => {
    const key = item.centro_custo_id;
    if (!acc[key]) {
      acc[key] = {
        centro_custo_codigo: item.centro_custo_codigo,
        centro_custo_nome: item.centro_custo_nome,
        receitas: 0,
        despesas: 0,
        resultado: 0,
      };
    }
    acc[key].receitas += Number(item.receitas);
    acc[key].despesas += Number(item.despesas);
    acc[key].resultado += Number(item.resultado);
    return acc;
  }, {});

  const dreArray = Object.values(dreAgrupado || {}) as any[];

  const totais = dreArray.reduce(
    (acc, item) => ({
      receitas: acc.receitas + item.receitas,
      despesas: acc.despesas + item.despesas,
      resultado: acc.resultado + item.resultado,
    }),
    { receitas: 0, despesas: 0, resultado: 0 }
  );

  const margemLiquida = totais.receitas > 0 ? (totais.resultado / totais.receitas) * 100 : 0;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">DRE por Centro de Custo</h1>
        <p className="text-muted-foreground">Demonstração de Resultado do Exercício por área</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mesReferencia">Mês de Referência</Label>
              <Input
                id="mesReferencia"
                type="month"
                value={mesReferencia}
                onChange={(e) => setMesReferencia(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="centroCusto">Centro de Custo</Label>
              <Select value={centroCustoSelecionado} onValueChange={setCentroCustoSelecionado}>
                <SelectTrigger id="centroCusto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {centrosCusto?.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.codigo} - {cc.nome}
                    </SelectItem>
                  ))}
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
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totais.receitas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totais.despesas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totais.resultado >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(totais.resultado)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Margem Líquida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${margemLiquida >= 0 ? 'text-success' : 'text-destructive'}`}>
              {margemLiquida.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DRE Detalhado */}
      <Card>
        <CardHeader>
          <CardTitle>Demonstração de Resultado</CardTitle>
          <CardDescription>
            Análise detalhada de receitas, despesas e resultado por centro de custo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Centro de Custo</TableHead>
                  <TableHead className="text-right">Receitas (+)</TableHead>
                  <TableHead className="text-right">Despesas (-)</TableHead>
                  <TableHead className="text-right">Resultado (=)</TableHead>
                  <TableHead className="text-right">Margem %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dreArray.map((item, index) => {
                  const margem = item.receitas > 0 ? (item.resultado / item.receitas) * 100 : 0;
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {item.centro_custo_codigo} - {item.centro_custo_nome}
                      </TableCell>
                      <TableCell className="text-right text-success">
                        {formatCurrency(item.receitas)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatCurrency(item.despesas)}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${item.resultado >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(item.resultado)}
                      </TableCell>
                      <TableCell className={`text-right ${margem >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {margem.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
                {dreArray.length > 1 && (
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right text-success">
                      {formatCurrency(totais.receitas)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(totais.despesas)}
                    </TableCell>
                    <TableCell className={`text-right ${totais.resultado >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(totais.resultado)}
                    </TableCell>
                    <TableCell className={`text-right ${margemLiquida >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {margemLiquida.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
