import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { openFinanceService } from "@/services/openFinance";
import { useToast } from "@/hooks/use-toast";

declare global {
    interface Window {
        PluggyConnect: any;
    }
}

interface ConnectBankButtonProps {
    onConnect?: () => void;
}

export const ConnectBankButton = ({ onConnect, onItemConnected }: { onConnect?: () => void, onItemConnected?: (itemData: any) => Promise<void> }) => {
    const [loading, setLoading] = useState(false);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Check if script is loaded from index.html
        if (window.PluggyConnect) {
            setScriptLoaded(true);
        } else {
            // Fallback check interval
            const interval = setInterval(() => {
                if (window.PluggyConnect) {
                    setScriptLoaded(true);
                    clearInterval(interval);
                }
            }, 500);

            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(interval);
                if (!window.PluggyConnect) {
                    console.error("PluggyConnect not found on window");
                    toast({
                        title: "Erro",
                        description: "O componente de conexão não foi carregado corretamente. Tente recarregar a página.",
                        variant: "destructive",
                    });
                }
            }, 5000);

            return () => clearInterval(interval);
        }
    }, []);

    const handleConnect = async () => {
        if (!scriptLoaded) {
            toast({
                title: "Aguarde",
                description: "Carregando componente de conexão...",
            });
            return;
        }

        setLoading(true);
        try {
            console.log("Requesting Connect Token...");
            const accessToken = await openFinanceService.createConnectToken();
            console.log("Connect Token received:", accessToken ? "Yes" : "No");

            if (!accessToken || typeof accessToken !== 'string' || accessToken.length < 10) {
                console.error("Invalid access token received:", accessToken);
                throw new Error("Token de acesso inválido recebido do servidor.");
            }

            if (!window.PluggyConnect) {
                throw new Error("PluggyConnect library not loaded");
            }

            const pluggyConnect = new window.PluggyConnect({
                connectToken: accessToken,
                includeSandbox: true,
                onSuccess: async (itemData: any) => {
                    console.log("Item connected:", itemData);

                    if (onItemConnected) {
                        try {
                            await onItemConnected(itemData);
                            onConnect?.();
                        } catch (error) {
                            console.error("Error in onItemConnected callback:", error);
                            toast({
                                title: "Erro ao salvar",
                                description: "Conta conectada, mas houve erro ao salvar no sistema.",
                                variant: "destructive",
                            });
                        }
                    } else {
                        // Default behavior if no callback provided (legacy support)
                        toast({
                            title: "Conta conectada!",
                            description: "Sincronizando transações...",
                        });

                        try {
                            await openFinanceService.syncItem(itemData.item.id);
                            toast({
                                title: "Sincronização concluída!",
                                description: "Suas transações foram importadas com sucesso.",
                            });
                            onConnect?.();
                        } catch (error) {
                            console.error("Sync error:", error);
                            toast({
                                title: "Erro na sincronização",
                                description: "A conta foi conectada, mas houve um erro ao importar as transações.",
                                variant: "destructive",
                            });
                        }
                    }
                },
                onError: (error: any) => {
                    console.error("Pluggy Connect Error:", error);
                    toast({
                        title: "Erro na conexão",
                        description: `Erro Pluggy: ${error.message || JSON.stringify(error)}`,
                        variant: "destructive",
                    });
                },
                onClose: () => {
                    setLoading(false);
                },
            });

            pluggyConnect.init();

        } catch (error: any) {
            console.error("Error initializing Pluggy:", error);
            toast({
                title: "Erro ao iniciar conexão",
                description: error.message || "Não foi possível iniciar a conexão bancária.",
                variant: "destructive",
            });
            setLoading(false);
        }
    };

    return (
        <Button onClick={handleConnect} disabled={loading || !scriptLoaded}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Conectar Nova Conta
        </Button>
    );
};
