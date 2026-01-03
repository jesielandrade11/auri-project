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
import { Plus, Pencil, Trash2, Users, UserCheck, UserX, Search, Receipt, Building2, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
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
import { cn } from "@/lib/utils";

import { PendingContrapartesPanel } from "@/components/contrapartes/PendingContrapartesPanel";

interface Contraparte {
  id: string;
  nome: string;
  // papel: string | null; // Legacy
  documento: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  contraparte_roles: { role: string }[];
}

export default function Contatos() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tabAtiva, setTabAtiva] = useState<"todos" | "clientes" | "fornecedores" | "outros">("todos");
  const [formData, setFormData] = useState({
    nome: "",
    roles: [] as string[],
    documento: "",
    email: "",
    telefone: "",
    endereco: "",
    observacoes: "",
    ativo: true,
  });
  const [availableRoles, setAvailableRoles] = useState<string[]>(['cliente', 'fornecedor', 'empresa', 'titular']);
  const [rolePopoverOpen, setRolePopoverOpen] = useState(false);
  const [newRole, setNewRole] = useState("");

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
        .select("*, contraparte_roles(role)")
        .eq("user_id", user.user.id)
        .order("nome");

      if (error) throw error;

      // Fetch all distinct roles for the filter/selector
      const { data: rolesData } = await supabase
        .from('contraparte_roles')
        .select('role');

      if (rolesData) {
        const distinctRoles = Array.from(new Set(rolesData.map(r => r.role)));
        const defaults = ['cliente', 'fornecedor', 'empresa', 'titular'];
        setAvailableRoles(Array.from(new Set([...defaults, ...distinctRoles])).sort());
      }

      return data as Contraparte[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Não autenticado");

      // 1. Insert contraparte
      const { data: newContact, error } = await supabase.from("contrapartes").insert({
        user_id: user.user.id,
        nome: data.nome,
        // papel: data.roles.length > 0 ? data.roles[0] : null, // Legacy
        documento: data.documento || null,
        email: data.email || null,
        telefone: data.telefone || null,
        endereco: data.endereco || null,
        observacoes: data.observacoes || null,
        ativo: data.ativo,
      }).select().single();

      if (error) throw error;

      // 2. Insert roles
      if (data.roles.length > 0) {
        const rolesToInsert = data.roles.map(r => ({
          contraparte_id: newContact.id,
          role: r
        }));
        const { error: rolesError } = await supabase.from('contraparte_roles').insert(rolesToInsert);
        if (rolesError) throw rolesError;
      }
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
      // 1. Update contraparte details
      const { error } = await supabase
        .from("contrapartes")
        .update({
          nome: data.nome,
          // papel: data.roles.length > 0 ? data.roles[0] : null, // Legacy
          documento: data.documento || null,
          email: data.email || null,
          telefone: data.telefone || null,
          endereco: data.endereco || null,
          observacoes: data.observacoes || null,
          ativo: data.ativo,
        })
        .eq("id", id);

      if (error) throw error;

      // 2. Update roles (delete all and re-insert)
      const { error: deleteError } = await supabase
        .from('contraparte_roles')
        .delete()
        .eq('contraparte_id', id);

      if (deleteError) throw deleteError;

      if (data.roles.length > 0) {
        const rolesToInsert = data.roles.map(r => ({
          contraparte_id: id,
          role: r
        }));
        const { error: insertError } = await supabase.from('contraparte_roles').insert(rolesToInsert);
        if (insertError) throw insertError;
      }
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
      roles: ["fornecedor"],
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
      roles: contraparte.contraparte_roles.map(r => r.role),
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

  const toggleRole = (role: string) => {
    setFormData(prev => {
      if (prev.roles.includes(role)) {
        return { ...prev, roles: prev.roles.filter(r => r !== role) };
      } else {
        return { ...prev, roles: [...prev.roles, role] };
      }
    });
  };

  const addNewRole = () => {
    if (!newRole.trim()) return;
    const role = newRole.trim().toLowerCase();

    if (!availableRoles.includes(role)) {
      setAvailableRoles(prev => [...prev, role].sort());
    }

    if (!formData.roles.includes(role)) {
      setFormData(prev => ({ ...prev, roles: [...prev.roles, role] }));
    }
    setNewRole("");
  };

  const contrapartesFiltradas = contrapartes?.filter((c) => {
    const matchSearch = c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.documento?.toLowerCase().includes(searchTerm.toLowerCase());

    const roles = c.contraparte_roles.map(r => r.role);
    let matchTab = false;
    if (tabAtiva === "todos") {
      matchTab = c.ativo;
    } else if (tabAtiva === "clientes") {
      matchTab = roles.includes("cliente") && c.ativo;
    } else if (tabAtiva === "fornecedores") {
      matchTab = roles.includes("fornecedor") && c.ativo;
    } else if (tabAtiva === "outros") {
      matchTab = (roles.includes("empresa") || roles.includes("titular") || (!roles.includes("cliente") && !roles.includes("fornecedor"))) && c.ativo;
    }

    return matchSearch && matchTab;
  });

  const getPapelBadges = (roles: { role: string }[]) => {
    if (!roles || roles.length === 0) return <Badge variant="secondary">Sem papel</Badge>;

    return (
      <div className="flex flex-wrap gap-1">
        {roles.map(r => {
          let variant: "default" | "destructive" | "outline" | "secondary" = "secondary";
          let className = "";

          if (r.role === "cliente") {
            variant = "default";
            className = "bg-green-600 hover:bg-green-700";
          } else if (r.role === "fornecedor") {
            variant = "destructive";
          } else if (r.role === "empresa") {
            variant = "outline";
            className = "border-blue-500 text-blue-500";
          } else if (r.role === "titular") {
            variant = "outline";
            className = "border-purple-500 text-purple-500";
          }

          return (
            <Badge key={r.role} variant={variant} className={className}>
              {r.role.charAt(0).toUpperCase() + r.role.slice(1)}
            </Badge>
          );
        })}
      </div>
    );
  };

  const stats = {
    total: contrapartes?.filter(c => c.ativo).length || 0,
    clientes: contrapartes?.filter(c => c.ativo && c.contraparte_roles.some(r => r.role === "cliente")).length || 0,
    fornecedores: contrapartes?.filter(c => c.ativo && c.contraparte_roles.some(r => r.role === "fornecedor")).length || 0,
    outros: contrapartes?.filter(c => c.ativo && c.contraparte_roles.some(r => r.role === "empresa" || r.role === "titular")).length || 0,
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Contatos</h1>
          <p className="text-muted-foreground">Gerencie seus parceiros comerciais, empresas e titulares</p>
          <PendingContrapartesPanel />
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

                <div className="space-y-2 col-span-2">
                  <Label>Papéis</Label>
                  <div className="flex flex-wrap gap-2 mb-2 p-2 border rounded-md min-h-[40px]">
                    {formData.roles.length > 0 ? (
                      formData.roles.map(role => (
                        <Badge key={role} variant="secondary" className="flex items-center gap-1">
                          {role}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => toggleRole(role)}
                          />
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm italic">Nenhum papel selecionado</span>
                    )}
                  </div>

                  <Popover open={rolePopoverOpen} onOpenChange={setRolePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Plus className="mr-2 h-4 w-4" /> Adicionar Papel
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar papel..." />
                        <CommandList>
                          <CommandEmpty>
                            <div className="p-2">
                              <p className="text-xs text-muted-foreground mb-2">Papel não encontrado.</p>
                              <div className="flex gap-2">
                                <Input
                                  value={newRole}
                                  onChange={(e) => setNewRole(e.target.value)}
                                  placeholder="Novo papel"
                                  className="h-7 text-xs"
                                />
                                <Button size="sm" className="h-7" onClick={addNewRole}>
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            {availableRoles.map((role) => (
                              <CommandItem
                                key={role}
                                value={role}
                                onSelect={() => toggleRole(role)}
                              >
                                <div className={cn(
                                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                  formData.roles.includes(role)
                                    ? "bg-primary text-primary-foreground"
                                    : "opacity-50 [&_svg]:invisible"
                                )}>
                                  <Check className={cn("h-4 w-4")} />
                                </div>
                                <span className="capitalize">{role}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
      <div className="grid gap-4 md:grid-cols-4">
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" /> Outros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.outros}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Contatos</CardTitle>
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
                      <TableHead>Papéis</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contrapartesFiltradas?.map((contraparte) => (
                      <TableRow key={contraparte.id}>
                        <TableCell className="font-medium">{contraparte.nome}</TableCell>
                        <TableCell>{getPapelBadges(contraparte.contraparte_roles)}</TableCell>
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
