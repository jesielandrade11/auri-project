import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PluggyAuthPage() {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleConnect = async () => {
        setLoading(true);
        toast({ title: "Pluggy integration placeholder", description: "Connect flow not implemented yet." });
        setLoading(false);
    };

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-3xl font-bold">Conectar Conta Pluggy</h1>
            <p className="text-muted-foreground">Clique no botão abaixo para iniciar a autenticação com a Pluggy.</p>
            <Button onClick={handleConnect} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Conectar Nova Conta
            </Button>
        </div>
    );
}
