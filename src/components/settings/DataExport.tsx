import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportData, downloadBlob, ExportOptions } from "@/services/settingsService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, FileDown, Table, FileSpreadsheet, FileJson } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function DataExport() {
  const [exporting, setExporting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    formato: 'csv',
    periodo: {
      inicio: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      fim: new Date().toISOString().split('T')[0],
    },
    incluir: {
      transacoes: true,
      categorias: true,
      centrosCusto: true,
      contrapartes: true,
      contas: true,
      budgets: true,
    },
  });
  const { toast } = useToast();

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportData(options);
      
      const extensao = options.formato;
      const dataAtual = new Date().toISOString().split('T')[0];
      const filename = `financeiro_export_${dataAtual}.${extensao}`;
      
      downloadBlob(blob, filename);
      
      toast({
        title: "Exportação concluída!",
        description: `Arquivo ${filename} baixado com sucesso`,
      });
    } catch (error: any) {
      toast({
        title: "Erro na exportação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const getFormatoIcon = (formato: string) => {
    switch (formato) {
      case 'csv':
        return <Table className="h-5 w-5" />;
      case 'xlsx':
        return <FileSpreadsheet className="h-5 w-5" />;
      case 'json':
        return <FileJson className="h-5 w-5" />;
      default:
        return <FileDown className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Formato */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Dados
          </CardTitle>
          <CardDescription>
            Faça backup ou exporte seus dados financeiros
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="formato">Formato de Exportação</Label>
            <Select
              value={options.formato}
              onValueChange={(value: any) => setOptions({ ...options, formato: value })}
            >
              <SelectTrigger id="formato">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <Table className="h-4 w-4" />
                    CSV (Excel)
                  </div>
                </SelectItem>
                <SelectItem value="xlsx">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    XLSX (Excel Avançado)
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    JSON (Completo)
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileDown className="h-4 w-4" />
                    PDF (Relatório)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Período */}
      <Card>
        <CardHeader>
          <CardTitle>Período</CardTitle>
          <CardDescription>Selecione o intervalo de datas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data-inicio">Data Inicial</Label>
              <Input
                id="data-inicio"
                type="date"
                value={options.periodo.inicio}
                onChange={(e) => setOptions({
                  ...options,
                  periodo: { ...options.periodo, inicio: e.target.value }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data-fim">Data Final</Label>
              <Input
                id="data-fim"
                type="date"
                value={options.periodo.fim}
                onChange={(e) => setOptions({
                  ...options,
                  periodo: { ...options.periodo, fim: e.target.value }
                })}
              />
            </div>
          </div>

          {/* Atalhos de Período */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const hoje = new Date();
                setOptions({
                  ...options,
                  periodo: {
                    inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0],
                    fim: hoje.toISOString().split('T')[0],
                  }
                });
              }}
            >
              Mês Atual
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const hoje = new Date();
                setOptions({
                  ...options,
                  periodo: {
                    inicio: new Date(hoje.getFullYear(), 0, 1).toISOString().split('T')[0],
                    fim: hoje.toISOString().split('T')[0],
                  }
                });
              }}
            >
              Ano Atual
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const hoje = new Date();
                const umAnoAtras = new Date(hoje);
                umAnoAtras.setFullYear(hoje.getFullYear() - 1);
                setOptions({
                  ...options,
                  periodo: {
                    inicio: umAnoAtras.toISOString().split('T')[0],
                    fim: hoje.toISOString().split('T')[0],
                  }
                });
              }}
            >
              Último Ano
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOptions({
                  ...options,
                  periodo: {
                    inicio: '2020-01-01',
                    fim: new Date().toISOString().split('T')[0],
                  }
                });
              }}
            >
              Tudo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dados a Incluir */}
      <Card>
        <CardHeader>
          <CardTitle>Dados a Incluir</CardTitle>
          <CardDescription>Selecione quais informações exportar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="incluir-transacoes"
              checked={options.incluir.transacoes}
              onCheckedChange={(checked) => setOptions({
                ...options,
                incluir: { ...options.incluir, transacoes: checked as boolean }
              })}
            />
            <Label htmlFor="incluir-transacoes" className="cursor-pointer">
              Transações (Receitas e Despesas)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="incluir-categorias"
              checked={options.incluir.categorias}
              onCheckedChange={(checked) => setOptions({
                ...options,
                incluir: { ...options.incluir, categorias: checked as boolean }
              })}
            />
            <Label htmlFor="incluir-categorias" className="cursor-pointer">
              Categorias
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="incluir-centros"
              checked={options.incluir.centrosCusto}
              onCheckedChange={(checked) => setOptions({
                ...options,
                incluir: { ...options.incluir, centrosCusto: checked as boolean }
              })}
            />
            <Label htmlFor="incluir-centros" className="cursor-pointer">
              Centros de Custo
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="incluir-contrapartes"
              checked={options.incluir.contrapartes}
              onCheckedChange={(checked) => setOptions({
                ...options,
                incluir: { ...options.incluir, contrapartes: checked as boolean }
              })}
            />
            <Label htmlFor="incluir-contrapartes" className="cursor-pointer">
              Clientes e Fornecedores
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="incluir-contas"
              checked={options.incluir.contas}
              onCheckedChange={(checked) => setOptions({
                ...options,
                incluir: { ...options.incluir, contas: checked as boolean }
              })}
            />
            <Label htmlFor="incluir-contas" className="cursor-pointer">
              Contas Bancárias
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="incluir-budgets"
              checked={options.incluir.budgets}
              onCheckedChange={(checked) => setOptions({
                ...options,
                incluir: { ...options.incluir, budgets: checked as boolean }
              })}
            />
            <Label htmlFor="incluir-budgets" className="cursor-pointer">
              Planejamentos (Budgets)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} variant="outline">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>

        <Button onClick={handleExport} disabled={exporting} className="flex-1">
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              {getFormatoIcon(options.formato)}
              <span className="ml-2">Exportar em {options.formato.toUpperCase()}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
