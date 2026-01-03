import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Loader2, UserCheck, Pencil, Save, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface PendingContraparte {
    id: string;
    nome: string;
    papel: string | null;
    origem: string | null;
    pluggy_merchant_name: string | null;
    created_at: string;
}

export function PendingContrapartesPanel() {
    const [pending, setPending] = useState<PendingContraparte[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [availableRoles, setAvailableRoles] = useState<string[]>(['cliente', 'fornecedor', 'empresa', 'titular']);
    const [pendingRoles, setPendingRoles] = useState<Record<string, string[]>>({});
    const [openRolePopover, setOpenRolePopover] = useState<string | null>(null);
    const [newRole, setNewRole] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        loadPending();
        loadRoles();
    }, []);

    const loadRoles = async () => {
        try {
            const { data, error } = await supabase
                .from('contraparte_roles')
                .select('role')
                .order('role');

            if (error) throw error;

            const roles = Array.from(new Set(data?.map(r => r.role) || []));
            // Ensure default roles are present
            const defaults = ['cliente', 'fornecedor', 'empresa', 'titular'];
            const allRoles = Array.from(new Set([...defaults, ...roles]));
            setAvailableRoles(allRoles.sort());
        } catch (error) {
            console.error("Error loading roles:", error);
        }
    };

    const loadPending = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from("pending_contrapartes")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setPending(data || []);

            // Initialize roles
            const initialRoles: Record<string, string[]> = {};
            data?.forEach(p => {
                if (p.papel === 'ambos') {
                    initialRoles[p.id] = ['cliente', 'fornecedor'];
                } else if (p.papel) {
                    initialRoles[p.id] = [p.papel];
                } else {
                    initialRoles[p.id] = [];
                }
            });
            setPendingRoles(initialRoles);

        } catch (error) {
            console.error("Erro ao carregar contrapartes pendentes:", error);
            toast({
                title: "Erro ao carregar",
                description: "Não foi possível carregar as contrapartes pendentes.",
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
    };

    const saveEdit = async (id: string) => {
        try {
            const { error } = await supabase
                .from("pending_contrapartes")
                .update({ nome: editName })
                .eq("id", id);

            if (error) throw error;

            setPending(pending.map(p => p.id === id ? { ...p, nome: editName } : p));
            setEditingId(null);
            toast({ title: "Nome atualizado" });
        } catch (error) {
            console.error("Erro ao atualizar nome:", error);
            toast({ title: "Erro ao atualizar", variant: "destructive" });
        }
    };

    const toggleRole = (id: string, role: string) => {
        setPendingRoles(prev => {
            const current = prev[id] || [];
            if (current.includes(role)) {
                return { ...prev, [id]: current.filter(r => r !== role) };
            } else {
                return { ...prev, [id]: [...current, role] };
            }
        });
    };

    const addNewRole = (id: string) => {
        if (!newRole.trim()) return;
        const role = newRole.trim().toLowerCase();

        if (!availableRoles.includes(role)) {
            setAvailableRoles(prev => [...prev, role].sort());
        }

        setPendingRoles(prev => {
            const current = prev[id] || [];
            if (!current.includes(role)) {
                return { ...prev, [id]: [...current, role] };
            }
            return prev;
        });
        setNewRole("");
    };

    const handleApprove = async (ids: string[]) => {
        if (ids.length === 0) return;

        try {
            setIsProcessing(true);

            // 1. Get details of selected pending counterparties
            const toApprove = pending.filter(p => ids.includes(p.id));

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            let approvedCount = 0;
            let errorCount = 0;

            for (const p of toApprove) {
                const roles = pendingRoles[p.id] || [];

                // 2. Insert into contrapartes
                const { data: newContraparte, error: insertError } = await supabase
                    .from("contrapartes")
                    .insert({
                        user_id: user.id,
                        nome: p.nome,
                        // papel: roles.length > 0 ? roles[0] : null, // Legacy support if needed, or null
                        ativo: true,
                    })
                    .select()
                    .single();

                if (insertError) {
                    console.error(`Erro ao aprovar ${p.nome}:`, insertError);
                    errorCount++;
                    continue;
                }

                // 3. Insert roles
                if (roles.length > 0) {
                    const rolesToInsert = roles.map(r => ({
                        contraparte_id: newContraparte.id,
                        role: r
                    }));

                    const { error: rolesError } = await supabase
                        .from('contraparte_roles')
                        .insert(rolesToInsert);

                    if (rolesError) {
                        console.error(`Erro ao salvar papéis para ${p.nome}:`, rolesError);
                        // Non-fatal, but good to know
                    }
                }

                // 4. Update transactions
                if (newContraparte) {
                    const searchNames = [p.nome];
                    if (p.pluggy_merchant_name) searchNames.push(p.pluggy_merchant_name);

                    for (const name of searchNames) {
                        const { error: updateError } = await supabase
                            .from("transacoes")
                            .update({ contraparte_id: newContraparte.id })
                            .is("contraparte_id", null)
                            .ilike("descricao", `%${name}%`);

                        if (updateError) {
                            console.error(`Erro ao vincular transações para ${name}:`, updateError);
                        }
                    }
                }

                // 5. Delete from pending
                const { error: deleteError } = await supabase
                    .from("pending_contrapartes")
                    .delete()
                    .eq("id", p.id);

                if (deleteError) {
                    console.error(`Erro ao remover pendente ${p.nome}:`, deleteError);
                } else {
                    approvedCount++;
                }
            }

            if (approvedCount > 0) {
                toast({
                    title: "Aprovação concluída",
                    description: `${approvedCount} contatos aprovados e vinculados.`,
                });
                setSelected([]);
                loadPending();
            } else if (errorCount > 0) {
                toast({
                    title: "Erro na aprovação",
                    description: "Não foi possível aprovar alguns itens.",
                    variant: "destructive",
                });
            }

        } catch (error) {
            console.error("Erro ao processar aprovação:", error);
            toast({
                title: "Erro",
                description: "Ocorreu um erro ao processar a aprovação.",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async (ids: string[]) => {
        if (ids.length === 0) return;

        if (!confirm(`Tem certeza que deseja rejeitar ${ids.length} itens? Eles serão removidos permanentemente.`)) {
            return;
        }

        try {
            setIsProcessing(true);

            const { error } = await supabase
                .from("pending_contrapartes")
                .delete()
                .in("id", ids);

            if (error) throw error;

            toast({
                title: "Itens rejeitados",
                description: `${ids.length} itens removidos com sucesso.`,
            });
            setSelected([]);
            loadPending();

        } catch (error) {
            console.error("Erro ao rejeitar:", error);
            toast({
                title: "Erro",
                description: "Não foi possível rejeitar os itens.",
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
        return null; // Don't show if empty
    }

    return (
        <Card className="mb-6 border-amber-200 bg-amber-50/30 dark:bg-amber-950/10 dark:border-amber-900">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-amber-600" />
                            Aprovação de Contatos
                        </CardTitle>
                        <CardDescription>
                            Novos contatos identificados via Open Finance. Edite os nomes e papéis se necessário.
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
                                    Rejeitar ({selected.length})
                                </Button>
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApprove(selected)}
                                    disabled={isProcessing}
                                >
                                    <Check className="mr-2 h-4 w-4" />
                                    Aprovar ({selected.length})
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
                                <TableHead>Nome Sugerido</TableHead>
                                <TableHead>Origem</TableHead>
                                <TableHead>Papéis</TableHead>
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
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="h-8 w-[200px]"
                                                />
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => saveEdit(item.id)}>
                                                    <Save className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => setEditingId(null)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
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
                                        {item.pluggy_merchant_name && item.pluggy_merchant_name !== item.nome && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Original: {item.pluggy_merchant_name}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {item.origem || 'api'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Popover open={openRolePopover === item.id} onOpenChange={(open) => setOpenRolePopover(open ? item.id : null)}>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" className="h-auto p-1 font-normal hover:bg-transparent">
                                                    <div className="flex flex-wrap gap-1">
                                                        {(pendingRoles[item.id] || []).length > 0 ? (
                                                            (pendingRoles[item.id] || []).map(role => (
                                                                <Badge key={role} variant="secondary" className="capitalize">
                                                                    {role}
                                                                </Badge>
                                                            ))
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm italic">Selecionar...</span>
                                                        )}
                                                        <Pencil className="h-3 w-3 ml-1 opacity-50" />
                                                    </div>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[200px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Buscar papel..." />
                                                    <CommandList>
                                                        <CommandEmpty>
                                                            <div className="p-2">
                                                                <p className="text-xs text-muted-foreground mb-2">Papel não encontrado.</p>
                                                                <div className="flex gap-2">
                                                                    <Input
                                                                        value={newRole}
                                                                        onChange={(e) => setNewRole(e.target.value)}
                                                                        placeholder="Novo papel"
                                                                        className="h-7 text-xs"
                                                                    />
                                                                    <Button size="sm" className="h-7" onClick={() => addNewRole(item.id)}>
                                                                        <Plus className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </CommandEmpty>
                                                        <CommandGroup>
                                                            {availableRoles.map((role) => (
                                                                <CommandItem
                                                                    key={role}
                                                                    value={role}
                                                                    onSelect={() => toggleRole(item.id, role)}
                                                                >
                                                                    <div className={cn(
                                                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                                        (pendingRoles[item.id] || []).includes(role)
                                                                            ? "bg-primary text-primary-foreground"
                                                                            : "opacity-50 [&_svg]:invisible"
                                                                    )}>
                                                                        <Check className={cn("h-4 w-4")} />
                                                                    </div>
                                                                    <span className="capitalize">{role}</span>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleReject([item.id])}
                                                disabled={isProcessing}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-50"
                                                onClick={() => handleApprove([item.id])}
                                                disabled={isProcessing}
                                            >
                                                <Check className="h-4 w-4" />
                                            </Button>
                                        </div>
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
