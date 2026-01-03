import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Filter,
  CheckCircle2,
  Search,
  Upload,
  User,
  X,
  XCircle,
  DollarSign,
  Calendar,
  Receipt,
  Check,
  ChevronsUpDown
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tables } from "@/integrations/supabase/types";
import BaixaDialog from "@/components/transactions/BaixaDialog";
import { DuplicateTransactionsPanel } from "@/components/transactions/DuplicateTransactionsPanel";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Transacao = Tables<"transacoes">;
type Categoria = Tables<"categorias">;
type CentroCusto = Tables<"centros_custo">;
type ContaBancaria = Tables<"contas_bancarias">;
type DDABoleto = Tables<"dda_boletos">;
type Contraparte = Tables<"contrapartes">;

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
  contraparte?: {
    nome: string;
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
  conta_bancaria_id?: string;
  status: string;
  original: TransacaoComDados | DDABoletoComConta;
}

export default function Transacoes() {
  const [loading, setLoading] = useState(true);
  const [transacoes, setTransacoes] = useState<TransacaoComDados[]>([]);
  const [transacoesAVencer, setTransacoesAVencer] = useState<TransacaoAVencer[]>([]);
  const [ddaBoletos, setDDABoletos] = useState<DDABoletoComConta[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [listaContrapartes, setListaContrapartes] = useState<Contraparte[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [baixaDialogOpen, setBaixaDialogOpen] = useState(false);
  const [controleSaldoOpen, setControleSaldoOpen] = useState(false);
  const [editando, setEditando] = useState<Transacao | null>(null);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [selecionadosHistorico, setSelecionadosHistorico] = useState<string[]>([]);
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const [filtroConta, setFiltroConta] = useState("todos");
  const [duplicatas, setDuplicatas] = useState<TransacaoComDados[]>([]);
  const [pageSize, setPageSize] = useState<number>(50);
  const [tipoFiltro, setTipoFiltro] = useState<'todas' | 'entrada' | 'saída'>('todas');
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const [formData, setFormData] = useState({
    data_transacao: new Date().toISOString().split("T")[0],
    descricao: "",
    valor: "",
    tipo: "despesa" as "receita" | "despesa",
    categoria_id: "",
    centro_custo_id: "",
    conta_bancaria_id: "",
    contraparte_id: "",
    data_vencimento: "",
    data_agendamento: "",
    observacoes: "",
  });

  useEffect(() => {
    loadData();
  }, [pageSize, tipoFiltro]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const hoje = new Date().toISOString().split("T")[0];

      // Buscar transações pagas (histórico)
      let query = supabase
        .from("transacoes")
        .select(`
          *,
          categoria:categoria_id(nome, icone, cor),
          centro_custo:centro_custo_id(nome, codigo),
          conta:conta_bancaria_id(nome_banco),
          contraparte:contrapartes(nome)
        `)
        .eq("user_id", user.id)
        .eq("status", "pago");

      // Apply type filter if not 'todas'
      if (tipoFiltro !== 'todas') {
        query = query.eq("tipo", tipoFiltro);
      }

      // Apply pagination and ordering
      query = query
        .order("data_transacao", { ascending: false })
        .limit(pageSize);

      const { data: transacoesPagas, error: transacoesPagasError } = await query;

      if (transacoesPagasError) throw transacoesPagasError;

      // Buscar transações futuras (a vencer)
      const { data: transacoesFuturas, error: transacoesFuturasError } = await supabase
        .from("transacoes")
        .select(`
          *,
          categoria:categoria_id(nome, icone, cor),
          centro_custo:centro_custo_id(nome, codigo),
          conta:conta_bancaria_id(nome_banco),
          contraparte:contrapartes(nome)
        `)
        .eq("user_id", user.id)
        .in("status", ["pendente", "agendado"])
        .gte("data_transacao", hoje)
        .order("data_transacao", { ascending: true });

      if (transacoesFuturasError) throw transacoesFuturasError;

      // Buscar DDA boletos pendentes
      const { data: ddaData, error: ddaError } = await supabase
        .from("dda_boletos")
        .select(`
          *,
          contas_bancarias!dda_boletos_conta_bancaria_id_fkey(nome_banco)
        `)
        .eq("user_id", user.id)
        .in("status", ["pendente", "vencido"])
        .order("data_vencimento", { ascending: true });

      if (ddaError) throw ddaError;

      // Buscar categorias
      const { data: categoriasData, error: categoriasError } = await supabase
        .from("categorias")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("nome");

      if (categoriasError) throw categoriasError;

      // Buscar centros de custo
      const { data: centrosData, error: centrosError } = await supabase
        .from("centros_custo")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("nome");

      if (centrosError) throw centrosError;

      // Buscar contas bancárias
      const { data: contasData, error: contasError } = await supabase
        .from("contas_bancarias")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("nome_banco");

      if (contasError) throw contasError;

      // Buscar contrapartes
      const { data: contrapartesData, error: contrapartesError } = await supabase
        .from("contrapartes")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("nome");

      if (contrapartesError) throw contrapartesError;

      // Montar lista de transações a vencer
      const aVencer: TransacaoAVencer[] = [];

      // Adicionar transações futuras
      (transacoesFuturas || []).forEach((t) => {
        aVencer.push({
          id: t.id,
          tipo: 'transacao',
          data_vencimento: t.data_transacao,
          descricao: t.descricao,
          valor: Number(t.valor),
          categoria: t.categoria?.nome,
          conta: t.conta?.nome_banco,
          conta_bancaria_id: t.conta_bancaria_id || undefined,
          status: t.status || 'pendente',
          original: t,
        });
      });

      // Adicionar DDA boletos
      (ddaData || []).forEach((b) => {
        const conta = b.contas_bancarias as any;
        aVencer.push({
          id: b.id,
          tipo: 'dda',
          data_vencimento: b.data_vencimento,
          descricao: b.beneficiario,
          valor: Number(b.valor),
          conta: conta?.nome_banco,
          conta_bancaria_id: b.conta_bancaria_id,
          status: b.status,
          original: b,
        });
      });

      // Ordenar por data de vencimento
      aVencer.sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());

      // Buscar possíveis duplicatas
      const { data: duplicatasData, error: duplicatasError } = await supabase
        .from("transacoes")
        .select(`
          *,
          categoria:categoria_id(nome, icone,cor),
          centro_custo:centro_custo_id(nome, codigo),
          conta:conta_bancaria_id(nome_banco),
          contraparte:contrapartes(nome)
        `)
        .eq("user_id", user.id)
        .eq("possivel_duplicata", true)
        .order("data_transacao", { ascending: false });

      if (duplicatasError) console.error("Error loading duplicates:", duplicatasError);

      setTransacoes(transacoesPagas || []);
      setTransacoesAVencer(aVencer);
      setDDABoletos(ddaData || []);
      setCategorias(categoriasData || []);
      setCentrosCusto(centrosData || []);
      setContas(contasData || []);
      setListaContrapartes(contrapartesData || []);
      setDuplicatas(duplicatasData || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      data_transacao: new Date().toISOString().split("T")[0],
      descricao: "",
      valor: "",
      tipo: "despesa",
      categoria_id: "",
      centro_custo_id: "",
      conta_bancaria_id: "",
      contraparte_id: "",
      data_vencimento: "",
      data_agendamento: "",
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
          conta:conta_bancaria_id(nome_banco)
        `)
        .eq("user_id", user.id)
        .eq("conta_bancaria_id", contaConciliacao)
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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const agora = new Date().toISOString();

      const { error } = await supabase
        .from("transacoes")
        .update({
          status: "pago",
          conciliado: true,
          data_conciliacao: agora,
          usuario_conciliacao: user.id,
          updated_at: agora,
        })
        .in("id", selecionadosConciliacao);

      if (error) throw error;

      toast({
        title: "Conciliação realizada",
        description: `${selecionadosConciliacao.length} transação(ões) conciliada(s) com sucesso`,
      });

      buscarTransacoesConciliacao();
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao conciliar",
        description: error.message,
        variant: "destructive",
      });
    }
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
        conta_bancaria_id: transacao.conta_bancaria_id || "",
        contraparte_id: transacao.contraparte_id || "",
        data_vencimento: (transacao as any).data_vencimento || "",
        data_agendamento: (transacao as any).data_agendamento || "",
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
        conta_bancaria_id: transacaoEditada.conta_bancaria_id || "",
        contraparte_id: transacaoEditada.contraparte_id || "",
        data_vencimento: (transacaoEditada as any).data_vencimento || "",
        data_agendamento: (transacaoEditada as any).data_agendamento || "",
        observacoes: transacaoEditada.observacoes || "",
      });
      setDialogOpen(true);
      setAlertDialogOpen(false);
      setTransacaoEditada(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const valor = parseFloat(formData.valor);
      if (isNaN(valor) || valor <= 0) {
        throw new Error("Valor inválido");
      }

      if (editando) {
        const { error } = await supabase
          .from("transacoes")
          .update({
            data_transacao: formData.data_transacao,
            descricao: formData.descricao,
            valor: valor,
            tipo: formData.tipo,
            categoria_id: formData.categoria_id || null,
            centro_custo_id: formData.centro_custo_id || null,
            conta_bancaria_id: formData.conta_bancaria_id || null,
            contraparte_id: formData.contraparte_id || null,
            data_vencimento: formData.data_vencimento || null,
            data_agendamento: formData.data_agendamento || null,
            observacoes: formData.observacoes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editando.id);

        if (error) throw error;

        toast({
          title: "Transação atualizada",
          description: "As alterações foram salvas com sucesso",
        });
      } else {
        const { error } = await supabase.from("transacoes").insert({
          user_id: user.id,
          data_transacao: formData.data_transacao,
          descricao: formData.descricao,
          valor: valor,
          tipo: formData.tipo,
          categoria_id: formData.categoria_id || null,
          centro_custo_id: formData.centro_custo_id || null,
          conta_bancaria_id: formData.conta_bancaria_id || null,
          contraparte_id: formData.contraparte_id || null,
          data_vencimento: formData.data_vencimento || null,
          data_agendamento: formData.data_agendamento || null,
          status: "pendente",
          conciliado: false,
          observacoes: formData.observacoes || null,
          origem: "manual",
        });

        if (error) throw error;

        toast({
          title: "Transação criada",
          description: "Nova transação adicionada com sucesso",
        });
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar transação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;

    try {
      const { error } = await supabase.from("transacoes").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Transação excluída",
        description: "A transação foi removida com sucesso",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir transação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteSelecionadosHistorico = async () => {
    if (selecionadosHistorico.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selecionadosHistorico.length} transação(ões)?`)) return;

    try {
      const { error } = await supabase
        .from("transacoes")
        .delete()
        .in("id", selecionadosHistorico);

      if (error) throw error;

      toast({
        title: "Transações excluídas",
        description: `${selecionadosHistorico.length} transação(ões) excluída(s) com sucesso`,
      });

      setSelecionadosHistorico([]);
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir transações",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteSelecionadosAVencer = async () => {
    if (selecionados.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selecionados.length} item(ns)?`)) return;

    try {
      // Separar transações e DDAs
      const transacoesIds = selecionados.filter(id =>
        transacoesAVencer.find(t => t.id === id && t.tipo === 'transacao')
      );
      const ddasIds = selecionados.filter(id =>
        transacoesAVencer.find(t => t.id === id && t.tipo === 'dda')
      );

      // Excluir transações
      if (transacoesIds.length > 0) {
        const { error: transacoesError } = await supabase
          .from("transacoes")
          .delete()
          .in("id", transacoesIds);

        if (transacoesError) throw transacoesError;
      }

      // Excluir DDAs
      if (ddasIds.length > 0) {
        const { error: ddasError } = await supabase
          .from("dda_boletos")
          .delete()
          .in("id", ddasIds);

        if (ddasError) throw ddasError;
      }

      toast({
        title: "Itens excluídos",
        description: `${selecionados.length} item(ns) excluído(s) com sucesso`,
      });

      setSelecionados([]);
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir itens",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const totalReceitas = transacoes
    .filter((t) => t.tipo === "receita" || t.tipo === "entrada")
    .reduce((sum, t) => sum + Math.abs(Number(t.valor)), 0);

  const totalDespesas = transacoes
    .filter((t) => t.tipo === "despesa" || t.tipo === "saída")
    .reduce((sum, t) => sum + Math.abs(Number(t.valor)), 0);

  if (loading) {
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
          <Button variant="outline" onClick={() => navigate("/importacao")}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Arquivos
          </Button>
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

                  <div className="space-y-2 flex flex-col">
                    <Label htmlFor="contraparte" className="mb-2">Contraparte</Label>
                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={comboboxOpen}
                          className="w-full justify-between"
                        >
                          {formData.contraparte_id
                            ? listaContrapartes.find((c) => c.id === formData.contraparte_id)?.nome
                            : "Selecione..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar contato..." />
                          <CommandList>
                            <CommandEmpty>Nenhum contato encontrado.</CommandEmpty>
                            <CommandGroup>
                              {listaContrapartes.map((contraparte) => (
                                <CommandItem
                                  key={contraparte.id}
                                  value={contraparte.nome}
                                  onSelect={() => {
                                    setFormData({ ...formData, contraparte_id: contraparte.id });
                                    setComboboxOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.contraparte_id === contraparte.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {contraparte.nome}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground mt-1">
                      Preenchido automaticamente via Pluggy ou manualmente
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data-vencimento">Data de Vencimento</Label>
                    <Input
                      id="data-vencimento"
                      type="date"
                      value={formData.data_vencimento}
                      onChange={(e) =>
                        setFormData({ ...formData, data_vencimento: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data-agendamento">Data de Agendamento</Label>
                    <Input
                      id="data-agendamento"
                      type="date"
                      value={formData.data_agendamento}
                      onChange={(e) =>
                        setFormData({ ...formData, data_agendamento: e.target.value })
                      }
                    />
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
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: cat.cor || "#ccc" }}
                                />
                                {cat.nome}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="centro-custo">Centro de Custo</Label>
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
                        {centrosCusto.map((cc) => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="conta">Conta Bancária</Label>
                    <Select
                      value={formData.conta_bancaria_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, conta_bancaria_id: value })
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
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DuplicateTransactionsPanel
        duplicatas={duplicatas}
        onUpdate={() => loadData()}
      />

      <Tabs defaultValue="historico">
        <TabsList>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="avencer">A Vencer</TabsTrigger>
          <TabsTrigger value="conciliacao">Conciliação</TabsTrigger>
        </TabsList>

        <TabsContent value="historico" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant={tipoFiltro === 'todas' ? 'default' : 'outline'}
                onClick={() => setTipoFiltro('todas')}
              >
                Todas
              </Button>
              <Button
                variant={tipoFiltro === 'entrada' ? 'default' : 'outline'}
                onClick={() => setTipoFiltro('entrada')}
                className="text-green-600"
              >
                Receitas
              </Button>
              <Button
                variant={tipoFiltro === 'saída' ? 'default' : 'outline'}
                onClick={() => setTipoFiltro('saída')}
                className="text-red-600"
              >
                Despesas
              </Button>
            </div>
            {selecionadosHistorico.length > 0 && (
              <Button variant="destructive" onClick={handleDeleteSelecionadosHistorico}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir ({selecionadosHistorico.length})
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selecionadosHistorico.length === transacoes.length && transacoes.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) setSelecionadosHistorico(transacoes.map(t => t.id));
                          else setSelecionadosHistorico([]);
                        }}
                      />
                    </TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma transação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    transacoes.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Checkbox
                            checked={selecionadosHistorico.includes(t.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelecionadosHistorico([...selecionadosHistorico, t.id]);
                              else setSelecionadosHistorico(selecionadosHistorico.filter(id => id !== t.id));
                            }}
                          />
                        </TableCell>
                        <TableCell>{new Date(t.data_transacao).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="font-medium">{t.descricao}</div>
                          {t.contraparte && (
                            <div className="text-xs text-muted-foreground">{t.contraparte.nome}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {t.categoria && (
                            <Badge variant="outline" style={{ borderColor: t.categoria.cor || undefined }}>
                              {t.categoria.nome}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{t.conta?.nome_banco}</TableCell>
                        <TableCell className={cn(
                          "font-medium",
                          t.tipo === 'receita' || t.tipo === 'entrada' ? "text-green-600" : "text-red-600"
                        )}>
                          {t.tipo === 'receita' || t.tipo === 'entrada' ? '+' : '-'}
                          R$ {Math.abs(Number(t.valor)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(t.id)}>
                            <Trash2 className="h-4 w-4" />
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

        <TabsContent value="avencer" className="space-y-4">
          <div className="flex justify-end">
            {selecionados.length > 0 && (
              <Button variant="destructive" onClick={handleDeleteSelecionadosAVencer}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir ({selecionados.length})
              </Button>
            )}
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selecionados.length === transacoesAVencer.length && transacoesAVencer.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) setSelecionados(transacoesAVencer.map(t => t.id));
                          else setSelecionados([]);
                        }}
                      />
                    </TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
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
                    transacoesAVencer.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Checkbox
                            checked={selecionados.includes(t.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelecionados([...selecionados, t.id]);
                              else setSelecionados(selecionados.filter(id => id !== t.id));
                            }}
                          />
                        </TableCell>
                        <TableCell>{new Date(t.data_vencimento).toLocaleDateString()}</TableCell>
                        <TableCell>{t.descricao}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{t.tipo === 'dda' ? 'DDA' : 'Manual'}</Badge>
                        </TableCell>
                        <TableCell>
                          R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.status === 'vencido' ? 'destructive' : 'secondary'}>
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {t.tipo === 'transacao' && (
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(t.original as Transacao)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conciliacao" className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label>Conta Bancária</Label>
              <Select value={contaConciliacao} onValueChange={setContaConciliacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_banco}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input type="date" value={dataInicialConciliacao} onChange={e => setDataInicialConciliacao(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input type="date" value={dataFinalConciliacao} onChange={e => setDataFinalConciliacao(e.target.value)} />
            </div>
            <Button onClick={buscarTransacoesConciliacao}>Buscar</Button>
          </div>

          {transacoesConciliacao.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Transações Pendentes</CardTitle>
                <Button onClick={handleConciliarSelecionados} disabled={selecionadosConciliacao.length === 0}>
                  Conciliar Selecionados ({selecionadosConciliacao.length})
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={todosMarConciliacao}
                          onCheckedChange={handleMarcarTodosConciliacao}
                        />
                      </TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transacoesConciliacao.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Checkbox
                            checked={selecionadosConciliacao.includes(t.id)}
                            onCheckedChange={() => handleToggleConciliacao(t.id)}
                          />
                        </TableCell>
                        <TableCell>{new Date(t.data_transacao).toLocaleDateString()}</TableCell>
                        <TableCell>{t.descricao}</TableCell>
                        <TableCell>R$ {Number(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar Transação Sincronizada</AlertDialogTitle>
            <AlertDialogDescription>
              Esta transação foi importada automaticamente. Alterações manuais podem ser sobrescritas em futuras sincronizações. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEdicao}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
