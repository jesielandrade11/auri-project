import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, File, Database, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Importacao() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [contaBancariaId, setContaBancariaId] = useState("");
  const [contas, setContas] = useState<any[]>([]);

  useEffect(() => {
    carregarContas();
  }, []);

  const carregarContas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("contas_bancarias")
        .select("*")
        .eq("user_id", user.id)
        .order("nome_banco");
      
      if (error) {
        console.error("Erro ao carregar contas:", error);
        toast({
          title: "Erro ao carregar contas",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      
      if (data) setContas(data);
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArquivo(e.target.files[0]);
    }
  };

  const getTipoArquivo = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'csv') return 'csv';
    if (ext === 'ofx') return 'ofx';
    if (ext === 'pdf') return 'pdf';
    throw new Error('Tipo de arquivo não suportado. Use CSV, OFX ou PDF.');
  };

  const handleImportar = async () => {
    if (!arquivo || !contaBancariaId) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo e uma conta bancária",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Obter usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const tipoArquivo = getTipoArquivo(arquivo.name);
      
      // Criar registro de importação com user_id
      const { data: importacao, error: importError } = await supabase
        .from("importacoes")
        .insert([{
          user_id: user.id,
          tipo_arquivo: tipoArquivo,
          nome_arquivo: arquivo.name,
          conta_bancaria_id: contaBancariaId,
          status: 'processando'
        }])
        .select()
        .single();

      if (importError) throw importError;

      // Ler conteúdo do arquivo
      const conteudo = await arquivo.text();

      // Chamar edge function para processar
      const { data, error } = await supabase.functions.invoke('processar-importacao', {
        body: {
          importacaoId: importacao.id,
          tipoArquivo,
          conteudo
        }
      });

      if (error) throw error;

      toast({
        title: "Importação concluída",
        description: `${data.importadas} de ${data.total} transações importadas com sucesso`,
      });

      navigate("/transacoes");
    } catch (error: any) {
      console.error("Erro na importação:", error);
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Importação de Dados</h1>
          <p className="text-muted-foreground">
            Importe extratos bancários em PDF, CSV ou OFX
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importar Arquivo
              </CardTitle>
              <CardDescription>
                Envie extratos bancários para criar transações automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="conta">Conta Bancária</Label>
                <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {contas.length === 0 ? (
                      <SelectItem value="sem-contas" disabled>
                        Nenhuma conta cadastrada
                      </SelectItem>
                    ) : (
                      contas.map((conta) => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {conta.nome_banco} {conta.agencia && conta.conta ? `- ${conta.agencia}/${conta.conta}` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="arquivo">Arquivo</Label>
                <Input
                  id="arquivo"
                  type="file"
                  accept=".csv,.ofx,.pdf"
                  onChange={handleFileChange}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: CSV, OFX, PDF
                </p>
              </div>

              {arquivo && (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    Arquivo selecionado: {arquivo.name} ({(arquivo.size / 1024).toFixed(2)} KB)
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleImportar} 
                disabled={loading || !arquivo || !contaBancariaId}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                APIs Bancárias
              </CardTitle>
              <CardDescription>
                Conecte-se diretamente ao seu banco (em breve)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  A integração com APIs bancárias estará disponível em breve. 
                  Suportaremos Open Banking e conexões diretas com principais bancos.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <p className="text-sm font-medium">Bancos planejados:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Banco do Brasil</li>
                  <li>• Bradesco</li>
                  <li>• Itaú</li>
                  <li>• Santander</li>
                  <li>• Caixa Econômica</li>
                  <li>• Nubank</li>
                  <li>• Inter</li>
                </ul>
              </div>

              <Button disabled className="w-full">
                Conectar Banco (Em breve)
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Formatos de Arquivo</CardTitle>
            <CardDescription>
              Entenda os formatos suportados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4" />
                  <h3 className="font-medium">CSV</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Formato: data,descricao,valor,tipo
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4" />
                  <h3 className="font-medium">OFX</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Padrão Open Financial Exchange usado por bancos
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <h3 className="font-medium">PDF</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Extratos em PDF processados com IA
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}