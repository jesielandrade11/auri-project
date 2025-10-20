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
import { Plus, Pencil, Trash2, Users, UserCheck, UserX, Search, Receipt } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Contraparte {
  id: string;
  nome: string;
  papel: "cliente" | "fornecedor" | "ambos";
  documento: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
}

export default function Contrapartes() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tabAtiva, setTabAtiva] = useState<"todos" | "clientes" | "fornecedores">("todos");
  const [formData, setFormData] = useState({
    nome: "",
    papel: "fornecedor" as "cliente" | "fornecedor" | "ambos",
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
      toast({ title: "Contraparte criada com sucesso!" });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Erro ao criar contraparte", description: error.message, variant: "destructive" });
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
      toast({ title: "Contraparte atualizada com sucesso!" });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar contraparte", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contrapartes").update({ ativo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrapartes"] });
      toast({ title: "Contraparte inativada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao inativar contraparte", description: error.message, variant: "destructive" });
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
      papel: contraparte.papel,
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
    const matchTab = 
      tabAtiva === "todos" ? c.ativo :
      tabAtiva === "clientes" ? (c.papel === "cliente" || c.papel === "ambos") && c.ativo :
      (c.papel === "fornecedor" || c.papel === "ambos") && c.ativo;
    return matchSearch && matchTab;
  });

  const getPapelBadge = (papel: string) => {
    if (papel === "cliente") return <Badge variant="default" className="bg-success">Cliente</Badge>;
    if (papel === "fornecedor") return <Badge variant="destructive">Fornecedor</Badge>;
    return <Badge variant="secondary">Ambos</Badge>;
  };

  const stats = {
    total: contrapartes?.filter(c => c.ativo).length || 0,
    clientes: contrapartes?.filter(c => c.ativo && (c.papel === "cliente" || c.papel === "ambos")).length || 0,
    fornecedores: contrapartes?.filter(c => c.ativo && (c.papel === "fornecedor" || c.papel === "ambos")).length || 0,
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Fornecedores & Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus parceiros comerciais</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Contraparte
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Nova"} Contraparte</DialogTitle>
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
                  <Select value={formData.papel} onValueChange={(value: any) => setFormData({ ...formData, papel: value })}>
                    <SelectTrigger id="papel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="fornecedor">Fornecedor</SelectItem>
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
                    placeholder="000.000.000-00"
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
                    placeholder="(00) 00000-0000"
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
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-success" /> Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.clientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserX className="h-4 w-4 text-destructive" /> Fornecedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.fornecedores}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Contrapartes</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tabAtiva} onValueChange={(v: any) => setTabAtiva(v)}>
            <TabsList className="mb-4">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="clientes">Clientes</TabsTrigger>
              <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
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
                        <TableCell className="text-muted-foreground">{contraparte.documento || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="text-sm">
                            {contraparte.email && <div>{contraparte.email}</div>}
                            {contraparte.telefone && <div>{contraparte.telefone}</div>}
                            {!contraparte.email && !contraparte.telefone && "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleNovaTransacao(contraparte.id)}
                              title="Nova transação"
                            >
                              <Receipt className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(contraparte)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Tem certeza que deseja inativar esta contraparte?")) {
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
