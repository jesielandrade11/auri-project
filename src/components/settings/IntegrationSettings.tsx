import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link2, Unlink, RefreshCw, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function IntegrationSettings() {
  const [syncing, setSyncing] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: integrations, isLoading, refetch } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("integrations")
        .select(`
          *,
          conta_bancaria:conta_bancaria_id(nome_banco, numero_conta)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleDisconnect = async (id: string) => {
    if (!confirm("Deseja realmente desconectar esta integração?")) return;

    try {
      const { error } = await supabase
        .from("integrations")
        .update({ status: 'disconnected' })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Integração desconectada",
        description: "A sincronização automática foi desativada",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Erro ao desconectar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSync = async (id: string) => {
    setSyncing(id);
    try {
      // Aqui você chamaria a API de sincronização
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulação

      await supabase
        .from("integrations")
        .update({ last_sync: new Date().toISOString() })
        .eq("id", id);

      toast({
        title: "Sincronização concluída!",
        description: "Dados atualizados com sucesso",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Erro na sincronização",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" />
            Desconectado
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Link2 className="h-4 w-4" />
        <AlertTitle>Integrações Ativas</AlertTitle>
        <AlertDescription>
          Gerencie as conexões com APIs bancárias. As integrações ativas sincronizam automaticamente suas transações.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Conexões Bancárias</CardTitle>
          <CardDescription>
            {integrations?.length || 0} integrações configuradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!integrations || integrations.length === 0 ? (
            <div className="text-center py-8">
              <Link2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhuma integração configurada ainda
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Vá em Contas Bancárias e clique em "API" para conectar
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta Bancária</TableHead>
                  <TableHead>Provedor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Sincronização</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrations.map((integration: any) => (
                  <TableRow key={integration.id}>
                    <TableCell className="font-medium">
                      {integration.conta_bancaria?.nome_banco || 'Conta removida'}
                      {integration.conta_bancaria?.numero_conta && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({integration.conta_bancaria.numero_conta})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {integration.provider}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(integration.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {integration.last_sync
                        ? new Date(integration.last_sync).toLocaleString('pt-BR')
                        : 'Nunca'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSync(integration.id)}
                          disabled={syncing === integration.id || integration.status !== 'connected'}
                        >
                          {syncing === integration.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(integration.id)}
                        >
                          <Unlink className="h-4 w-4" />
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
