import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useCategorization } from "@/hooks/useCategorization";
import { useCategories } from "@/hooks/useCategories";
import { Loader2, CheckCircle2, AlertCircle, Zap, Filter } from "lucide-react";

export default function Categorizacao() {
  const navigate = useNavigate();
  const { 
    transacoesNaoCategorizadas, 
    regrasCategorizacao, 
    isLoading, 
    categorizar, 
    categorizarLote, 
    aplicarCategorizacaoAutomatica,
    sugerirCategoria,
    isCategorizando,
    isCategorizandoLote
  } = useCategorization();
  
  const { categorias } = useCategories();
  
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [categorizacoes, setCategorizacoes] = useState<{ [key: string]: string }>({});

  const handleSelecionar = (id: string, checked: boolean) => {
    if (checked) {
      setSelecionadas([...selecionadas, id]);
    } else {
      setSelecionadas(selecionadas.filter(x => x !== id));
    }
  };

  const handleSelecionarTodas = (checked: boolean) => {
    if (checked) {
      setSelecionadas(transacoesNaoCategorizadas.map(t => t.id));
    } else {
      setSelecionadas([]);
    }
  };

  const handleCategorizar = (transacaoId: string, categoriaId: string) => {
    categorizar({ transacaoId, categoriaId });
  };

  const handleCategorizarSelecionadas = () => {
    const categorizacoesParaAplicar = selecionadas
      .map(id => ({
        transacaoId: id,
        categoriaId: categorizacoes[id]
      }))
      .filter(c => c.categoriaId);

    if (categorizacoesParaAplicar.length > 0) {
      categorizarLote(categorizacoesParaAplicar);
      setSelecionadas([]);
      setCategorizacoes({});
    }
  };

  const handleAplicarAutomatica = () => {
    aplicarCategorizacaoAutomatica();
  };

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
          <h1 className="text-3xl font-bold">Categorização Automática</h1>
          <p className="text-muted-foreground">
            Categorize transações automaticamente usando regras inteligentes
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleAplicarAutomatica}
            disabled={isCategorizandoLote}
          >
            <Zap className="h-4 w-4 mr-2" />
            Aplicar Automática
          </Button>
          <Button 
            onClick={handleCategorizarSelecionadas}
            disabled={selecionadas.length === 0 || isCategorizandoLote}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Categorizar Selecionadas ({selecionadas.length})
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Transações Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transacoesNaoCategorizadas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Regras Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{regrasCategorizacao.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categorias.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Transações */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Transações para Categorizar</CardTitle>
              <CardDescription>
                {transacoesNaoCategorizadas.length} transações aguardando categorização
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selecionadas.length === transacoesNaoCategorizadas.length && transacoesNaoCategorizadas.length > 0}
                onCheckedChange={handleSelecionarTodas}
              />
              <span className="text-sm text-muted-foreground">Selecionar todas</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Sugestão</TableHead>
                <TableHead>Confiança</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transacoesNaoCategorizadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Todas as transações estão categorizadas! 🎉
                  </TableCell>
                </TableRow>
              ) : (
                transacoesNaoCategorizadas.map((transacao) => {
                  const sugestao = sugerirCategoria(transacao.descricao, transacao.valor, transacao.tipo);
                  const categoriaSelecionada = categorizacoes[transacao.id];
                  
                  return (
                    <TableRow key={transacao.id}>
                      <TableCell>
                        <Checkbox
                          checked={selecionadas.includes(transacao.id)}
                          onCheckedChange={(checked) => handleSelecionar(transacao.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(transacao.data_transacao).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {transacao.descricao}
                        </div>
                      </TableCell>
                      <TableCell className={transacao.tipo === "receita" ? "text-green-600" : "text-red-600"}>
                        R$ {Number(transacao.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {sugestao ? (
                          <div className="flex items-center gap-2">
                            <span>{sugestao.nome}</span>
                            <Badge variant="outline" className="text-xs">
                              {sugestao.confianca * 100}%
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sugestao ? (
                          <div className="flex items-center gap-2">
                            <Progress value={sugestao.confianca * 100} className="w-16" />
                            <span className="text-xs text-muted-foreground">
                              {sugestao.confianca * 100}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={categoriaSelecionada || ""}
                          onValueChange={(value) => 
                            setCategorizacoes(prev => ({ ...prev, [transacao.id]: value }))
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Selecionar categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {categorias
                              .filter(c => c.tipo === transacao.tipo)
                              .map((categoria) => (
                                <SelectItem key={categoria.id} value={categoria.id}>
                                  {categoria.icone} {categoria.nome}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (categoriaSelecionada) {
                              handleCategorizar(transacao.id, categoriaSelecionada);
                            }
                          }}
                          disabled={!categoriaSelecionada || isCategorizando}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Regras de Categorização */}
      <Card>
        <CardHeader>
          <CardTitle>Regras de Categorização Ativas</CardTitle>
          <CardDescription>
            {regrasCategorizacao.length} regras configuradas para categorização automática
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {regrasCategorizacao.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma regra de categorização configurada
              </p>
            ) : (
              regrasCategorizacao.map((regra) => (
                <div key={regra.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{regra.descricao_padrao}</p>
                      <p className="text-sm text-muted-foreground">
                        → {regra.categoria?.nome} ({regra.categoria?.tipo})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {regra.confianca * 100}% confiança
                    </Badge>
                    <Badge variant={regra.ativo ? "default" : "secondary"}>
                      {regra.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}