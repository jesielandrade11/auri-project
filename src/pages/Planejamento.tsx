import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Budget {
  id: string;
  user_id: string;
  mes_referencia: string;
  valor_planejado: number;
  valor_realizado: number;
  percentual_utilizado: number | null;
  categoria_id: string | null;
  centro_custo_id: string | null;
  observacoes: string | null;
  created_at: string;
  categoria?: {
    id: string;
    nome: string;
    tipo: string;
  };
  centro_custo?: {
    id: string;
    nome: string;
  };
}

export default function Planejamento() {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedMonthDetails, setSelectedMonthDetails] = useState<{ month: number; type: 'receitas' | 'despesas' | 'saldo'; budgets: Budget[] }>({ month: 0, type: 'receitas', budgets: [] });
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    mes_referencia: "",
    categoria_id: "",
    centro_custo_id: "",
    valor_planejado: "",
    observacoes: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categorias } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: centros } = useQuery({
    queryKey: ["centros-custo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centros_custo")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: budgets, isLoading } = useQuery({
    queryKey: ["budgets", anoFiltro],
    queryFn: async () => {
      const startDate = `${anoFiltro}-01-01`;
      const endDate = `${anoFiltro}-12-31`;
      
      const { data, error } = await supabase
        .from("budgets")
        .select(`
          *,
          categoria:categorias(id, nome, tipo),
          centro_custo:centros_custo(id, nome)
        `)
        .gte("mes_referencia", startDate)
        .lte("mes_referencia", endDate)
        .order("mes_referencia", { ascending: true });
      
      if (error) throw error;
      return data as Budget[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Não autenticado");

      const { error } = await supabase.from("budgets").insert({
        user_id: user.user.id,
        mes_referencia: data.mes_referencia,
        categoria_id: data.categoria_id || null,
        centro_custo_id: data.centro_custo_id || null,
        valor_planejado: parseFloat(data.valor_planejado),
        observacoes: data.observacoes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast({ title: "Planejamento criado com sucesso!" });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Erro ao criar planejamento", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast({ title: "Planejamento excluído com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir planejamento", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      mes_referencia: "",
      categoria_id: "",
      centro_custo_id: "",
      valor_planejado: "",
      observacoes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getBudgetsByMonth = () => {
    const budgetsByMonth: { [key: number]: Budget[] } = {};
    for (let i = 1; i <= 12; i++) {
      budgetsByMonth[i] = budgets?.filter((b) => {
        const mes = new Date(b.mes_referencia).getMonth() + 1;
        return mes === i;
      }) || [];
    }
    return budgetsByMonth;
  };

  const budgetsByMonth = getBudgetsByMonth();

  const handleOpenDetails = (monthIndex: number, type: 'receitas' | 'despesas' | 'saldo') => {
    const budgetsMes = budgetsByMonth[monthIndex + 1];
    const filteredBudgets = type === 'saldo' 
      ? budgetsMes 
      : budgetsMes.filter((b) => b.categoria?.tipo === type.slice(0, -1)); // Remove 's' from 'receitas'/'despesas'
    
    setSelectedMonthDetails({
      month: monthIndex + 1,
      type,
      budgets: filteredBudgets
    });
    setDetailsDialogOpen(true);
  };

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Planejamento Financeiro</h1>
          <p className="text-muted-foreground">Planeje receitas e despesas por categoria e mês</p>
        </div>
        <div className="flex gap-2">
          <Select value={anoFiltro.toString()} onValueChange={(v) => setAnoFiltro(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025, 2026].map((ano) => (
                <SelectItem key={ano} value={ano.toString()}>
                  {ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Trash2 className="mr-2 h-4 w-4" />
                Gerenciar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Gerenciar Planejamentos</DialogTitle>
              </DialogHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Centro de Custo</TableHead>
                    <TableHead>Valor Planejado</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets?.map((budget) => (
                    <TableRow key={budget.id}>
                      <TableCell>
                        {new Date(budget.mes_referencia).toLocaleDateString("pt-BR", {
                          month: "long",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>{budget.categoria?.nome || "-"}</TableCell>
                      <TableCell>{budget.centro_custo?.nome || "-"}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(budget.valor_planejado)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir este planejamento?")) {
                              deleteMutation.mutate(budget.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Planejamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Planejamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mes">Mês de Referência*</Label>
                  <Input
                    id="mes"
                    type="date"
                    value={formData.mes_referencia}
                    onChange={(e) => setFormData({ ...formData, mes_referencia: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select
                    value={formData.categoria_id}
                    onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
                  >
                    <SelectTrigger id="categoria">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nome} ({cat.tipo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="centro">Centro de Custo</Label>
                  <Select
                    value={formData.centro_custo_id}
                    onValueChange={(value) => setFormData({ ...formData, centro_custo_id: value })}
                  >
                    <SelectTrigger id="centro">
                      <SelectValue placeholder="Selecione um centro de custo" />
                    </SelectTrigger>
                    <SelectContent>
                      {centros?.map((centro) => (
                        <SelectItem key={centro.id} value={centro.id}>
                          {centro.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor">Valor Planejado*</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    value={formData.valor_planejado}
                    onChange={(e) => setFormData({ ...formData, valor_planejado: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="obs">Observações</Label>
                  <Textarea
                    id="obs"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    Criar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visão Anual do Planejamento - {anoFiltro}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background">Mês</TableHead>
                    <TableHead>Receitas Planejadas</TableHead>
                    <TableHead>Despesas Planejadas</TableHead>
                    <TableHead>Saldo Previsto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meses.map((mes, index) => {
                    const budgetsMes = budgetsByMonth[index + 1];
                    const receitas = budgetsMes
                      .filter((b) => b.categoria?.tipo === "receita")
                      .reduce((acc, b) => acc + b.valor_planejado, 0);
                    const despesas = budgetsMes
                      .filter((b) => b.categoria?.tipo === "despesa")
                      .reduce((acc, b) => acc + b.valor_planejado, 0);
                    const saldo = receitas - despesas;

                    return (
                      <TableRow key={index}>
                        <TableCell className="sticky left-0 bg-background font-medium">{mes}</TableCell>
                        <TableCell 
                          className="text-green-600 cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => handleOpenDetails(index, 'receitas')}
                        >
                          <div className="flex items-center justify-between">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(receitas)}
                            <Eye className="h-4 w-4 opacity-50" />
                          </div>
                        </TableCell>
                        <TableCell 
                          className="text-red-600 cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => handleOpenDetails(index, 'despesas')}
                        >
                          <div className="flex items-center justify-between">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(despesas)}
                            <Eye className="h-4 w-4 opacity-50" />
                          </div>
                        </TableCell>
                        <TableCell 
                          className={`${saldo >= 0 ? "text-green-600" : "text-red-600"} cursor-pointer hover:bg-muted transition-colors`}
                          onClick={() => handleOpenDetails(index, 'saldo')}
                        >
                          <div className="flex items-center justify-between">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(saldo)}
                            <Eye className="h-4 w-4 opacity-50" />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes - {meses[selectedMonthDetails.month - 1]} ({selectedMonthDetails.type === 'receitas' ? 'Receitas' : selectedMonthDetails.type === 'despesas' ? 'Despesas' : 'Todas'})
            </DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Centro de Custo</TableHead>
                <TableHead>Valor Planejado</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedMonthDetails.budgets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum planejamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                selectedMonthDetails.budgets.map((budget) => (
                  <TableRow key={budget.id}>
                    <TableCell>
                      {budget.categoria?.nome || "-"}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({budget.categoria?.tipo})
                      </span>
                    </TableCell>
                    <TableCell>{budget.centro_custo?.nome || "-"}</TableCell>
                    <TableCell className={budget.categoria?.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}>
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(budget.valor_planejado)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {budget.observacoes || "-"}
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
}
