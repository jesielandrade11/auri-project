import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getUserSettings, updateUserSettings, UserSettings } from "@/services/settingsService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

export function GeneralSettings() {
  const [settings, setSettings] = useState<Partial<UserSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getUserSettings();
      if (data) {
        setSettings(data);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar configurações",
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
      await updateUserSettings(settings);
      toast({
        title: "Configurações salvas!",
        description: "Suas preferências foram atualizadas com sucesso",
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
      {/* Idioma e Região */}
      <Card>
        <CardHeader>
          <CardTitle>Idioma e Região</CardTitle>
          <CardDescription>Configure idioma, fuso horário e moeda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="idioma">Idioma</Label>
              <Select
                value={settings.idioma || 'pt-BR'}
                onValueChange={(value) => setSettings({ ...settings, idioma: value })}
              >
                <SelectTrigger id="idioma">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="es-ES">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Fuso Horário</Label>
              <Select
                value={settings.timezone || 'America/Sao_Paulo'}
                onValueChange={(value) => setSettings({ ...settings, timezone: value })}
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                  <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                  <SelectItem value="America/Rio_Branco">Rio Branco (GMT-5)</SelectItem>
                  <SelectItem value="America/Noronha">Fernando de Noronha (GMT-2)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="moeda">Moeda</Label>
              <Select
                value={settings.moeda || 'BRL'}
                onValueChange={(value) => setSettings({ ...settings, moeda: value })}
              >
                <SelectTrigger id="moeda">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real (R$)</SelectItem>
                  <SelectItem value="USD">Dólar (US$)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formatos */}
      <Card>
        <CardHeader>
          <CardTitle>Formatos de Exibição</CardTitle>
          <CardDescription>Configure como datas, horas e números são exibidos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="formato-data">Formato de Data</Label>
              <Select
                value={settings.formato_data || 'DD/MM/YYYY'}
                onValueChange={(value) => setSettings({ ...settings, formato_data: value })}
              >
                <SelectTrigger id="formato-data">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">20/10/2025</SelectItem>
                  <SelectItem value="MM/DD/YYYY">10/20/2025</SelectItem>
                  <SelectItem value="YYYY-MM-DD">2025-10-20</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="formato-hora">Formato de Hora</Label>
              <Select
                value={settings.formato_hora || '24h'}
                onValueChange={(value) => setSettings({ ...settings, formato_hora: value })}
              >
                <SelectTrigger id="formato-hora">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">14:30 (24h)</SelectItem>
                  <SelectItem value="12h">2:30 PM (12h)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="casas-decimais">Casas Decimais</Label>
              <Select
                value={String(settings.casas_decimais || 2)}
                onValueChange={(value) => setSettings({ ...settings, casas_decimais: parseInt(value) })}
              >
                <SelectTrigger id="casas-decimais">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">R$ 1.500 (sem decimais)</SelectItem>
                  <SelectItem value="2">R$ 1.500,00</SelectItem>
                  <SelectItem value="4">R$ 1.500,0000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primeiro-dia">Primeiro Dia da Semana</Label>
              <Select
                value={String(settings.primeiro_dia_semana || 0)}
                onValueChange={(value) => setSettings({ ...settings, primeiro_dia_semana: parseInt(value) })}
              >
                <SelectTrigger id="primeiro-dia">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Domingo</SelectItem>
                  <SelectItem value="1">Segunda-feira</SelectItem>
                  <SelectItem value="6">Sábado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ano Fiscal */}
      <Card>
        <CardHeader>
          <CardTitle>Ano Fiscal</CardTitle>
          <CardDescription>Configure o período do seu ano fiscal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="mes-fiscal">Primeiro Mês do Ano Fiscal</Label>
            <Select
              value={String(settings.primeiro_mes_ano_fiscal || 1)}
              onValueChange={(value) => setSettings({ ...settings, primeiro_mes_ano_fiscal: parseInt(value) })}
            >
              <SelectTrigger id="mes-fiscal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Janeiro</SelectItem>
                <SelectItem value="2">Fevereiro</SelectItem>
                <SelectItem value="3">Março</SelectItem>
                <SelectItem value="4">Abril</SelectItem>
                <SelectItem value="7">Julho</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O ano fiscal começa em {new Date(2025, (settings.primeiro_mes_ano_fiscal || 1) - 1).toLocaleDateString('pt-BR', { month: 'long' })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Preferências do Dashboard</CardTitle>
          <CardDescription>Personalize sua experiência no dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dashboard-padrao">Dashboard Padrão</Label>
              <Select
                value={settings.dashboard_padrao || 'executive'}
                onValueChange={(value) => setSettings({ ...settings, dashboard_padrao: value })}
              >
                <SelectTrigger id="dashboard-padrao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="executive">Executivo (Completo)</SelectItem>
                  <SelectItem value="simple">Simples</SelectItem>
                  <SelectItem value="cashflow">Fluxo de Caixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodo-padrao">Período Padrão</Label>
              <Select
                value={settings.periodo_padrao_dashboard || 'mes_atual'}
                onValueChange={(value) => setSettings({ ...settings, periodo_padrao_dashboard: value })}
              >
                <SelectTrigger id="periodo-padrao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana_atual">Semana Atual</SelectItem>
                  <SelectItem value="mes_atual">Mês Atual</SelectItem>
                  <SelectItem value="trimestre_atual">Trimestre Atual</SelectItem>
                  <SelectItem value="ano_atual">Ano Atual</SelectItem>
                  <SelectItem value="ultimos_30_dias">Últimos 30 Dias</SelectItem>
                  <SelectItem value="ultimos_90_dias">Últimos 90 Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
