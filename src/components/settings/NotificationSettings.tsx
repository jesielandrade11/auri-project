import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getNotificationSettings, updateNotificationSettings, NotificationSettings } from "@/services/settingsService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Bell, Mail, MessageSquare } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function NotificationSettingsComponent() {
  const [settings, setSettings] = useState<Partial<NotificationSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getNotificationSettings();
      if (data) {
        setSettings(data);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar notificações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNotificationSettings(settings);
      toast({
        title: "Notificações configuradas!",
        description: "Suas preferências foram salvas",
      });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Canais de Notificação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Canais de Notificação
          </CardTitle>
          <CardDescription>Escolha como deseja receber notificações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notif-email">Notificações por E-mail</Label>
              <p className="text-sm text-muted-foreground">
                Receba alertas e relatórios por e-mail
              </p>
            </div>
            <Switch
              id="notif-email"
              checked={settings.notificacoes_email ?? true}
              onCheckedChange={(checked) => setSettings({ ...settings, notificacoes_email: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notif-push">Notificações Push</Label>
              <p className="text-sm text-muted-foreground">
                Receba notificações no navegador
              </p>
            </div>
            <Switch
              id="notif-push"
              checked={settings.notificacoes_push ?? true}
              onCheckedChange={(checked) => setSettings({ ...settings, notificacoes_push: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notif-sistema">Notificações no Sistema</Label>
              <p className="text-sm text-muted-foreground">
                Mostrar alertas dentro do sistema
              </p>
            </div>
            <Switch
              id="notif-sistema"
              checked={settings.notificacoes_sistema ?? true}
              onCheckedChange={(checked) => setSettings({ ...settings, notificacoes_sistema: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Alertas Financeiros */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas Financeiros</CardTitle>
          <CardDescription>Configure alertas automáticos sobre sua situação financeira</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="alerta-saldo">Alerta de Saldo Baixo</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar quando o saldo estiver abaixo de:
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-32"
                  value={settings.alerta_saldo_baixo_valor || 1000}
                  onChange={(e) => setSettings({ ...settings, alerta_saldo_baixo_valor: parseFloat(e.target.value) })}
                  disabled={!settings.alerta_saldo_baixo}
                />
                <Switch
                  id="alerta-saldo"
                  checked={settings.alerta_saldo_baixo ?? true}
                  onCheckedChange={(checked) => setSettings({ ...settings, alerta_saldo_baixo: checked })}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="alerta-vencimento">Alerta de Vencimentos</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar com antecedência de:
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-24"
                  value={settings.alerta_vencimentos_dias || 3}
                  onChange={(e) => setSettings({ ...settings, alerta_vencimentos_dias: parseInt(e.target.value) })}
                  disabled={!settings.alerta_vencimentos}
                />
                <span className="text-sm text-muted-foreground">dias</span>
                <Switch
                  id="alerta-vencimento"
                  checked={settings.alerta_vencimentos ?? true}
                  onCheckedChange={(checked) => setSettings({ ...settings, alerta_vencimentos: checked })}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="alerta-orcamento">Alerta de Orçamento Excedido</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar quando atingir:
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-24"
                  value={settings.alerta_orcamento_percentual || 90}
                  onChange={(e) => setSettings({ ...settings, alerta_orcamento_percentual: parseInt(e.target.value) })}
                  disabled={!settings.alerta_orcamento_excedido}
                />
                <span className="text-sm text-muted-foreground">%</span>
                <Switch
                  id="alerta-orcamento"
                  checked={settings.alerta_orcamento_excedido ?? true}
                  onCheckedChange={(checked) => setSettings({ ...settings, alerta_orcamento_excedido: checked })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relatórios Automáticos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Relatórios Automáticos
          </CardTitle>
          <CardDescription>Receba relatórios financeiros periodicamente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="relatorio-diario">Relatório Diário</Label>
              <p className="text-sm text-muted-foreground">
                Resumo das movimentações do dia
              </p>
            </div>
            <Switch
              id="relatorio-diario"
              checked={settings.relatorio_diario ?? false}
              onCheckedChange={(checked) => setSettings({ ...settings, relatorio_diario: checked })}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="relatorio-semanal">Relatório Semanal</Label>
                <p className="text-sm text-muted-foreground">
                  Resumo semanal das finanças
                </p>
              </div>
              <Switch
                id="relatorio-semanal"
                checked={settings.relatorio_semanal ?? true}
                onCheckedChange={(checked) => setSettings({ ...settings, relatorio_semanal: checked })}
              />
            </div>
            {settings.relatorio_semanal && (
              <Select
                value={String(settings.dia_relatorio_semanal || 1)}
                onValueChange={(value) => setSettings({ ...settings, dia_relatorio_semanal: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Dia da semana" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Segunda-feira</SelectItem>
                  <SelectItem value="2">Terça-feira</SelectItem>
                  <SelectItem value="5">Sexta-feira</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="relatorio-mensal">Relatório Mensal</Label>
                <p className="text-sm text-muted-foreground">
                  Análise completa do mês
                </p>
              </div>
              <Switch
                id="relatorio-mensal"
                checked={settings.relatorio_mensal ?? true}
                onCheckedChange={(checked) => setSettings({ ...settings, relatorio_mensal: checked })}
              />
            </div>
            {settings.relatorio_mensal && (
              <Input
                type="number"
                min="1"
                max="28"
                value={settings.dia_relatorio_mensal || 1}
                onChange={(e) => setSettings({ ...settings, dia_relatorio_mensal: parseInt(e.target.value) })}
                placeholder="Dia do mês (1-28)"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* E-mails */}
      <Card>
        <CardHeader>
          <CardTitle>E-mails de Notificação</CardTitle>
          <CardDescription>Configure e-mails para diferentes tipos de notificação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-alertas">E-mail para Alertas</Label>
            <Input
              id="email-alertas"
              type="email"
              placeholder="seu@email.com"
              value={settings.email_alertas || ''}
              onChange={(e) => setSettings({ ...settings, email_alertas: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-relatorios">E-mail para Relatórios</Label>
            <Input
              id="email-relatorios"
              type="email"
              placeholder="relatorios@email.com"
              value={settings.email_relatorios || ''}
              onChange={(e) => setSettings({ ...settings, email_relatorios: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Notificações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
