import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User, Mail, Building, Phone, MapPin } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  nome_completo?: string;
  nome_empresa?: string;
  documento_empresa?: string;
  telefone?: string;
  endereco?: string;
  avatar_url?: string;
}

export function UserProfile() {
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      setProfile({
        id: user.id,
        email: user.email,
        nome_completo: user.user_metadata?.nome_completo || '',
        nome_empresa: user.user_metadata?.nome_empresa || '',
        documento_empresa: user.user_metadata?.documento_empresa || '',
        telefone: user.user_metadata?.telefone || '',
        endereco: user.user_metadata?.endereco || '',
        avatar_url: user.user_metadata?.avatar_url || '',
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar perfil",
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
      const { error } = await supabase.auth.updateUser({
        data: {
          nome_completo: profile.nome_completo,
          nome_empresa: profile.nome_empresa,
          documento_empresa: profile.documento_empresa,
          telefone: profile.telefone,
          endereco: profile.endereco,
        }
      });

      if (error) throw error;

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar perfil",
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

  const initials = profile.nome_completo
    ? profile.nome_completo.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="space-y-6">
      {/* Avatar e Info Básica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil do Usuário
          </CardTitle>
          <CardDescription>Gerencie suas informações pessoais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{profile.nome_completo || 'Sem nome'}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {profile.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome-completo">Nome Completo</Label>
              <Input
                id="nome-completo"
                placeholder="Seu nome completo"
                value={profile.nome_completo || ''}
                onChange={(e) => setProfile({ ...profile, nome_completo: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                placeholder="(00) 00000-0000"
                value={profile.telefone || ''}
                onChange={(e) => setProfile({ ...profile, telefone: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações da Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Informações da Empresa
          </CardTitle>
          <CardDescription>Dados da sua empresa (opcional)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome-empresa">Nome da Empresa</Label>
              <Input
                id="nome-empresa"
                placeholder="Razão social"
                value={profile.nome_empresa || ''}
                onChange={(e) => setProfile({ ...profile, nome_empresa: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documento-empresa">CNPJ</Label>
              <Input
                id="documento-empresa"
                placeholder="00.000.000/0000-00"
                value={profile.documento_empresa || ''}
                onChange={(e) => setProfile({ ...profile, documento_empresa: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              placeholder="Rua, número, bairro, cidade - UF"
              value={profile.endereco || ''}
              onChange={(e) => setProfile({ ...profile, endereco: e.target.value })}
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
              Salvar Perfil
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
