import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Loader2, UserCheck, Pencil, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface PendingContraparte {
    id: string;
    nome: string;
    papel: string;
    documento: string | null;
    created_at: string;
}

export function PendingContrapartesPanel() {
    const [pending, setPending] = useState<PendingContraparte[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editRole, setEditRole] = useState("");
    const { toast } = useToast();

    const availableRoles = ['cliente', 'fornecedor', 'empresa', 'titular', 'ambos'];

    useEffect(() => {
        loadPending();
    }, []);

    const loadPending = async () => {
        try {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Load contrapartes that have no transactions linked (pending review)
            const { data, error } = await supabase
                .from("contrapartes")
                .select("id, nome, papel, documento, created_at")
                .eq("user_id", user.id)
                .eq("ativo", true)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;
            
            // Filter to show only recently created contrapartes (last 7 days) as "pending"
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const recentContrapartes = (data || []).filter(c => 
                new Date(c.created_at || '') > sevenDaysAgo
            );
            
            setPending(recentContrapartes as PendingContraparte[]);
        } catch (error) {
            console.error("Erro ao carregar contrapartes pendentes:", error);
            toast({
                title: "Erro ao carregar",
                description: "Não foi possível carregar as contrapartes.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelected(pending.map((p) => p.id));
        } else {
            setSelected([]);
        }
    };

    const handleSelect = (id: string, checked: boolean) => {
        if (checked) {
            setSelected((prev) => [...prev, id]);
        } else {
            setSelected((prev) => prev.filter((item) => item !== id));
        }
    };

    const startEditing = (item: PendingContraparte) => {
        setEditingId(item.id);
        setEditName(item.nome);
        setEditRole(item.papel);
    };

    const saveEdit = async (id: string) => {
        try {
            const { error } = await supabase
                .from("contrapartes")
                .update({ nome: editName, papel: editRole })
                .eq("id", id);

            if (error) throw error;

            setPending(pending.map(p => p.id === id ? { ...p, nome: editName, papel: editRole } : p));
            setEditingId(null);
            toast({ title: "Contato atualizado" });
        } catch (error) {
            console.error("Erro ao atualizar:", error);
            toast({ title: "Erro ao atualizar", variant: "destructive" });
        }
    };

    const handleConfirm = async (ids: string[]) => {
        if (ids.length === 0) return;

        // Just remove from the "pending" list (they're already in the contrapartes table)
        setPending(pending.filter(p => !ids.includes(p.id)));
        setSelected([]);
        
        toast({
            title: "Contatos confirmados",
            description: `${ids.length} contatos foram confirmados.`,
        });
    };

    const handleReject = async (ids: string[]) => {
        if (ids.length === 0) return;

        if (!confirm(`Tem certeza que deseja remover ${ids.length} contatos?`)) {
            return;
        }

        try {
            setIsProcessing(true);

            const { error } = await supabase
                .from("contrapartes")
                .update({ ativo: false })
                .in("id", ids);

            if (error) throw error;

            toast({
                title: "Contatos removidos",
                description: `${ids.length} contatos foram desativados.`,
            });
            setSelected([]);
            loadPending();

        } catch (error) {
            console.error("Erro ao remover:", error);
            toast({
                title: "Erro",
                description: "Não foi possível remover os contatos.",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <Card className="mb-6">
                <CardContent className="pt-6 flex justify-center items-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    if (pending.length === 0) {
        return null;
    }

    return (
        <Card className="mb-6 border-amber-200 bg-amber-50/30 dark:bg-amber-950/10 dark:border-amber-900">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-amber-600" />
                            Novos Contatos
                        </CardTitle>
                        <CardDescription>
                            Contatos recentemente identificados. Edite os nomes e papéis se necessário.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {selected.length > 0 && (
                            <>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleReject(selected)}
                                    disabled={isProcessing}
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Remover ({selected.length})
                                </Button>
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleConfirm(selected)}
                                    disabled={isProcessing}
                                >
                                    <Check className="mr-2 h-4 w-4" />
                                    Confirmar ({selected.length})
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border bg-background">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={selected.length === pending.length && pending.length > 0}
                                        onCheckedChange={handleSelectAll}
                                    />
                                </TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Papel</TableHead>
                                <TableHead>Documento</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pending.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selected.includes(item.id)}
                                            onCheckedChange={(checked) => handleSelect(item.id, checked as boolean)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {editingId === item.id ? (
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="h-8 w-[200px]"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2 group">
                                                <span>{item.nome}</span>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => startEditing(item)}
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingId === item.id ? (
                                            <Select value={editRole} onValueChange={setEditRole}>
                                                <SelectTrigger className="h-8 w-[140px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableRoles.map((role) => (
                                                        <SelectItem key={role} value={role}>
                                                            {role}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Badge variant="outline" className="capitalize">
                                                {item.papel}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {item.documento || '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {editingId === item.id ? (
                                            <div className="flex justify-end gap-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => saveEdit(item.id)}>
                                                    <Save className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => setEditingId(null)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-green-600"
                                                    onClick={() => handleConfirm([item.id])}
                                                    title="Confirmar"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-red-600"
                                                    onClick={() => handleReject([item.id])}
                                                    title="Remover"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
