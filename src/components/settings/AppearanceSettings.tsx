import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { getUserSettings, updateUserSettings } from "@/services/settingsService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Palette, Sun, Moon, Monitor } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function AppearanceSettings() {
  const [settings, setSettings] = useState<any>({});
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
      
      // Aplicar tema
      if (settings.tema === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      toast({
        title: "Aparência atualizada!",
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

  const setTheme = (theme: string) => {
    setSettings({ ...settings, tema: theme });
    
    // Aplicar imediatamente
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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
      {/* Tema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Tema e Aparência
          </CardTitle>
          <CardDescription>Personalize a aparência do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tema</Label>
            <div className="grid grid-cols-3 gap-4">
              <Button
                variant={settings.tema === 'light' ? 'default' : 'outline'}
                className="flex flex-col h-auto py-4"
                onClick={() => setTheme('light')}
              >
                <Sun className="h-6 w-6 mb-2" />
                Claro
              </Button>
              <Button
                variant={settings.tema === 'dark' ? 'default' : 'outline'}
                className="flex flex-col h-auto py-4"
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-6 w-6 mb-2" />
                Escuro
              </Button>
              <Button
                variant={settings.tema === 'system' ? 'default' : 'outline'}
                className="flex flex-col h-auto py-4"
                onClick={() => setTheme('system')}
              >
                <Monitor className="h-6 w-6 mb-2" />
                Sistema
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferências de Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Preferências de Interface</CardTitle>
          <CardDescription>Ajuste a experiência visual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="modo-compacto">Modo Compacto</Label>
              <p className="text-sm text-muted-foreground">
                Reduz espaçamentos para mostrar mais informações
              </p>
            </div>
            <Switch
              id="modo-compacto"
              checked={settings.modo_compacto ?? false}
              onCheckedChange={(checked) => setSettings({ ...settings, modo_compacto: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="animacoes">Animações</Label>
              <p className="text-sm text-muted-foreground">
                Ativar animações e transições suaves
              </p>
            </div>
            <Switch
              id="animacoes"
              checked={settings.animacoes_habilitadas ?? true}
              onCheckedChange={(checked) => setSettings({ ...settings, animacoes_habilitadas: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="som">Sons de Notificação</Label>
              <p className="text-sm text-muted-foreground">
                Reproduzir som ao receber notificações
              </p>
            </div>
            <Switch
              id="som"
              checked={settings.som_notificacoes ?? false}
              onCheckedChange={(checked) => setSettings({ ...settings, som_notificacoes: checked })}
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
              Salvar Aparência
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
