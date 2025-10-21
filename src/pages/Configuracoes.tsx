import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Download, 
  Link2, 
  Palette,
  FileText,
  Trash2,
  RotateCcw
} from "lucide-react";
import { UserProfile } from "@/components/settings/UserProfile";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { NotificationSettingsComponent } from "@/components/settings/NotificationSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { DataExport } from "@/components/settings/DataExport";
import { IntegrationSettings } from "@/components/settings/IntegrationSettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { useToast } from "@/hooks/use-toast";
import { resetToDefault, clearCache, getImportLogs, getAuditLogs } from "@/services/settingsService";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState("geral");
  const { toast } = useToast();

  const { data: userData } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: importLogs } = useQuery({
    queryKey: ["import-logs"],
    queryFn: getImportLogs,
  });

  const handleResetSettings = async () => {
    if (!confirm("Tem certeza que deseja resetar todas as configurações para os valores padrão?")) {
      return;
    }

    try {
      await resetToDefault();
      toast({
        title: "Configurações resetadas!",
        description: "Todas as configurações voltaram aos valores padrão",
      });
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Erro ao resetar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleClearCache = async () => {
    try {
      await clearCache();
      toast({
        title: "Cache limpo!",
        description: "Dados temporários foram removidos",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao limpar cache",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Configurações
          </h1>
          <p className="text-muted-foreground">
            Gerencie preferências, notificações e integrações do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Histórico
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Histórico de Importações</DialogTitle>
                <DialogDescription>
                  Últimas importações de arquivos e sincronizações
                </DialogDescription>
              </DialogHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Importadas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importLogs?.slice(0, 20).map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {log.tipo}
                          {log.formato && ` (${log.formato})`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.conta_bancaria?.nome_banco || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.status === 'success'
                              ? 'default'
                              : log.status === 'error'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {log.transacoes_importadas || 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handleClearCache}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Cache
          </Button>
          <Button variant="destructive" size="sm" onClick={handleResetSettings}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetar
          </Button>
        </div>
      </div>

      {/* Informações do Usuário */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{userData?.email}</h3>
              <p className="text-sm text-muted-foreground">
                Conta criada em {userData?.created_at ? new Date(userData.created_at).toLocaleDateString('pt-BR') : '-'}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs de Configurações */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="perfil" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Segurança</span>
          </TabsTrigger>
          <TabsTrigger value="aparencia" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Aparência</span>
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Integrações</span>
          </TabsTrigger>
          <TabsTrigger value="exportar" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-6">
          <UserProfile />
        </TabsContent>

        <TabsContent value="geral" className="mt-6">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="notificacoes" className="mt-6">
          <NotificationSettingsComponent />
        </TabsContent>

        <TabsContent value="seguranca" className="mt-6">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="aparencia" className="mt-6">
          <AppearanceSettings />
        </TabsContent>

        <TabsContent value="integracoes" className="mt-6">
          <IntegrationSettings />
        </TabsContent>

        <TabsContent value="exportar" className="mt-6">
          <DataExport />
        </TabsContent>
      </Tabs>

      {/* Informações do Sistema */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-muted-foreground">Informações do Sistema</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Versão</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-muted-foreground">Build</p>
              <p className="font-medium">2025.10.20</p>
            </div>
            <div>
              <p className="text-muted-foreground">Ambiente</p>
              <p className="font-medium capitalize">{import.meta.env.MODE}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Região</p>
              <p className="font-medium">{settings.timezone || 'America/Sao_Paulo'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
