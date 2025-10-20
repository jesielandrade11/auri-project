import { useState } from "react";
import { useCostCenters } from "@/hooks/useCostCenters";
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

interface CentroCusto {
  id: string;
  codigo: string;
  nome: string;
  tipo: string | null;
  orcamento_mensal: number | null;
  ativo: boolean;
  created_at: string;
}

export default function CentrosCusto() {
  const { toast } = useToast();
  const { 
    centrosCusto, 
    isLoading, 
    createCostCenter, 
    updateCostCenter, 
    deleteCostCenter 
  } = useCostCenters();
  
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    codigo: "",
    nome: "",
    tipo: "operacional",
    orcamento_mensal: "",
    ativo: true,
  });


  const resetForm = () => {
    setFormData({
      codigo: "",
      nome: "",
      tipo: "operacional",
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
      orcamento_mensal: centro.orcamento_mensal?.toString() || "",
      ativo: centro.ativo,
    });
    setEditingId(centro.id);
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const dadosCentro = {
      codigo: formData.codigo,
      nome: formData.nome,
      tipo: formData.tipo,
      orcamento_mensal: formData.orcamento_mensal ? parseFloat(formData.orcamento_mensal) : null,
      ativo: formData.ativo,
    };
    
    if (editingId) {
      updateCostCenter({ id: editingId, dados: dadosCentro });
    } else {
      createCostCenter(dadosCentro);
    }
    
    setOpen(false);
    resetForm();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Centros de Custo</h1>
          <p className="text-muted-foreground">Gerencie os centros de custo da empresa</p>
        </div>
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
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operacional">Operacional</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                  </SelectContent>
                </Select>
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
                <Button type="submit">
                  {editingId ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Orçamento Mensal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centrosCusto?.map((centro) => (
                  <TableRow key={centro.id}>
                    <TableCell>{centro.codigo}</TableCell>
                    <TableCell className="font-medium">{centro.nome}</TableCell>
                    <TableCell className="capitalize">{centro.tipo}</TableCell>
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
                              deleteCostCenter(centro.id);
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
