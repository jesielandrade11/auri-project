import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { Loader2, Plus, Pencil, Trash2, Tag } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { CascadeReportDialog } from "@/components/categories/CascadeReportDialog";


type Categoria = Tables<"categorias"> & {
  centro_custo?: {
    id: string;
    codigo: string;
    nome: string;
  } | null;
};
type CentroCusto = Tables<"centros_custo">;

export default function Categorias() {
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nome: "",
    tipo: "despesa" as "receita" | "despesa",
    dre_grupo: "",
    fixa_variavel: "",
    descricao: "",
    cor: "#EF4444",
    icone: "",
    centro_custo_id: "",
  });

  useEffect(() => {
    const init = async () => {
      await loadCentrosCusto();
      await loadCategorias();
    };
    init();
  }, []);

  const loadCategorias = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("categorias")
        .select(`
          *,
          centro_custo:centros_custo(id, codigo, nome)
        `)
        .eq("user_id", user.id)
        .order("tipo")
        .order("nome");

      if (error) throw error;
      setCategorias(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar categorias",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCentrosCusto = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("centros_custo")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("codigo");

      if (error) throw error;
      setCentrosCusto(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar centros de custo:", error);
    }
  };

  // Agrupar categorias por centro de custo
  const groupByCostCenter = (cats: Categoria[]) => {
    const grouped = new Map<string, { centroCusto: any; categorias: Categoria[] }>();

    cats.forEach((cat) => {
      if (!cat.centro_custo_id) return;

      const cc = centrosCusto.find((c) => c.id === cat.centro_custo_id);
      if (!cc) return;

      if (!grouped.has(cc.id)) {
        grouped.set(cc.id, { centroCusto: cc, categorias: [] });
      }
      grouped.get(cc.id)!.categorias.push(cat);
    });

    return Array.from(grouped.values()).sort((a, b) =>
      a.centroCusto.codigo.localeCompare(b.centroCusto.codigo)
    );
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      tipo: "despesa",
      dre_grupo: "",
      fixa_variavel: "",
      descricao: "",
      cor: "#EF4444",
      icone: "",
      centro_custo_id: "",
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
      centro_custo_id: categoria.centro_custo_id || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (editando) {
        const { error } = await supabase
          .from("categorias")
          .update({
            nome: formData.nome,
            tipo: formData.tipo,
            dre_grupo: formData.dre_grupo || null,
            fixa_variavel: formData.fixa_variavel || null,
            descricao: formData.descricao || null,
            cor: formData.cor,
            icone: formData.icone || null,
            centro_custo_id: formData.centro_custo_id,
          })

          .eq("id", editando.id);

        if (error) throw error;

        toast({
          title: "Categoria atualizada",
          description: "As alterações foram salvas com sucesso",
        });
      } else {
        const { error } = await supabase.from("categorias").insert({
          user_id: user.id,
          nome: formData.nome,
          tipo: formData.tipo,
          dre_grupo: formData.dre_grupo || null,
          fixa_variavel: formData.fixa_variavel || null,
          descricao: formData.descricao || null,
          cor: formData.cor,
          icone: formData.icone || null,
          ativo: true,
          centro_custo_id: formData.centro_custo_id,
        });

        if (error) throw error;

        toast({
          title: "Categoria criada",
          description: "Nova categoria adicionada com sucesso",
        });
      }

      setDialogOpen(false);
      resetForm();
      loadCategorias();

      // Invalidate report queries to auto-refresh cascade report
      queryClient.invalidateQueries({ queryKey: ["centros-custo-report"] });
      queryClient.invalidateQueries({ queryKey: ["categorias-report"] });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar categoria",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;

    try {
      const { error } = await supabase
        .from("categorias")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Categoria excluída",
        description: "A categoria foi desativada com sucesso",
      });

      loadCategorias();

      // Invalidate report queries to auto-refresh cascade report
      queryClient.invalidateQueries({ queryKey: ["centros-custo-report"] });
      queryClient.invalidateQueries({ queryKey: ["categorias-report"] });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir categoria",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const receitas = categorias.filter((c) => c.tipo === "receita" && c.ativo);
  const despesas = categorias.filter((c) => c.tipo === "despesa" && c.ativo);

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
          <h1 className="text-3xl font-bold">Categorias</h1>
          <p className="text-muted-foreground">
            Gerencie suas categorias de receitas e despesas
          </p>
        </div>
        <div className="flex gap-2">
          <CascadeReportDialog />
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
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    <Label htmlFor="centro_custo_id">Centro de Custo *</Label>
                    <Select
                      value={formData.centro_custo_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, centro_custo_id: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um centro de custo" />
                      </SelectTrigger>
                      <SelectContent>
                        {centrosCusto.map((cc) => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.codigo} - {cc.nome}
                          </SelectItem>
                        ))}
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
                <TableHead>Centro de Custo</TableHead>
                <TableHead>Grupo DRE</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receitas.map((categoria) => (
                <TableRow key={categoria.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{categoria.icone}</span>
                      <span className="font-medium">{categoria.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {categoria.centro_custo?.codigo} - {categoria.centro_custo?.nome || "-"}
                    </Badge>
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
              ))}
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
                <TableHead>Centro de Custo</TableHead>
                <TableHead>Grupo DRE</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>

            </TableHeader>
            <TableBody>
              {despesas.map((categoria) => (
                <TableRow key={categoria.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{categoria.icone}</span>
                      <span className="font-medium">{categoria.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {categoria.centro_custo?.codigo} - {categoria.centro_custo?.nome || "-"}
                    </Badge>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}


