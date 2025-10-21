import { useState, useCallback } from "react";
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseArquivoBancario, detectarDuplicatas, validarTransacoes, TransacaoParsed } from "@/services/fileParser";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FileUploaderProps {
  contaId: string;
  onSuccess?: () => void;
}

export function FileUploader({ contaId, onSuccess }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [transacoesPrevisualizadas, setTransacoesPrevisualizadas] = useState<TransacaoParsed[]>([]);
  const [etapa, setEtapa] = useState<"upload" | "preview" | "concluido">("upload");
  const { toast } = useToast();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const extensao = selectedFile.name.split('.').pop()?.toLowerCase();
      if (!['ofx', 'csv', 'pdf'].includes(extensao || '')) {
        toast({
          title: "Formato inválido",
          description: "Selecione um arquivo OFX, CSV ou PDF",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setResultado(null);
      setEtapa("upload");
    }
  }, [toast]);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // 1. Parse do arquivo
      const resultado = await parseArquivoBancario(file);
      
      if (!resultado.sucesso) {
        toast({
          title: "Erro ao processar arquivo",
          description: resultado.erros[0] || "Não foi possível processar o arquivo",
          variant: "destructive",
        });
        setResultado(resultado);
        setUploading(false);
        return;
      }

      // 2. Validar transações
      const { validas, invalidas } = validarTransacoes(resultado.transacoes);
      
      if (invalidas.length > 0) {
        toast({
          title: "Transações inválidas encontradas",
          description: `${invalidas.length} transações foram ignoradas`,
          variant: "destructive",
        });
      }

      // 3. Buscar transações existentes para detectar duplicatas
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const dataInicio = validas.reduce((min, t) => 
        t.data < min ? t.data : min, validas[0]?.data || ''
      );
      const dataFim = validas.reduce((max, t) => 
        t.data > max ? t.data : max, validas[0]?.data || ''
      );

      const { data: transacoesExistentes } = await supabase
        .from("transacoes")
        .select("data_transacao, descricao, valor")
        .eq("user_id", user.id)
        .eq("conta_id", contaId)
        .gte("data_transacao", dataInicio)
        .lte("data_transacao", dataFim);

      const { unicas, duplicatas } = detectarDuplicatas(validas, transacoesExistentes || []);

      setResultado({
        ...resultado,
        transacoesValidas: validas.length,
        transacoesInvalidas: invalidas.length,
        transacoesUnicas: unicas.length,
        duplicatas: duplicatas.length,
      });

      setTransacoesPrevisualizadas(unicas);
      setEtapa("preview");

      if (unicas.length === 0) {
        toast({
          title: "Nenhuma transação nova",
          description: "Todas as transações já foram importadas anteriormente",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmarImportacao = async () => {
    if (transacoesPrevisualizadas.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Inserir transações
      const transacoesParaInserir = transacoesPrevisualizadas.map(t => ({
        user_id: user.id,
        conta_id: contaId,
        data_transacao: t.data,
        descricao: t.descricao,
        valor: t.valor,
        tipo: t.tipo,
        origem: "importacao",
        status: "pago",
        conciliado: true,
        numero_documento: t.numeroDocumento,
      }));

      const { error } = await supabase
        .from("transacoes")
        .insert(transacoesParaInserir);

      if (error) throw error;

      toast({
        title: "Importação concluída!",
        description: `${transacoesParaInserir.length} transações importadas com sucesso`,
      });

      setEtapa("concluido");
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro ao importar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetar = () => {
    setFile(null);
    setResultado(null);
    setTransacoesPrevisualizadas([]);
    setEtapa("upload");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar Extrato Bancário</CardTitle>
        <CardDescription>
          Faça upload de arquivos OFX, CSV ou PDF do seu banco
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Etapa 1: Upload */}
        {etapa === "upload" && (
          <>
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
              <input
                type="file"
                accept=".ofx,.csv,.pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-2">
                  {file ? file.name : "Clique para selecionar ou arraste o arquivo"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: OFX, CSV, PDF (até 10MB)
                </p>
              </label>
            </div>

            {file && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Processar Arquivo"
                  )}
                </Button>
              </div>
            )}

            {resultado && resultado.erros.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erros encontrados</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2">
                    {resultado.erros.map((erro: string, i: number) => (
                      <li key={i} className="text-sm">{erro}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {resultado && resultado.avisos.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Avisos</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2">
                    {resultado.avisos.map((aviso: string, i: number) => (
                      <li key={i} className="text-sm">{aviso}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Etapa 2: Preview */}
        {etapa === "preview" && (
          <>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Arquivo processado com sucesso!</AlertTitle>
              <AlertDescription>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>Total de transações: <strong>{resultado.metadata.total}</strong></div>
                  <div>Novas: <strong className="text-green-600">{resultado.transacoesUnicas}</strong></div>
                  <div>Duplicadas: <strong className="text-amber-600">{resultado.duplicatas}</strong></div>
                  <div>Inválidas: <strong className="text-red-600">{resultado.transacoesInvalidas}</strong></div>
                </div>
              </AlertDescription>
            </Alert>

            <div>
              <h3 className="font-semibold mb-2">Preview das Transações ({transacoesPrevisualizadas.length})</h3>
              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transacoesPrevisualizadas.slice(0, 50).map((t, i) => (
                      <TableRow key={i}>
                        <TableCell>{new Date(t.data).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="max-w-xs truncate">{t.descricao}</TableCell>
                        <TableCell>
                          <Badge variant={t.tipo === "receita" ? "default" : "destructive"}>
                            {t.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right ${t.tipo === "receita" ? "text-green-600" : "text-red-600"}`}>
                          R$ {t.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {transacoesPrevisualizadas.length > 50 && (
                  <p className="text-sm text-muted-foreground text-center p-2">
                    + {transacoesPrevisualizadas.length - 50} transações...
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetar}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmarImportacao} 
                disabled={uploading || transacoesPrevisualizadas.length === 0}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  `Confirmar Importação (${transacoesPrevisualizadas.length} transações)`
                )}
              </Button>
            </div>
          </>
        )}

        {/* Etapa 3: Concluído */}
        {etapa === "concluido" && (
          <>
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Importação concluída!</AlertTitle>
              <AlertDescription>
                As transações foram importadas e estão disponíveis na sua conta.
              </AlertDescription>
            </Alert>
            <Button onClick={resetar} className="w-full">
              Importar Novo Arquivo
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
