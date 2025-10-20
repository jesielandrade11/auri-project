import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { EmptyState, TableEmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary, QueryErrorFallback } from "@/components/ui/error-boundary";
import { useFormOperation, useConfirmOperation } from "@/hooks/useAsyncOperation";
import {
  useCategorias,
  useCreateCategoria,
  useUpdateCategoria,
  useDeleteCategoria,
  type Categoria,
} from "@/hooks/useAPI";
import { TablesInsert } from "@/integrations/supabase/types";

export default function Categorias() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);

  const [formData, setFormData] = useState({
    nome: "",
    tipo: "despesa" as "receita" | "despesa",
    dre_grupo: "",
    fixa_variavel: "",
    descricao: "",
    cor: "#EF4444",
    icone: "",
  });

  // Queries
  const { data: categorias = [], isLoading, error, refetch } = useCategorias();

  // Mutations
  const createCategoria = useCreateCategoria();
  const updateCategoria = useUpdateCategoria();
  const deleteCategoria = useDeleteCategoria();

  const resetForm = () => {
    setFormData({
      nome: "",
      tipo: "despesa",
      dre_grupo: "",
      fixa_variavel: "",
      descricao: "",
      cor: "#EF4444",
      icone: "",
    });
    setEditando(null);
  };

  const handleEdit = (categoria: Categoria) => {
    setEditando(categoria);
    setFormData({
      nome: categoria.nome,
      tipo: categoria.tipo as "receita" | "despesa",
      dre_grupo: categoria.dre_grupo || "",
      fixa_variavel: categoria.fixa_variavel || "",
      descricao: categoria.descricao || "",
      cor: categoria.cor || "#EF4444",
      icone: categoria.icone || "",
    });
    setDialogOpen(true);
  };

  // Form operations
  const { execute: handleSubmit, loading: submitting } = useFormOperation(
    async (data: typeof formData) => {
      const payload: Omit<TablesInsert<"categorias">, "user_id"> = {
        nome: data.nome,
        tipo: data.tipo,
        dre_grupo: data.dre_grupo || null,
        fixa_variavel: data.fixa_variavel || null,
        descricao: data.descricao || null,
        cor: data.cor,
        icone: data.icone || null,
      };

      if (editando) {
        return updateCategoria.mutateAsync({ id: editando.id, data: payload });
      } else {
        return createCategoria.mutateAsync(payload);
      }
    },
    {
      resetForm,
      closeDialog: () => setDialogOpen(false),
      successMessage: editando ? "Categoria atualizada com sucesso" : "Categoria criada com sucesso",
    }
  );

  // Delete operation
  const { execute: handleDelete } = useConfirmOperation(
    (id: string) => deleteCategoria.mutateAsync(id),
    "Tem certeza que deseja excluir esta categoria?",
    {
      successMessage: "Categoria excluída com sucesso",
    }
  );

  const receitas = categorias.filter((c) => c.tipo === "receita" && c.ativo);
  const despesas = categorias.filter((c) => c.tipo === "despesa" && c.ativo);

  if (isLoading) {
    return <LoadingPage text="Carregando categorias..." />;
  }

  if (error) {
    return <QueryErrorFallback error={error} resetError={() => refetch()} />;
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Categorias</h1>
            <p className="text-muted-foreground">
              Gerencie suas categorias de receitas e despesas
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Categoria
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editando ? "Editar Categoria" : "Nova Categoria"}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados da categoria
              </DialogDescription>
            </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(formData);
                }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: "receita" | "despesa") =>
                      setFormData({ ...formData, tipo: value })
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

                <div className="space-y-2">
                  <Label htmlFor="dre_grupo">Grupo DRE</Label>
                  <Select
                    value={formData.dre_grupo}
                    onValueChange={(value) =>
                      setFormData({ ...formData, dre_grupo: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receita_bruta">Receita Bruta</SelectItem>
                      <SelectItem value="opex">OPEX</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="cogs">COGS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fixa_variavel">Fixa/Variável</Label>
                  <Select
                    value={formData.fixa_variavel}
                    onValueChange={(value) =>
                      setFormData({ ...formData, fixa_variavel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixa">Fixa</SelectItem>
                      <SelectItem value="variavel">Variável</SelectItem>
                      <SelectItem value="mista">Mista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cor">Cor</Label>
                  <Input
                    id="cor"
                    type="color"
                    value={formData.cor}
                    onChange={(e) =>
                      setFormData({ ...formData, cor: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icone">Ícone (emoji)</Label>
                  <Input
                    id="icone"
                    value={formData.icone}
                    onChange={(e) =>
                      setFormData({ ...formData, icone: e.target.value })
                    }
                    placeholder="💰"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  rows={3}
                />
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
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Salvando..." : editando ? "Atualizar" : "Criar"}
                  </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categorias.filter(c => c.ativo).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{receitas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">{despesas.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Receitas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-success">💰</span> Receitas
          </CardTitle>
          <CardDescription>{receitas.length} categorias ativas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Grupo DRE</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receitas.length === 0 ? (
                <TableEmptyState
                  icon={Tag}
                  title="Nenhuma categoria de receita"
                  description="Crie sua primeira categoria de receita para começar"
                  action={{
                    label: "Nova Categoria",
                    onClick: () => {
                      resetForm();
                      setFormData(prev => ({ ...prev, tipo: "receita" }));
                      setDialogOpen(true);
                    }
                  }}
                  colSpan={4}
                />
              ) : (
                receitas.map((categoria) => (
                  <TableRow key={categoria.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{categoria.icone}</span>
                      <span className="font-medium">{categoria.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{categoria.dre_grupo || "-"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {categoria.descricao || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(categoria)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(categoria.id)}
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

      {/* Despesas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-danger">💸</span> Despesas
          </CardTitle>
          <CardDescription>{despesas.length} categorias ativas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Grupo DRE</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesas.length === 0 ? (
                <TableEmptyState
                  icon={Tag}
                  title="Nenhuma categoria de despesa"
                  description="Crie sua primeira categoria de despesa para começar"
                  action={{
                    label: "Nova Categoria",
                    onClick: () => {
                      resetForm();
                      setFormData(prev => ({ ...prev, tipo: "despesa" }));
                      setDialogOpen(true);
                    }
                  }}
                  colSpan={5}
                />
              ) : (
                despesas.map((categoria) => (
                <TableRow key={categoria.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{categoria.icone}</span>
                      <span className="font-medium">{categoria.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{categoria.dre_grupo || "-"}</Badge>
                  </TableCell>
                  <TableCell>
                    {categoria.fixa_variavel && (
                      <Badge variant="secondary">{categoria.fixa_variavel}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {categoria.descricao || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(categoria)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(categoria.id)}
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
      </div>
    </ErrorBoundary>
  );
}
