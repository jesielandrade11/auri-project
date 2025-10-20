import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useCostCenters } from "@/hooks/useCostCenters";
import { useAccounts } from "@/hooks/useAccounts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Pencil, Trash2, TrendingUp, TrendingDown, Filter, CheckCircle2, XCircle, DollarSign, Calendar, Receipt } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tables } from "@/integrations/supabase/types";

type Transacao = Tables<"transacoes">;
type Categoria = Tables<"categorias">;
type CentroCusto = Tables<"centros_custo">;
type ContaBancaria = Tables<"contas_bancarias">;
type DDABoleto = Tables<"dda_boletos">;

interface TransacaoComDados extends Transacao {
  categoria?: {
    nome: string;
    icone: string | null;
    cor: string | null;
  } | null;
  centro_custo?: {
    nome: string;
    codigo: string;
  } | null;
  conta?: {
    nome_banco: string;
  } | null;
}

interface DDABoletoComConta extends DDABoleto {
  conta?: {
    nome_banco: string;
  } | null;
}

interface TransacaoAVencer {
  id: string;
  tipo: 'transacao' | 'dda';
  data_vencimento: string;
  descricao: string;
  valor: number;
  categoria?: string;
  conta?: string;
  conta_id?: string;
  status: string;
  original: TransacaoComDados | DDABoletoComConta;
}

