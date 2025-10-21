import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUserSettings, updateUserSettings } from "@/services/settingsService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Shield, Key, Lock } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export function SecuritySettings() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
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
        title: "Configurações de segurança salvas!",
        description: "Suas preferências foram atualizadas",
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

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e a confirmação devem ser iguais",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.new.length < 8) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter no mínimo 8 caracteres",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new,
      });

      if (error) throw error;

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso",
      });

      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
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
      {/* Autenticação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Autenticação e Acesso
          </CardTitle>
          <CardDescription>Configure a segurança da sua conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="2fa">Autenticação de Dois Fatores (2FA)</Label>
              <p className="text-sm text-muted-foreground">
                Adicione uma camada extra de segurança
              </p>
            </div>
            <Switch
              id="2fa"
              checked={settings.autenticacao_dois_fatores ?? false}
              onCheckedChange={(checked) => setSettings({ ...settings, autenticacao_dois_fatores: checked })}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="sessao">Tempo de Expiração da Sessão</Label>
            <div className="flex items-center gap-2">
              <Input
                id="sessao"
                type="number"
                min="30"
                max="1440"
                value={settings.sessao_expira_minutos || 480}
                onChange={(e) => setSettings({ ...settings, sessao_expira_minutos: parseInt(e.target.value) })}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">minutos</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Atual: {Math.floor((settings.sessao_expira_minutos || 480) / 60)} horas
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="senha-acoes">Exigir Senha em Ações Críticas</Label>
              <p className="text-sm text-muted-foreground">
                Solicitar senha ao excluir ou exportar dados
              </p>
            </div>
            <Switch
              id="senha-acoes"
              checked={settings.exigir_senha_acoes_criticas ?? true}
              onCheckedChange={(checked) => setSettings({ ...settings, exigir_senha_acoes_criticas: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Alterar Senha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
          <CardDescription>Mantenha sua conta segura com uma senha forte</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nova-senha">Nova Senha</Label>
            <Input
              id="nova-senha"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={passwordData.new}
              onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmar-senha">Confirmar Nova Senha</Label>
            <Input
              id="confirmar-senha"
              type="password"
              placeholder="Digite novamente"
              value={passwordData.confirm}
              onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
            />
          </div>

          <Button 
            onClick={handleChangePassword}
            disabled={changingPassword || !passwordData.new || !passwordData.confirm}
          >
            {changingPassword ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Alterando...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Alterar Senha
              </>
            )}
          </Button>
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
              Salvar Segurança
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
