import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Trash2, XCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TransacaoComDados {
    id: string;
    data_transacao: string;
    descricao: string;
    valor: number;
    tipo: string;
    categoria?: {
        nome: string;
    } | null;
    conta?: {
        nome_banco: string;
    } | null;
    contraparte?: {
        nome: string;
    } | null;
}

interface DuplicateTransactionsPanelProps {
    duplicatas: TransacaoComDados[];
    onUpdate: () => void;
}

export function DuplicateTransactionsPanel({ duplicatas, onUpdate }: DuplicateTransactionsPanelProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [transacaoToDelete, setTransacaoToDelete] = useState<string | null>(null);
    const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const { toast } = useToast();

    if (duplicatas.length === 0) {
        return null;
    }

    const handleDeleteTransaction = async () => {
        if (!transacaoToDelete) return;

        try {
            const { error } = await supabase
                .from("transacoes")
                .delete()
                .eq("id", transacaoToDelete);

            if (error) throw error;

            toast({
                title: "Transação excluída",
                description: "A transação duplicada foi removida com sucesso.",
            });

            setDeleteDialogOpen(false);
            setTransacaoToDelete(null);
            onUpdate();
        } catch (error: any) {
            toast({
                title: "Erro ao excluir",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleMarkAsNotDuplicate = async (id: string) => {
        try {
            const { error } = await supabase
                .from("transacoes")
                .update({ possivel_duplicata: false } as any)
                .eq("id", id);

            if (error) throw error;

            toast({
                title: "Marcado como não duplicado",
                description: "A transação foi removida da lista de duplicatas.",
            });

            onUpdate();
        } catch (error: any) {
            toast({
                title: "Erro ao atualizar",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleSelectTransaction = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedTransactions);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedTransactions(newSelected);
    };

    const handleSelectAllInGroup = (transactions: TransacaoComDados[], checked: boolean) => {
        const newSelected = new Set(selectedTransactions);
        transactions.forEach(t => {
            if (checked) {
                newSelected.add(t.id);
            } else {
                newSelected.delete(t.id);
            }
        });
        setSelectedTransactions(newSelected);
    };

    const handleBulkDelete = async () => {
        if (selectedTransactions.size === 0) return;

        try {
            const idsToDelete = Array.from(selectedTransactions);
            const { error } = await supabase
                .from("transacoes")
                .delete()
                .in("id", idsToDelete);

            if (error) throw error;

            toast({
                title: "Transações excluídas",
                description: `${idsToDelete.length} transação(ões) duplicada(s) foram removidas com sucesso.`,
            });

            setSelectedTransactions(new Set());
            setBulkDeleteDialogOpen(false);
            onUpdate();
        } catch (error: any) {
            toast({
                title: "Erro ao excluir",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    // Agrupar duplicatas por valor e contraparte
    const grouped = duplicatas.reduce((acc, t) => {
        const contraparteNome = t.contraparte?.nome || "Sem contraparte";
        const key = `${t.valor}_${contraparteNome}_${t.data_transacao.substring(0, 7)}`; // Agrupar por mês

        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(t);

        return acc;
    }, {} as Record<string, TransacaoComDados[]>);

    return (
        <>
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 mb-6">
                <CardHeader className="flex flex-row items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <div>
                        <CardTitle className="text-amber-900 dark:text-amber-100">
                            Possíveis Duplicatas Detectadas
                        </CardTitle>
                        <CardDescription className="text-amber-700 dark:text-amber-300">
                            {duplicatas.length} transação(ões) marcada(s) como possivelmente duplicada(s)
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {selectedTransactions.size > 0 && (
                        <div className="mb-4 flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                {selectedTransactions.size} transação(ões) selecionada(s)
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedTransactions(new Set())}
                                >
                                    Limpar Seleção
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setBulkDeleteDialogOpen(true)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir Selecionadas
                                </Button>
                            </div>
                        </div>
                    )}
                    <div className="space-y-4">
                        {Object.entries(grouped).map(([key, transactions]) => {
                            const allSelected = transactions.every(t => selectedTransactions.has(t.id));
                            const someSelected = transactions.some(t => selectedTransactions.has(t.id));

                            return (
                                <div key={key} className="border border-amber-200 dark:border-amber-800 rounded-lg p-4 bg-white dark:bg-gray-900">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                checked={allSelected}
                                                onCheckedChange={(checked) => handleSelectAllInGroup(transactions, checked as boolean)}
                                                className="mr-2"
                                            />
                                            <Badge variant="outline" className="text-amber-700 border-amber-300">
                                                {transactions.length} transação(ões)
                                            </Badge>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                Valor: R$ {transactions[0].valor.toFixed(2)}
                                            </span>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                Contraparte: {transactions[0].contraparte?.nome || "Sem contraparte"}
                                            </span>
                                        </div>
                                    </div>

                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12"></TableHead>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Descrição</TableHead>
                                                <TableHead>Conta</TableHead>
                                                <TableHead>Categoria</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transactions.map((t) => (
                                                <TableRow key={t.id}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedTransactions.has(t.id)}
                                                            onCheckedChange={(checked) => handleSelectTransaction(t.id, checked as boolean)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {new Date(t.data_transacao).toLocaleDateString("pt-BR")}
                                                    </TableCell>
                                                    <TableCell className="text-sm">{t.descricao}</TableCell>
                                                    <TableCell className="text-sm">{t.conta?.nome_banco || "-"}</TableCell>
                                                    <TableCell className="text-sm">{t.categoria?.nome || "-"}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end space-x-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleMarkAsNotDuplicate(t.id)}
                                                                title="Marcar como não duplicado"
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-red-600 hover:text-red-700"
                                                                onClick={() => {
                                                                    setTransacaoToDelete(t.id);
                                                                    setDeleteDialogOpen(true);
                                                                }}
                                                                title="Excluir transação"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTransaction} className="bg-red-600 hover:bg-red-700">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão em Massa</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir {selectedTransactions.size} transação(ões) selecionada(s)? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
                            Excluir Todas
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
