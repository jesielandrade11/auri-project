import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths, startOfMonth, endOfMonth, isAfter, isBefore, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronRight, Eye } from "lucide-react";

type FilterType = "realizado_a_vencer" | "realizado_planejamento" | "planejamento" | "realizado";

interface MonthData {
  date: Date;
  saldoInicial: number;
  vendasOperacao: number;
  gastosOperacionais: number;
  lucroOperacional: number;
  vendasAtivos: number;
  compraAtivos: number;
  liquidoInvestimentos: number;
  creditoRecebido: number;
  amortizacao: number;
  liquidoFinanciamentos: number;
  jurosRecebidos: number;
  jurosPagos: number;
  liquidoJuros: number;
  distribuicaoLucro: number;
  entradaTransferencia: number;
  saidaTransferencia: number;
  liquidoTransferencia: number;
  recebimentosNaoOp: number;
  gastosPessoais: number;
  liquidoMovimentacao: number;
  saldoFinal: number;
}

interface ExpandedSections {
  [key: string]: boolean;
}

const FluxoCaixa = () => {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [filterType, setFilterType] = useState<FilterType>("realizado_a_vencer");
  const [monthsData, setMonthsData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<{ month: Date; field: string; items: any[] }>({ month: new Date(), field: '', items: [] });
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    operacional: true,
    investimentos: true,
    financiamentos: true,
    juros: true,
    transferencias: true,
    movimentacao: true,
  });

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const monthsToShow = 12;

  useEffect(() => {
    loadFluxoCaixa();
  }, [selectedYear, filterType]);

  const loadFluxoCaixa = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = new Date(selectedYear, 0, 1);
      const endDate = new Date(selectedYear, 11, 31);

      // Buscar transações e planejamento
      const { data: transacoes } = await supabase
        .from("transacoes")
        .select("*, categoria:categoria_id(tipo, dre_grupo)")
        .eq("user_id", user.id)
        .gte("data_transacao", startDate.toISOString())
        .lte("data_transacao", endDate.toISOString());

      const { data: budgets } = await supabase
        .from("budgets")
        .select("*, categoria:categoria_id(tipo, dre_grupo)")
        .eq("user_id", user.id)
        .gte("mes_referencia", startDate.toISOString())
        .lte("mes_referencia", endDate.toISOString());

      const { data: contas } = await supabase
        .from("contas_bancarias")
        .select("saldo_atual")
        .eq("user_id", user.id)
        .eq("ativo", true);

      const saldoInicialTotal = contas?.reduce((acc, conta) => acc + Number(conta.saldo_atual || 0), 0) || 0;

      // Processar dados por mês
      const monthsArray: MonthData[] = [];
      let saldoAcumulado = saldoInicialTotal;

      for (let i = 0; i < monthsToShow; i++) {
        const monthDate = addMonths(startDate, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const today = new Date();

        const monthData: MonthData = {
          date: monthDate,
          saldoInicial: saldoAcumulado,
          vendasOperacao: 0,
          gastosOperacionais: 0,
          lucroOperacional: 0,
          vendasAtivos: 0,
          compraAtivos: 0,
          liquidoInvestimentos: 0,
          creditoRecebido: 0,
          amortizacao: 0,
          liquidoFinanciamentos: 0,
          jurosRecebidos: 0,
          jurosPagos: 0,
          liquidoJuros: 0,
          distribuicaoLucro: 0,
          entradaTransferencia: 0,
          saidaTransferencia: 0,
          liquidoTransferencia: 0,
          recebimentosNaoOp: 0,
          gastosPessoais: 0,
          liquidoMovimentacao: 0,
          saldoFinal: 0,
        };

        const isCurrentOrPastMonth = !isAfter(monthStart, today);
        const isFutureMonth = isAfter(monthStart, today);

        // Lógica de filtros
        if (filterType === "realizado") {
          // Apenas transações pagas
          if (isCurrentOrPastMonth) {
            processTransacoes(transacoes, monthStart, monthEnd, monthData, true);
          }
        } else if (filterType === "planejamento") {
          // Apenas planejamento
          processBudgets(budgets, monthDate, monthData);
        } else if (filterType === "realizado_a_vencer") {
          // Pagas + a vencer
          if (isCurrentOrPastMonth) {
            processTransacoes(transacoes, monthStart, monthEnd, monthData, true);
          } else {
            processTransacoes(transacoes, monthStart, monthEnd, monthData, false);
          }
        } else if (filterType === "realizado_planejamento") {
          // Pagas até mês anterior + planejamento daqui pra frente
          if (isBefore(monthEnd, startOfMonth(today))) {
            processTransacoes(transacoes, monthStart, monthEnd, monthData, true);
          } else {
            processBudgets(budgets, monthDate, monthData);
          }
        }

        // Calcular totais
        monthData.lucroOperacional = monthData.vendasOperacao - monthData.gastosOperacionais;
        monthData.liquidoInvestimentos = monthData.vendasAtivos - monthData.compraAtivos;
        monthData.liquidoFinanciamentos = monthData.creditoRecebido - monthData.amortizacao;
        monthData.liquidoJuros = monthData.jurosRecebidos - monthData.jurosPagos;
        monthData.liquidoTransferencia = monthData.entradaTransferencia - monthData.saidaTransferencia;
        monthData.liquidoMovimentacao = monthData.recebimentosNaoOp - monthData.gastosPessoais;
        
        monthData.saldoFinal = monthData.saldoInicial + monthData.lucroOperacional + 
          monthData.liquidoInvestimentos + monthData.liquidoFinanciamentos + 
          monthData.liquidoJuros - monthData.distribuicaoLucro + 
          monthData.liquidoTransferencia + monthData.liquidoMovimentacao;

        saldoAcumulado = monthData.saldoFinal;
        monthsArray.push(monthData);
      }

      setMonthsData(monthsArray);
    } catch (error) {
      console.error("Erro ao carregar fluxo de caixa:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar fluxo de caixa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processTransacoes = (
    transacoes: any[] | null,
    monthStart: Date,
    monthEnd: Date,
    monthData: MonthData,
    onlyPaid: boolean
  ) => {
    if (!transacoes) return;

    transacoes.forEach((t) => {
      const transDate = new Date(t.data_transacao);
      if (transDate >= monthStart && transDate <= monthEnd) {
        if (onlyPaid && t.status !== "pago") return;

        const valor = Number(t.valor || 0);
        const categoria = t.categoria;
        const dreGrupo = categoria?.dre_grupo;
        const tipo = categoria?.tipo;

        if (tipo === "receita") {
          if (dreGrupo === "receita_bruta") {
            monthData.vendasOperacao += valor;
          } else if (dreGrupo === "financeiro") {
            monthData.jurosRecebidos += valor;
          }
        } else if (tipo === "despesa") {
          if (dreGrupo === "opex") {
            monthData.gastosOperacionais += valor;
          } else if (dreGrupo === "financeiro") {
            monthData.jurosPagos += valor;
          }
        }
      }
    });
  };

  const processBudgets = (budgets: any[] | null, monthDate: Date, monthData: MonthData) => {
    if (!budgets) return;

    budgets.forEach((b) => {
      const budgetDate = new Date(b.mes_referencia);
      if (isSameMonth(budgetDate, monthDate)) {
        const valor = Number(b.valor_planejado || 0);
        const categoria = b.categoria;
        const dreGrupo = categoria?.dre_grupo;
        const tipo = categoria?.tipo;

        if (tipo === "receita") {
          if (dreGrupo === "receita_bruta") {
            monthData.vendasOperacao += valor;
          } else if (dreGrupo === "financeiro") {
            monthData.jurosRecebidos += valor;
          }
        } else if (tipo === "despesa") {
          if (dreGrupo === "opex") {
            monthData.gastosOperacionais += valor;
          } else if (dreGrupo === "financeiro") {
            monthData.jurosPagos += valor;
          }
        }
      }
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleShowDetails = async (month: Date, field: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      let items: any[] = [];
      let title = '';

      // Buscar transações ou planejamento conforme o filtro ativo
      if (filterType === 'planejamento' || (filterType === 'realizado_planejamento' && isAfter(month, new Date()))) {
        const { data: budgets } = await supabase
          .from("budgets")
          .select("*, categoria:categoria_id(nome, tipo, dre_grupo), centro_custo:centro_custo_id(nome)")
          .eq("user_id", user.id)
          .gte("mes_referencia", monthStart.toISOString())
          .lte("mes_referencia", monthEnd.toISOString());
        
        items = budgets || [];
        title = 'Planejamentos';
      } else {
        const { data: transacoes } = await supabase
          .from("transacoes")
          .select("*, categoria:categoria_id(nome, tipo, dre_grupo), centro_custo:centro_custo_id(nome), conta:conta_bancaria_id(nome_banco)")
          .eq("user_id", user.id)
          .gte("data_transacao", monthStart.toISOString())
          .lte("data_transacao", monthEnd.toISOString());
        
        items = transacoes || [];
        title = 'Transações';
      }

      setSelectedDetails({ month, field: title, items });
      setDetailsDialogOpen(true);
    } catch (error) {
      console.error("Erro ao buscar detalhes:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes",
        variant: "destructive",
      });
    }
  };

  const renderSectionRow = (
    title: string,
    sectionKey: string,
    isTotal: boolean = false,
    getValue?: (month: MonthData) => number
  ) => {
    const isExpanded = expandedSections[sectionKey];
    const bgClass = isTotal ? "bg-primary text-primary-foreground font-semibold" : "bg-muted/50";

    return (
      <TableRow className={bgClass}>
        <TableCell className="font-medium sticky left-0 z-10 bg-inherit">
          <div className="flex items-center gap-2">
            {!isTotal && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => toggleSection(sectionKey)}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
            <span>{title}</span>
          </div>
        </TableCell>
        {monthsData.map((month, idx) => (
          <TableCell key={idx} className="text-right">
            {getValue ? formatCurrency(getValue(month)) : "-"}
          </TableCell>
        ))}
      </TableRow>
    );
  };

  const renderDetailRow = (title: string, getValue: (month: MonthData) => number, isVisible: boolean) => {
    if (!isVisible) return null;
    
    return (
      <TableRow>
        <TableCell className="pl-12 sticky left-0 z-10 bg-background">{title}</TableCell>
        {monthsData.map((month, idx) => {
          const value = getValue(month);
          return (
            <TableCell 
              key={idx} 
              className={`text-right ${value !== 0 ? 'cursor-pointer hover:bg-muted transition-colors' : ''}`}
              onClick={() => value !== 0 && handleShowDetails(month.date, title)}
            >
              <div className="flex items-center justify-end gap-2">
                {formatCurrency(value)}
                {value !== 0 && <Eye className="h-3 w-3 opacity-50" />}
              </div>
            </TableCell>
          );
        })}
      </TableRow>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fluxo de Caixa</h1>
        <p className="text-muted-foreground">
          Visualize o fluxo de caixa com diferentes visões e períodos
        </p>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Ano</label>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Visualização</label>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realizado_a_vencer">Realizado + A Vencer</SelectItem>
                <SelectItem value="realizado_planejamento">Realizado + Planejamento</SelectItem>
                <SelectItem value="planejamento">Planejamento</SelectItem>
                <SelectItem value="realizado">Realizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-20 bg-background min-w-[250px]">
                  Descrição
                </TableHead>
                {monthsData.map((month, idx) => (
                  <TableHead key={idx} className="text-right min-w-[120px]">
                    {format(month.date, "MMM/yy", { locale: ptBR })}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Saldo Inicial */}
              <TableRow className="bg-muted">
                <TableCell className="font-semibold sticky left-0 z-10 bg-muted">
                  Saldo Inicial do Mês
                </TableCell>
                {monthsData.map((month, idx) => (
                  <TableCell key={idx} className="text-right font-semibold">
                    {formatCurrency(month.saldoInicial)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Operacional */}
              {renderSectionRow("(=) Lucro Operacional", "operacional", true, (m) => m.lucroOperacional)}
              {renderDetailRow("(+) Vendas da Operação", (m) => m.vendasOperacao, expandedSections.operacional)}
              {renderDetailRow("(-) Gastos Operacionais", (m) => m.gastosOperacionais, expandedSections.operacional)}

              {/* Saldo após lucro operacional */}
              <TableRow className="bg-muted/70">
                <TableCell className="font-semibold sticky left-0 z-10 bg-muted/70">
                  Saldo após Lucro Operacional
                </TableCell>
                {monthsData.map((month, idx) => (
                  <TableCell key={idx} className="text-right font-semibold">
                    {formatCurrency(month.saldoInicial + month.lucroOperacional)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Investimentos */}
              {renderSectionRow("(=) Líquido de Investimentos", "investimentos", true, (m) => m.liquidoInvestimentos)}
              {renderDetailRow("(+) Venda de Ativos", (m) => m.vendasAtivos, expandedSections.investimentos)}
              {renderDetailRow("(-) Compra de Ativos", (m) => m.compraAtivos, expandedSections.investimentos)}

              {/* Saldo após investimentos */}
              <TableRow className="bg-muted/70">
                <TableCell className="font-semibold sticky left-0 z-10 bg-muted/70">
                  Saldo após Investimentos
                </TableCell>
                {monthsData.map((month, idx) => (
                  <TableCell key={idx} className="text-right font-semibold">
                    {formatCurrency(month.saldoInicial + month.lucroOperacional + month.liquidoInvestimentos)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Financiamentos */}
              {renderSectionRow("(=) Líquido Financiamentos", "financiamentos", true, (m) => m.liquidoFinanciamentos)}
              {renderDetailRow("(+) Crédito Recebido", (m) => m.creditoRecebido, expandedSections.financiamentos)}
              {renderDetailRow("(-) Amortização", (m) => m.amortizacao, expandedSections.financiamentos)}

              {/* Juros */}
              {renderSectionRow("(=) Líquido de Juros", "juros", true, (m) => m.liquidoJuros)}
              {renderDetailRow("(+) Juros Recebidos", (m) => m.jurosRecebidos, expandedSections.juros)}
              {renderDetailRow("(-) Juros Pagos", (m) => m.jurosPagos, expandedSections.juros)}

              {/* Distribuição */}
              <TableRow>
                <TableCell className="sticky left-0 z-10 bg-background">(-) Distribuição de Lucro</TableCell>
                {monthsData.map((month, idx) => (
                  <TableCell key={idx} className="text-right">
                    {formatCurrency(month.distribuicaoLucro)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Saldo após amortização */}
              <TableRow className="bg-muted/70">
                <TableCell className="font-semibold sticky left-0 z-10 bg-muted/70">
                  Saldo após Amortização, Juros e Dividendos
                </TableCell>
                {monthsData.map((month, idx) => (
                  <TableCell key={idx} className="text-right font-semibold">
                    {formatCurrency(
                      month.saldoInicial + month.lucroOperacional + month.liquidoInvestimentos +
                      month.liquidoFinanciamentos + month.liquidoJuros - month.distribuicaoLucro
                    )}
                  </TableCell>
                ))}
              </TableRow>

              {/* Transferências */}
              {renderSectionRow("(=) Líquido Transferência", "transferencias", true, (m) => m.liquidoTransferencia)}
              {renderDetailRow("(+) Entrada de Transferência", (m) => m.entradaTransferencia, expandedSections.transferencias)}
              {renderDetailRow("(-) Saída de Transferência", (m) => m.saidaTransferencia, expandedSections.transferencias)}

              {/* Movimentação */}
              {renderSectionRow("(=) Líquido Movimentação", "movimentacao", true, (m) => m.liquidoMovimentacao)}
              {renderDetailRow("(+) Recebimentos Não Operacionais", (m) => m.recebimentosNaoOp, expandedSections.movimentacao)}
              {renderDetailRow("(-) Gastos Pessoais", (m) => m.gastosPessoais, expandedSections.movimentacao)}

              {/* Saldo Final */}
              <TableRow className="bg-primary text-primary-foreground font-bold">
                <TableCell className="sticky left-0 z-10 bg-primary">
                  Saldo Final do Mês
                </TableCell>
                {monthsData.map((month, idx) => (
                  <TableCell key={idx} className="text-right">
                    {formatCurrency(month.saldoFinal)}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDetails.field} - {format(selectedDetails.month, "MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Centro de Custo</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedDetails.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                selectedDetails.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {item.data_transacao 
                        ? format(new Date(item.data_transacao), "dd/MM/yyyy")
                        : item.mes_referencia
                        ? format(new Date(item.mes_referencia), "MM/yyyy")
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      {item.descricao || item.observacoes || "-"}
                    </TableCell>
                    <TableCell>
                      {item.categoria?.nome || "-"}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({item.categoria?.tipo})
                      </span>
                    </TableCell>
                    <TableCell>{item.centro_custo?.nome || "-"}</TableCell>
                    <TableCell>{item.conta?.nome_banco || "-"}</TableCell>
                    <TableCell className={`text-right ${item.categoria?.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(item.valor || item.valor_planejado || 0)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FluxoCaixa;
