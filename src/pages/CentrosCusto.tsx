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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CascadeReportDialog } from "@/components/categories/CascadeReportDialog";

interface CentroCusto {
  id: string;
  codigo: string;
  nome: string;
  tipo: string | null;
  tipo_operacao: 'entrada' | 'saída' | 'ambos';
  orcamento_mensal: number | null;
  ativo: boolean;
  created_at: string;
}

export default function CentrosCusto() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    codigo: "",
    nome: "",
    tipo: "operacional",
    tipo_operacao: "saída" as 'entrada' | 'saída' | 'ambos',
    orcamento_mensal: "",
    ativo: true,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: centros, isLoading } = useQuery({
    queryKey: ["centros-custo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centros_custo")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as CentroCusto[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Não autenticado");

      const { error } = await supabase.from("centros_custo").insert({
        user_id: user.user.id,
        codigo: data.codigo,
        nome: data.nome,
        tipo: data.tipo,
        tipo_operacao: data.tipo_operacao,
        orcamento_mensal: data.orcamento_mensal ? parseFloat(data.orcamento_mensal) : null,
        ativo: data.ativo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centros-custo"] });
      queryClient.invalidateQueries({ queryKey: ["centros-custo-report"] });
      queryClient.invalidateQueries({ queryKey: ["categorias-report"] });
      toast({ title: "Centro de custo criado com sucesso!" });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Erro ao criar centro de custo", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("centros_custo")
        .update({
          codigo: data.codigo,
          nome: data.nome,
          tipo: data.tipo,
          tipo_operacao: data.tipo_operacao,
          orcamento_mensal: data.orcamento_mensal ? parseFloat(data.orcamento_mensal) : null,
          ativo: data.ativo,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centros-custo"] });
      queryClient.invalidateQueries({ queryKey: ["centros-custo-report"] });
      queryClient.invalidateQueries({ queryKey: ["categorias-report"] });
      toast({ title: "Centro de custo atualizado com sucesso!" });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar centro de custo", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First, check if there are linked categories
      const { count, error: countError } = await supabase
        .from("categorias")
        .select("*", { count: 'exact', head: true })
        .eq("centro_custo_id", id)
        .eq("ativo", true);

      if (countError) throw countError;

      if (count && count > 0) {
        throw new Error(
          `Não é possível deletar este Centro de Custo pois ele possui ${count} categoria(s) vinculada(s). Remova ou reatribua as categorias primeiro.`
        );
      }

      // If no linked categories, proceed with deletion
      const { error } = await supabase.from("centros_custo").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centros-custo"] });
      toast({ title: "Centro de custo excluído com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir centro de custo", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      codigo: "",
      nome: "",
      tipo: "operacional",
      tipo_operacao: "despesa",
      orcamento_mensal: "",
      ativo: true,
    });
    setEditingId(null);
  };

  const handleEdit = (centro: CentroCusto) => {
    setFormData({
      codigo: centro.codigo,
      nome: centro.nome,
      tipo: centro.tipo || "operacional",
      tipo_operacao: centro.tipo_operacao || "despesa",
      orcamento_mensal: centro.orcamento_mensal?.toString() || "",
      ativo: centro.ativo,
    });
    setEditingId(centro.id);
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

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Centros de Custo</h1>
          <p className="text-muted-foreground">Gerencie os centros de custo da empresa</p>
        </div>
        <div className="flex gap-2">
          <CascadeReportDialog />
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Centro de Custo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar" : "Novo"} Centro de Custo</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código*</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome*</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Departamento</Label>
                    <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                      <SelectTrigger id="tipo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operacional">Operacional</SelectItem>
                        <SelectItem value="administrativo">Administrativo</SelectItem>
                        <SelectItem value="comercial">Comercial</SelectItem>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                        <SelectItem value="departamento">Departamento</SelectItem>
                        <SelectItem value="projeto">Projeto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo_operacao">Tipo de Operação</Label>
                    <Select
                      value={formData.tipo_operacao}
                      onValueChange={(value: 'entrada' | 'saída' | 'ambos') => setFormData({ ...formData, tipo_operacao: value })}
                    >
                      <SelectTrigger id="tipo_operacao">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="saída">Saída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orcamento">Orçamento Mensal</Label>
                  <Input
                    id="orcamento"
                    type="number"
                    step="0.01"
                    value={formData.orcamento_mensal}
                    onChange={(e) => setFormData({ ...formData, orcamento_mensal: e.target.value })}
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Centros de Custo</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead>Orçamento Mensal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centros?.map((centro) => (
                  <TableRow key={centro.id}>
                    <TableCell>{centro.codigo}</TableCell>
                    <TableCell className="font-medium">{centro.nome}</TableCell>
                    <TableCell className="capitalize">{centro.tipo}</TableCell>
                    <TableCell className="capitalize">
                      {centro.tipo_operacao === 'entrada' && <span className="text-green-600">Entrada</span>}
                      {centro.tipo_operacao === 'saída' && <span className="text-red-600">Saída</span>}
                      {centro.tipo_operacao === 'ambos' && <span className="text-blue-600">Ambos</span>}
                    </TableCell>
                    <TableCell>
                      {centro.orcamento_mensal
                        ? new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(centro.orcamento_mensal)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <span className={centro.ativo ? "text-green-600" : "text-red-600"}>
                        {centro.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(centro)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir este centro de custo?")) {
                              deleteMutation.mutate(centro.id);
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
        </CardContent>
      </Card>
    </div>
  );
}
