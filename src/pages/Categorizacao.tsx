import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle, XCircle, Tag } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Transacao = Tables<"transacoes">;
type Categoria = Tables<"categorias">;
type CentroCusto = Tables<"centros_custo">;

interface TransacaoComClassificacao extends Transacao {
  categoria_sugerida?: string;
  centro_custo_sugerido?: string;
  confianca?: number;
  selecionada?: boolean;
}

export default function Categorizacao() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transacoes, setTransacoes] = useState<TransacaoComClassificacao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Buscar transações não categorizadas
      const { data: transacoesData, error: transacoesError } = await supabase
        .from("transacoes")
        .select("*")
        .eq("user_id", user.id)
        .is("categoria_id", null)
        .order("data_transacao", { ascending: false })
        .limit(50);

      if (transacoesError) throw transacoesError;

      // Buscar categorias ativas
      const { data: categoriasData, error: categoriasError } = await supabase
        .from("categorias")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("nome");

      if (categoriasError) throw categoriasError;

      // Buscar centros de custo ativos
      const { data: centrosData, error: centrosError } = await supabase
        .from("centros_custo")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("nome");

      if (centrosError) throw centrosError;

      setTransacoes(transacoesData || []);
      setCategorias(categoriasData || []);
      setCentrosCusto(centrosData || []);
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

  const toggleSelection = (id: string) => {
    setTransacoes(prev =>
      prev.map(t => t.id === id ? { ...t, selecionada: !t.selecionada } : t)
    );
  };

  const toggleAll = () => {
    const todasSelecionadas = transacoes.every(t => t.selecionada);
    setTransacoes(prev =>
      prev.map(t => ({ ...t, selecionada: !todasSelecionadas }))
    );
  };

  const updateCategoria = (id: string, categoria_id: string) => {
    setTransacoes(prev =>
      prev.map(t => t.id === id ? { ...t, categoria_sugerida: categoria_id } : t)
    );
  };

  const updateCentroCusto = (id: string, centro_custo_id: string) => {
    setTransacoes(prev =>
      prev.map(t => t.id === id ? { ...t, centro_custo_sugerido: centro_custo_id } : t)
    );
  };

  const salvarClassificacoes = async () => {
    try {
      setSaving(true);
      const selecionadas = transacoes.filter(t => t.selecionada);

      if (selecionadas.length === 0) {
        toast({
          title: "Nenhuma transação selecionada",
          description: "Selecione ao menos uma transação para classificar",
          variant: "destructive",
        });
        return;
      }

      // Validar se todas as selecionadas têm categoria
      const semCategoria = selecionadas.filter(t => !t.categoria_sugerida);
      if (semCategoria.length > 0) {
        toast({
          title: "Classificação incompleta",
          description: "Todas as transações selecionadas precisam ter uma categoria",
          variant: "destructive",
        });
        return;
      }

      // Atualizar transações
      const updates = selecionadas.map(t =>
        supabase
          .from("transacoes")
          .update({
            categoria_id: t.categoria_sugerida,
            centro_custo_id: t.centro_custo_sugerido || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", t.id)
      );

      await Promise.all(updates);

      toast({
        title: "Classificações salvas",
        description: `${selecionadas.length} transação(ões) classificada(s) com sucesso`,
      });

      // Recarregar dados
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const selecionadas = transacoes.filter(t => t.selecionada).length;

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
          <h1 className="text-3xl font-bold">Categorização</h1>
          <p className="text-muted-foreground">
            Classifique transações não categorizadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/categorias")}>
            <Tag className="h-4 w-4 mr-2" />
            Gerenciar Categorias
          </Button>
          <Button
            onClick={salvarClassificacoes}
            disabled={selecionadas === 0 || saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Salvar {selecionadas > 0 && `(${selecionadas})`}
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Não Categorizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transacoes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Selecionadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selecionadas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Categorias Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categorias.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Transações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transações Pendentes</CardTitle>
              <CardDescription>
                Selecione e classifique as transações
              </CardDescription>
            </div>
            {transacoes.length > 0 && (
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {transacoes.every(t => t.selecionada) ? "Desmarcar Todas" : "Selecionar Todas"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {transacoes.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Tudo em dia!</p>
              <p className="text-muted-foreground">
                Não há transações pendentes de categorização
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transacoes.map((transacao) => (
                <div
                  key={transacao.id}
                  className={`p-4 rounded-lg border ${transacao.selecionada
                      ? "border-primary bg-accent/50"
                      : "border-border hover:border-muted-foreground/50"
                    } transition-colors`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <Checkbox
                      checked={transacao.selecionada || false}
                      onCheckedChange={() => toggleSelection(transacao.id)}
                      className="mt-1"
                    />

                    {/* Info da Transação */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{transacao.descricao}</p>
                          {(transacao as any).contraparte && (
                            <p className="text-sm text-muted-foreground italic">
                              {(transacao as any).contraparte}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {new Date(transacao.data_transacao).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${transacao.tipo === "receita"
                              ? "text-success"
                              : "text-danger"
                            }`}>
                            {transacao.tipo === "receita" ? "+" : "-"}
                            R$ {Number(transacao.valor).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          <Badge variant={transacao.tipo === "receita" ? "default" : "destructive"}>
                            {transacao.tipo}
                          </Badge>
                        </div>
                      </div>

                      {/* Selects de Classificação */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            Categoria *
                          </label>
                          <Select
                            value={transacao.categoria_sugerida || ""}
                            onValueChange={(value) => updateCategoria(transacao.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {categorias
                                .filter(c => c.tipo === transacao.tipo)
                                .map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.nome}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            Centro de Custo
                          </label>
                          <Select
                            value={transacao.centro_custo_sugerido || ""}
                            onValueChange={(value) => updateCentroCusto(transacao.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione (opcional)" />
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
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