export default function Transacoes() {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Usar hooks customizados
  const { 
    transacoes, 
    transacoesAVencer, 
    ddaBoletos, 
    isLoading, 
    createTransaction, 
    updateTransaction, 
    deleteTransaction, 
    conciliarTransactions,
    isCreating,
    isUpdating,
    isDeleting,
    isConciliando
  } = useTransactions();
  
  const { categorias } = useCategories();
  const { centrosCusto } = useCostCenters();
  const { contas } = useAccounts();

  // Estados locais
  const [dialogOpen, setDialogOpen] = useState(false);
  const [baixaDialogOpen, setBaixaDialogOpen] = useState(false);
  const [controleSaldoOpen, setControleSaldoOpen] = useState(false);
  const [editando, setEditando] = useState<Transacao | null>(null);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [dataBaixa, setDataBaixa] = useState(new Date().toISOString().split("T")[0]);
  const [contaBaixa, setContaBaixa] = useState("");
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [transacaoEditada, setTransacaoEditada] = useState<Transacao | null>(null);
  const [contaConciliacao, setContaConciliacao] = useState("");
  const [dataInicialConciliacao, setDataInicialConciliacao] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [dataFinalConciliacao, setDataFinalConciliacao] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [transacoesConciliacao, setTransacoesConciliacao] = useState<TransacaoComDados[]>([]);
  const [selecionadosConciliacao, setSelecionadosConciliacao] = useState<string[]>([]);
  const [todosMarConciliacao, setTodosMarConciliacao] = useState(false);

  const [formData, setFormData] = useState({
    data_transacao: new Date().toISOString().split("T")[0],
    descricao: "",
    valor: "",
    tipo: "despesa" as "receita" | "despesa",
    categoria_id: "",
    centro_custo_id: "",
    conta_id: "",
    status: "agendado",
    observacoes: "",
  });


  const resetForm = () => {
    setFormData({
      data_transacao: new Date().toISOString().split("T")[0],
      descricao: "",
      valor: "",
      tipo: "despesa",
      categoria_id: "",
      centro_custo_id: "",
      conta_id: "",
      status: "agendado",
      observacoes: "",
    });
    setEditando(null);
  };

  const buscarTransacoesConciliacao = async () => {
    if (!contaConciliacao) {
      toast({
        title: "Selecione uma conta",
        description: "É necessário selecionar uma conta bancária",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data, error } = await supabase
        .from("transacoes")
        .select(`
          *,
          categoria:categoria_id(nome, icone, cor),
          centro_custo:centro_custo_id(nome, codigo),
          conta:conta_id(nome_banco)
        `)
        .eq("user_id", user.id)
        .eq("conta_id", contaConciliacao)
        .eq("conciliado", false)
        .in("status", ["agendado", "pendente"])
        .gte("data_transacao", dataInicialConciliacao)
        .lte("data_transacao", dataFinalConciliacao)
        .order("data_transacao", { ascending: true });
      
      if (error) throw error;
      
      setTransacoesConciliacao(data || []);
      setSelecionadosConciliacao([]);
      setTodosMarConciliacao(false);
    } catch (error: any) {
      toast({
        title: "Erro ao buscar transações",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleConciliacao = (id: string) => {
    setSelecionadosConciliacao((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleMarcarTodosConciliacao = () => {
    if (todosMarConciliacao) {
      setSelecionadosConciliacao([]);
    } else {
      setSelecionadosConciliacao(transacoesConciliacao.map((t) => t.id));
    }
    setTodosMarConciliacao(!todosMarConciliacao);
  };

  const handleConciliarSelecionados = async () => {
    if (selecionadosConciliacao.length === 0) return;
    
    conciliarTransactions({ 
      ids: selecionadosConciliacao, 
      dataConciliacao: dataFinalConciliacao 
    });
    
    buscarTransacoesConciliacao();
  };

  const handleEdit = (transacao: Transacao) => {
    if (transacao.origem === 'api' || transacao.origem === 'importacao') {
      setTransacaoEditada(transacao);
      setAlertDialogOpen(true);
    } else {
      setEditando(transacao);
      setFormData({
        data_transacao: transacao.data_transacao,
        descricao: transacao.descricao,
        valor: transacao.valor.toString(),
        tipo: transacao.tipo as "receita" | "despesa",
        categoria_id: transacao.categoria_id || "",
        centro_custo_id: transacao.centro_custo_id || "",
        conta_id: transacao.conta_id || "",
        status: transacao.status || "agendado",
        observacoes: transacao.observacoes || "",
      });
      setDialogOpen(true);
    }
  };

  const confirmarEdicao = () => {
    if (transacaoEditada) {
      setEditando(transacaoEditada);
      setFormData({
        data_transacao: transacaoEditada.data_transacao,
        descricao: transacaoEditada.descricao,
        valor: transacaoEditada.valor.toString(),
        tipo: transacaoEditada.tipo as "receita" | "despesa",
        categoria_id: transacaoEditada.categoria_id || "",
        centro_custo_id: transacaoEditada.centro_custo_id || "",
        conta_id: transacaoEditada.conta_id || "",
        status: transacaoEditada.status || "agendado",
        observacoes: transacaoEditada.observacoes || "",
      });
      setDialogOpen(true);
      setAlertDialogOpen(false);
      setTransacaoEditada(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const valor = parseFloat(formData.valor);
    if (isNaN(valor) || valor <= 0) {
      toast({
        title: "Erro",
        description: "Valor inválido",
        variant: "destructive",
      });
      return;
    }

    if (formData.status === 'pago') {
      toast({
        title: "Atenção",
        description: "Transações devem ser conciliadas antes de marcar como 'pago'. Use status 'agendado' ou realize a conciliação.",
        variant: "destructive",
      });
      return;
    }

    const dadosTransacao = {
      data_transacao: formData.data_transacao,
      descricao: formData.descricao,
      valor: valor,
      tipo: formData.tipo,
      categoria_id: formData.categoria_id || null,
      centro_custo_id: formData.centro_custo_id || null,
      conta_id: formData.conta_id || null,
      status: formData.status,
      observacoes: formData.observacoes || null,
      origem: "manual" as const,
    };

    if (editando) {
      updateTransaction({ id: editando.id, dados: dadosTransacao });
    } else {
      createTransaction(dadosTransacao);
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;
    deleteTransaction(id);
  };

  const totalReceitas = transacoes
    .filter((t) => t.tipo === "receita")
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const totalDespesas = transacoes
    .filter((t) => t.tipo === "despesa")
    .reduce((sum, t) => sum + Number(t.valor), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Transações</h1>
          <p className="text-muted-foreground">
            Gerencie suas receitas e despesas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/categorizacao")}>
            <Filter className="h-4 w-4 mr-2" />
            Categorizar
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editando ? "Editar Transação" : "Nova Transação"}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados da transação
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data">Data *</Label>
                    <Input
                      id="data"
                      type="date"
                      value={formData.data_transacao}
                      onChange={(e) =>
                        setFormData({ ...formData, data_transacao: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo *</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value: "receita" | "despesa") =>
                        setFormData({ ...formData, tipo: value, categoria_id: "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="descricao">Descrição *</Label>
                    <Input
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) =>
                        setFormData({ ...formData, descricao: e.target.value })
                      }
                      required
                      placeholder="Ex: Pagamento de fornecedor"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor (R$) *</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.valor}
                      onChange={(e) =>
                        setFormData({ ...formData, valor: e.target.value })
                      }
                      required
                      placeholder="0,00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pago" disabled>
                          Pago (usar conciliação)
                        </SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="agendado">Agendado</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Use "Agendado" para transações pagas aguardando conciliação
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria *</Label>
                    <Select
                      value={formData.categoria_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, categoria_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias
                          .filter((c) => c.tipo === formData.tipo)
                          .map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.icone} {cat.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="centro_custo">Centro de Custo</Label>
                    <Select
                      value={formData.centro_custo_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, centro_custo_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        {centrosCusto.map((centro) => (
                          <SelectItem key={centro.id} value={centro.id}>
                            {centro.codigo} - {centro.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="conta">Conta Bancária</Label>
                    <Select
                      value={formData.conta_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, conta_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        {contas.map((conta) => (
                          <SelectItem key={conta.id} value={conta.id}>
                            {conta.nome_banco}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={formData.observacoes}
                      onChange={(e) =>
                        setFormData({ ...formData, observacoes: e.target.value })
                      }
                      rows={3}
                      placeholder="Informações adicionais..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editando ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Transações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transacoes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-success">Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              R$ {totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-danger">Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">
              R$ {totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NOVA ESTRUTURA COM TABS */}
      <Tabs defaultValue="historico" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="a-vencer">A Vencer</TabsTrigger>
          <TabsTrigger value="conciliacao">🏦 Conciliação</TabsTrigger>
        </TabsList>

        {/* ABA HISTÓRICO */}
        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Histórico de Transações</CardTitle>
                  <CardDescription>
                    Últimas {transacoes.length} transações registradas
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={() => setControleSaldoOpen(true)}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Controle de Saldos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma transação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    transacoes.map((transacao) => (
                      <TableRow key={transacao.id}>
                        <TableCell>
                          {new Date(transacao.data_transacao).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{transacao.descricao}</div>
                            {transacao.observacoes && (
                              <div className="text-sm text-muted-foreground">
                                {transacao.observacoes}
                              </div>
                            )}
                            {(transacao.origem === 'api' || transacao.origem === 'importacao') && (
                              <Badge variant="outline" className="mt-1">
                                {transacao.origem === 'api' ? '🔗 API' : '📁 Importação'}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {transacao.categoria ? (
                            <div className="flex items-center gap-2">
                              <span>{transacao.categoria.icone}</span>
                              <span>{transacao.categoria.nome}</span>
                            </div>
                          ) : (
                            <Badge variant="outline">Sem categoria</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              transacao.status === "pago"
                                ? "default"
                                : transacao.status === "pendente"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {transacao.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`flex items-center justify-end gap-1 font-medium ${
                            transacao.tipo === "receita" ? "text-success" : "text-danger"
                          }`}>
                            {transacao.tipo === "receita" ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            R$ {Number(transacao.valor).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(transacao)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(transacao.id)}
                            >
                              <Trash2 className="h-4 w-4 text-danger" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA A VENCER */}
        <TabsContent value="a-vencer">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Transações a Vencer</CardTitle>
                  <CardDescription>
                    Boletos DDA e transações futuras ({transacoesAVencer.length})
                  </CardDescription>
                </div>
                {selecionados.length > 0 && (
                  <Button onClick={() => setBaixaDialogOpen(true)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Baixar Selecionados ({selecionados.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selecionados.length === transacoesAVencer.length && transacoesAVencer.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelecionados(transacoesAVencer.map(t => t.id));
                          } else {
                            setSelecionados([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoesAVencer.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma transação a vencer
                      </TableCell>
                    </TableRow>
                  ) : (
                    transacoesAVencer.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selecionados.includes(item.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelecionados([...selecionados, item.id]);
                              } else {
                                setSelecionados(selecionados.filter(id => id !== item.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(item.data_vencimento).toLocaleDateString("pt-BR")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.descricao}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.tipo === 'dda' ? 'secondary' : 'outline'}>
                            {item.tipo === 'dda' ? (
                              <div className="flex items-center gap-1">
                                <Receipt className="h-3 w-3" />
                                DDA
                              </div>
                            ) : 'Manual'}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.conta || '-'}</TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {Number(item.valor).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelecionados([item.id]);
                              setBaixaDialogOpen(true);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Baixar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA CONCILIAÇÃO */}
        <TabsContent value="conciliacao">
          <Card>
            <CardHeader>
              <CardTitle>Conciliação Bancária</CardTitle>
              <CardDescription>
                Confirme as transações que foram compensadas no banco
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label>Conta Bancária</Label>
                <Select value={contaConciliacao} onValueChange={setContaConciliacao}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {contas.map((conta) => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {conta.nome_banco} - {conta.numero_conta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Data Inicial</Label>
                  <Input 
                    type="date" 
                    value={dataInicialConciliacao}
                    onChange={(e) => setDataInicialConciliacao(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Data Final</Label>
                  <Input 
                    type="date" 
                    value={dataFinalConciliacao}
                    onChange={(e) => setDataFinalConciliacao(e.target.value)}
                  />
                </div>
              </div>
              
              <Button onClick={buscarTransacoesConciliacao} className="mb-4">
                Buscar Transações
              </Button>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={todosMarConciliacao}
                        onCheckedChange={handleMarcarTodosConciliacao}
                      />
                    </TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoesConciliacao.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Nenhuma transação pendente de conciliação
                      </TableCell>
                    </TableRow>
                  ) : (
                    transacoesConciliacao.map((transacao) => (
                      <TableRow key={transacao.id}>
                        <TableCell>
                          <Checkbox
                            checked={selecionadosConciliacao.includes(transacao.id)}
                            onCheckedChange={() => handleToggleConciliacao(transacao.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(transacao.data_transacao).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>{transacao.descricao}</TableCell>
                        <TableCell>{transacao.categoria?.nome || '-'}</TableCell>
                        <TableCell className={transacao.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}>
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(Number(transacao.valor))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={transacao.status === 'pago' ? 'default' : 'secondary'}>
                            {transacao.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setSelecionadosConciliacao([])}
                  disabled={selecionadosConciliacao.length === 0}
                >
                  Limpar Seleção
                </Button>
                <Button 
                  onClick={handleConciliarSelecionados}
                  disabled={selecionadosConciliacao.length === 0}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Conciliar {selecionadosConciliacao.length} Transação(ões)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Baixa */}
      <Dialog open={baixaDialogOpen} onOpenChange={setBaixaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Baixar Transação(ões)</DialogTitle>
            <DialogDescription>
              Informe a data de pagamento e a conta bancária
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dataBaixa">Data do Pagamento *</Label>
              <Input
                id="dataBaixa"
                type="date"
                value={dataBaixa}
                onChange={(e) => setDataBaixa(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contaBaixa">Conta Bancária *</Label>
              <Select value={contaBaixa} onValueChange={setContaBaixa}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {conta.nome_banco}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBaixaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={async () => {
              if (!dataBaixa || !contaBaixa) {
                toast({
                  title: "Erro",
                  description: "Preencha todos os campos",
                  variant: "destructive",
                });
                return;
              }

              // Usar a função de conciliação do hook
              conciliarTransactions({ 
                ids: selecionados, 
                dataConciliacao: dataBaixa 
              });

              setBaixaDialogOpen(false);
              setSelecionados([]);
              setDataBaixa("");
              setContaBaixa("");
            }}>
              Confirmar Baixa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Controle de Saldos */}
      <Dialog open={controleSaldoOpen} onOpenChange={setControleSaldoOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Controle de Saldos</DialogTitle>
            <DialogDescription>
              Comparação entre saldo do banco e saldo do sistema
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conta Bancária</TableHead>
                <TableHead className="text-right">Saldo Banco</TableHead>
                <TableHead className="text-right">Saldo Sistema</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhuma conta cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                contas.map((conta) => {
                  const saldoSistema = transacoes
                    .filter(t => t.conta_id === conta.id && t.status === 'pago')
                    .reduce((acc, t) => {
                      return acc + (t.tipo === 'receita' ? Number(t.valor) : -Number(t.valor));
                    }, Number(conta.saldo_inicial || 0));
                  
                  const saldoBanco = Number(conta.saldo_atual || 0);
                  const diferenca = saldoBanco - saldoSistema;

                  return (
                    <TableRow key={conta.id}>
                      <TableCell className="font-medium">{conta.nome_banco}</TableCell>
                      <TableCell className="text-right">
                        R$ {saldoBanco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {saldoSistema.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={diferenca === 0 ? 'text-muted-foreground' : diferenca > 0 ? 'text-success' : 'text-danger'}>
                          R$ {Math.abs(diferenca).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          {diferenca !== 0 && (diferenca > 0 ? ' ↑' : ' ↓')}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação de Edição */}
      <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atenção: Transação do Banco</AlertDialogTitle>
            <AlertDialogDescription>
              Esta transação veio de {transacaoEditada?.origem === 'api' ? 'integração bancária (API)' : 'importação de arquivo'}. 
              Editar esta transação pode prejudicar o controle de saldo, pois ela foi registrada automaticamente pelo banco.
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEdicao}>
              Sim, editar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
