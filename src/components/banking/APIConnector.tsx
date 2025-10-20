import { useState } from "react";
import { Link2, AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BankProvider, BankConnectionManager, mapearTransacoesAPI } from "@/services/bankingAPI";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface APIConnectorProps {
  contaId: string;
  nomeConta: string;
  onSuccess?: () => void;
}

export function APIConnector({ contaId, nomeConta, onSuccess }: APIConnectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [provider, setProvider] = useState<BankProvider>("pluggy");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { toast } = useToast();

  // Credenciais (em produção, usar vault/secrets manager)
  const [credentials, setCredentials] = useState({
    pluggy: { apiKey: "", clientId: "" },
    belvo: { secretId: "", secretPassword: "" },
    celcoin: { clientId: "", clientSecret: "" },
    openfinance: { apiKey: "" },
  });

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const manager = new BankConnectionManager();
      const creds = credentials[provider as keyof typeof credentials];

      // Testar conexão
      const isValid = await manager.testConnection(provider, creds);
      
      if (!isValid) {
        throw new Error("Credenciais inválidas");
      }

      // Salvar conexão
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      await manager.saveConnection(user.id, contaId, provider, creds);

      setConnected(true);
      toast({
        title: "Conta conectada!",
        description: `${nomeConta} foi conectado ao ${provider}`,
      });

      // Sincronizar automaticamente após conectar
      await handleSync();
    } catch (error: any) {
      toast({
        title: "Erro ao conectar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const manager = new BankConnectionManager();
      const creds = credentials[provider as keyof typeof credentials];

      // Buscar transações dos últimos 90 dias
      const dataFim = new Date();
      const dataInicio = new Date(dataFim);
      dataInicio.setDate(dataInicio.getDate() - 90);

      const transacoes = await manager.syncTransactions(
        contaId,
        provider,
        creds,
        dataInicio.toISOString().split("T")[0],
        dataFim.toISOString().split("T")[0]
      );

      // Mapear e inserir transações
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const transacoesParaInserir = mapearTransacoesAPI(transacoes, contaId, user.id);

      // Verificar duplicatas
      const { data: existentes } = await supabase
        .from("transacoes")
        .select("data_transacao, descricao, valor")
        .eq("user_id", user.id)
        .eq("conta_id", contaId)
        .gte("data_transacao", dataInicio.toISOString().split("T")[0]);

      const novas = transacoesParaInserir.filter(nova => {
        return !existentes?.some(existente =>
          existente.data_transacao === nova.data_transacao &&
          Math.abs(Number(existente.valor) - nova.valor) < 0.01
        );
      });

      if (novas.length > 0) {
        const { error } = await supabase
          .from("transacoes")
          .insert(novas);

        if (error) throw error;
      }

      // Atualizar última sincronização
      await supabase
        .from("contas_bancarias")
        .update({ 
          ultima_sincronizacao: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", contaId);

      setLastSync(new Date().toISOString());
      
      toast({
        title: "Sincronização concluída!",
        description: `${novas.length} novas transações importadas`,
      });

      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro na sincronização",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const renderPluggyForm = () => (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Pluggy</AlertTitle>
        <AlertDescription>
          Conecte sua conta bancária através do Pluggy para sincronização automática de transações.
          <a 
            href="https://pluggy.ai" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary underline ml-1"
          >
            Saiba mais
          </a>
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="pluggy-api-key">API Key</Label>
        <Input
          id="pluggy-api-key"
          type="password"
          placeholder="Digite sua API Key do Pluggy"
          value={credentials.pluggy.apiKey}
          onChange={(e) => setCredentials({
            ...credentials,
            pluggy: { ...credentials.pluggy, apiKey: e.target.value }
          })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pluggy-client-id">Client ID</Label>
        <Input
          id="pluggy-client-id"
          placeholder="Digite seu Client ID"
          value={credentials.pluggy.clientId}
          onChange={(e) => setCredentials({
            ...credentials,
            pluggy: { ...credentials.pluggy, clientId: e.target.value }
          })}
        />
      </div>
    </div>
  );

  const renderBelvoForm = () => (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Belvo</AlertTitle>
        <AlertDescription>
          Conecte através do Belvo para acesso a bancos da América Latina.
          <a 
            href="https://belvo.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary underline ml-1"
          >
            Saiba mais
          </a>
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="belvo-secret-id">Secret ID</Label>
        <Input
          id="belvo-secret-id"
          type="password"
          placeholder="Digite seu Secret ID do Belvo"
          value={credentials.belvo.secretId}
          onChange={(e) => setCredentials({
            ...credentials,
            belvo: { ...credentials.belvo, secretId: e.target.value }
          })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="belvo-secret-password">Secret Password</Label>
        <Input
          id="belvo-secret-password"
          type="password"
          placeholder="Digite seu Secret Password"
          value={credentials.belvo.secretPassword}
          onChange={(e) => setCredentials({
            ...credentials,
            belvo: { ...credentials.belvo, secretPassword: e.target.value }
          })}
        />
      </div>
    </div>
  );

  const renderCelcoinForm = () => (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Celcoin</AlertTitle>
        <AlertDescription>
          Integração com Celcoin para pagamentos e consultas bancárias.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="celcoin-client-id">Client ID</Label>
        <Input
          id="celcoin-client-id"
          placeholder="Digite seu Client ID do Celcoin"
          value={credentials.celcoin.clientId}
          onChange={(e) => setCredentials({
            ...credentials,
            celcoin: { ...credentials.celcoin, clientId: e.target.value }
          })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="celcoin-client-secret">Client Secret</Label>
        <Input
          id="celcoin-client-secret"
          type="password"
          placeholder="Digite seu Client Secret"
          value={credentials.celcoin.clientSecret}
          onChange={(e) => setCredentials({
            ...credentials,
            celcoin: { ...credentials.celcoin, clientSecret: e.target.value }
          })}
        />
      </div>
    </div>
  );

  const renderOpenFinanceForm = () => (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Open Finance Brasil</AlertTitle>
        <AlertDescription>
          Conecte através do Open Finance Brasil para acesso direto aos bancos participantes.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="openfinance-api-key">API Key</Label>
        <Input
          id="openfinance-api-key"
          type="password"
          placeholder="Digite sua API Key"
          value={credentials.openfinance.apiKey}
          onChange={(e) => setCredentials({
            ...credentials,
            openfinance: { ...credentials.openfinance, apiKey: e.target.value }
          })}
        />
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Integração com API Bancária</CardTitle>
            <CardDescription>
              Conecte sua conta para sincronização automática de transações
            </CardDescription>
          </div>
          {connected && (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Conectado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connected ? (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Link2 className="h-4 w-4 mr-2" />
                Conectar API Bancária
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Conectar {nomeConta}</DialogTitle>
                <DialogDescription>
                  Escolha um provedor e configure suas credenciais
                </DialogDescription>
              </DialogHeader>

              <Tabs value={provider} onValueChange={(v) => setProvider(v as BankProvider)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="pluggy">Pluggy</TabsTrigger>
                  <TabsTrigger value="belvo">Belvo</TabsTrigger>
                  <TabsTrigger value="celcoin">Celcoin</TabsTrigger>
                  <TabsTrigger value="openfinance">Open Finance</TabsTrigger>
                </TabsList>

                <TabsContent value="pluggy">{renderPluggyForm()}</TabsContent>
                <TabsContent value="belvo">{renderBelvoForm()}</TabsContent>
                <TabsContent value="celcoin">{renderCelcoinForm()}</TabsContent>
                <TabsContent value="openfinance">{renderOpenFinanceForm()}</TabsContent>
              </Tabs>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleConnect} 
                  disabled={connecting}
                  className="flex-1"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    "Conectar"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Provider: {provider.toUpperCase()}</p>
                <p className="text-xs text-muted-foreground">
                  Última sincronização: {lastSync 
                    ? new Date(lastSync).toLocaleString("pt-BR")
                    : "Nunca"
                  }
                </p>
              </div>
              <Button 
                onClick={handleSync} 
                disabled={syncing}
                size="sm"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sincronizar
                  </>
                )}
              </Button>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Sincronização Automática Ativa</AlertTitle>
              <AlertDescription>
                As transações serão sincronizadas automaticamente a cada 6 horas.
                Você também pode sincronizar manualmente clicando no botão acima.
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
}
