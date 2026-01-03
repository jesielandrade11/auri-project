import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tag, Settings as SettingsIcon } from "lucide-react";
import { CategoryMigrationDialog } from "@/components/categories/CategoryMigrationDialog";

export default function Configuracoes() {
    const [loading, setLoading] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);
    const [hasTransactions, setHasTransactions] = useState(false);
    const { toast } = useToast();

    const checkExistingTransactions = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const { count, error } = await supabase
                .from("transacoes")
                .select("*", { count: 'exact', head: true })
                .eq("user_id", user.id);

            if (error) throw error;

            const hasData = (count || 0) > 0;
            setHasTransactions(hasData);
            return hasData;
        } catch (error: any) {
            console.error("Erro ao verificar transações:", error);
            return false;
        }
    };

    const handleInstallClick = async () => {
        const hasData = await checkExistingTransactions();

        if (hasData) {
            setMigrationDialogOpen(true);
        } else {
            setConfirmDialogOpen(true);
        }
    };

    const handleInstallDefault = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { error } = await supabase.rpc('install_restructured_model' as any, {
                target_user_id: user.id
            });

            if (error) throw error;

            toast({
                title: "Sucesso",
                description: "Categorias padrão instaladas com sucesso!",
            });
        } catch (error: any) {
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <SettingsIcon className="h-8 w-8" />
                    Configurações
                </h1>
                <p className="text-muted-foreground">
                    Gerencie as configurações do sistema
                </p>
            </div>

            {/* Categorias e Centros de Custo */}
            <Card>
                <CardHeader>
                    <CardTitle>Categorias e Centros de Custo</CardTitle>
                    <CardDescription>
                        Gerencie a estrutura de categorias e centros de custo do sistema
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Instalar Categorias Padrão</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Instale um modelo padrão com 13 Centros de Custo e mais de 60 Categorias
                            organizadas para pequenas e médias empresas.
                        </p>
                        <Button
                            variant="outline"
                            onClick={handleInstallClick}
                            disabled={loading}
                        >
                            <Tag className="h-4 w-4 mr-2" />
                            {loading ? "Instalando..." : "Instalar Padrão"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Confirmation Dialog */}
            <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>⚠️ Atenção: Esta ação irá substituir seus dados</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p className="font-semibold text-foreground">
                                Ao instalar as categorias padrão, os seguintes dados serão DELETADOS:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                <li>Todas as suas <strong>Transações</strong></li>
                                <li>Todos os seus <strong>Orçamentos (Budgets)</strong></li>
                                <li>Todas as suas <strong>Categorias</strong> atuais</li>
                                <li>Todos os seus <strong>Centros de Custo</strong> atuais</li>
                            </ul>
                            <p className="text-destructive font-semibold">
                                ⚠️ Esta ação NÃO pode ser desfeita!
                            </p>
                            <p>
                                Novos Centros de Custo (13) e Categorias (60+) serão criados com base no modelo padrão para PMEs.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Recomendamos fazer backup dos seus dados antes de continuar.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleInstallDefault}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Sim, substituir meus dados
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Migration Dialog */}
            <CategoryMigrationDialog
                open={migrationDialogOpen}
                onOpenChange={setMigrationDialogOpen}
                onMigrationComplete={() => {
                    toast({
                        title: "Migração concluída",
                        description: "Categorias instaladas e transações migradas com sucesso!",
                    });
                }}
            />
        </div>
    );
}
