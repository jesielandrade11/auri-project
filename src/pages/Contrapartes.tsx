import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, UserCheck, UserX, Search, Receipt, Building2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PendingContrapartesPanel } from "@/components/contrapartes/PendingContrapartesPanel";

interface Contraparte {
  id: string;
  nome: string;
  papel: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
}

export default function Contatos() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tabAtiva, setTabAtiva] = useState<"todos" | "clientes" | "fornecedores" | "outros">("todos");
  const [formData, setFormData] = useState({
    nome: "",
    papel: "fornecedor",
    documento: "",
    email: "",
    telefone: "",
    endereco: "",
    observacoes: "",
    ativo: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: contrapartes, isLoading } = useQuery({
    queryKey: ["contrapartes"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("contrapartes")
        .select("*")
        .eq("user_id", user.user.id)
        .order("nome");

      if (error) throw error;
      return data as Contraparte[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Não autenticado");

      const { error } = await supabase.from("contrapartes").insert({
        user_id: user.user.id,
        nome: data.nome,
        papel: data.papel,
        documento: data.documento || null,
        email: data.email || null,
        telefone: data.telefone || null,
        endereco: data.endereco || null,
        observacoes: data.observacoes || null,
        ativo: data.ativo,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrapartes"] });
      toast({ title: "Contato criado com sucesso!" });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Erro ao criar contato", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("contrapartes")
        .update({
          nome: data.nome,
          papel: data.papel,
          documento: data.documento || null,
          email: data.email || null,
          telefone: data.telefone || null,
          endereco: data.endereco || null,
          observacoes: data.observacoes || null,
          ativo: data.ativo,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrapartes"] });
      toast({ title: "Contato atualizado com sucesso!" });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar contato", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contrapartes").update({ ativo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrapartes"] });
      toast({ title: "Contato inativado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao inativar contato", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      papel: "fornecedor",
      documento: "",
      email: "",
      telefone: "",
      endereco: "",
      observacoes: "",
      ativo: true,
    });
    setEditingId(null);
  };

  const handleEdit = (contraparte: Contraparte) => {
    setFormData({
      nome: contraparte.nome,
      papel: contraparte.papel || "fornecedor",
      documento: contraparte.documento || "",
      email: contraparte.email || "",
      telefone: contraparte.telefone || "",
      endereco: contraparte.endereco || "",
      observacoes: contraparte.observacoes || "",
      ativo: contraparte.ativo,
    });
    setEditingId(contraparte.id);
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleNovaTransacao = (contraparteId: string) => {
    navigate("/transacoes", { state: { contraparteId } });
  };

  const contrapartesFiltradas = contrapartes?.filter((c) => {
    const matchSearch = c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.documento?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchTab = false;
    if (tabAtiva === "todos") {
      matchTab = c.ativo;
    } else if (tabAtiva === "clientes") {
      matchTab = c.papel === "cliente" && c.ativo;
    } else if (tabAtiva === "fornecedores") {
      matchTab = c.papel === "fornecedor" && c.ativo;
    } else if (tabAtiva === "outros") {
      matchTab = c.papel !== "cliente" && c.papel !== "fornecedor" && c.ativo;
    }

    return matchSearch && matchTab;
  });

  const getPapelBadge = (papel: string) => {
    if (papel === "cliente") {
      return <Badge className="bg-green-600 hover:bg-green-700">Cliente</Badge>;
    } else if (papel === "fornecedor") {
      return <Badge variant="destructive">Fornecedor</Badge>;
    } else if (papel === "empresa") {
      return <Badge variant="outline" className="border-blue-500 text-blue-500">Empresa</Badge>;
    } else if (papel === "titular") {
      return <Badge variant="outline" className="border-purple-500 text-purple-500">Titular</Badge>;
    }
    return <Badge variant="secondary">{papel}</Badge>;
  };

  const stats = {
    total: contrapartes?.filter(c => c.ativo).length || 0,
    clientes: contrapartes?.filter(c => c.ativo && c.papel === "cliente").length || 0,
    fornecedores: contrapartes?.filter(c => c.ativo && c.papel === "fornecedor").length || 0,
    outros: contrapartes?.filter(c => c.ativo && c.papel !== "cliente" && c.papel !== "fornecedor").length || 0,
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Contatos</h1>
          <p className="text-muted-foreground">Gerencie seus parceiros comerciais</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Contato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Novo"} Contato</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="nome">Nome*</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="papel">Papel*</Label>
                  <Select value={formData.papel} onValueChange={(value) => setFormData({ ...formData, papel: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="fornecedor">Fornecedor</SelectItem>
                      <SelectItem value="empresa">Empresa</SelectItem>
                      <SelectItem value="titular">Titular</SelectItem>
                      <SelectItem value="ambos">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documento">CPF/CNPJ</Label>
                  <Input
                    id="documento"
                    value={formData.documento}
                    onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2 col-span-2">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                  <Label htmlFor="ativo">Ativo</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <PendingContrapartesPanel />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.clientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fornecedores</CardTitle>
            <Building2 className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.fornecedores}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outros</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.outros}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Lista de Contatos</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tabAtiva} onValueChange={(v) => setTabAtiva(v as typeof tabAtiva)}>
            <TabsList className="mb-4">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="clientes">Clientes</TabsTrigger>
              <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
              <TabsTrigger value="outros">Outros</TabsTrigger>
            </TabsList>
            <TabsContent value={tabAtiva}>
              {isLoading ? (
                <p>Carregando...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contrapartesFiltradas?.map((contraparte) => (
                      <TableRow key={contraparte.id}>
                        <TableCell className="font-medium">{contraparte.nome}</TableCell>
                        <TableCell>{getPapelBadge(contraparte.papel)}</TableCell>
                        <TableCell>{contraparte.documento || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            {contraparte.email && <span>{contraparte.email}</span>}
                            {contraparte.telefone && <span>{contraparte.telefone}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleNovaTransacao(contraparte.id)} title="Nova transação">
                              <Receipt className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(contraparte)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Tem certeza que deseja inativar este contato?")) {
                                  deleteMutation.mutate(contraparte.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
