import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type ContaBancaria = Tables<"contas_bancarias">;

interface TransacaoAVencer {
    id: string;
    tipo: 'transacao' | 'dda';
    data_vencimento: string;
    descricao: string;
    valor: number;
    categoria?: string;
    conta?: string;
    conta_bancaria_id?: string;
    status: string;
    original: any;
}

interface BaixaDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transacoes: TransacaoAVencer[];
    contas: ContaBancaria[];
    onBaixaCompleted: () => void;
}

export default function BaixaDialog({
    open,
    onOpenChange,
    transacoes,
    contas,
    onBaixaCompleted,
}: BaixaDialogProps) {
    const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split("T")[0]);
    const [contaBancariaId, setContaBancariaId] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleBaixa = async () => {
        if (!contaBancariaId) {
            toast({
                title: "Conta bancária obrigatória",
                description: "Selecione a conta bancária onde a baixa foi realizada",
                variant: "destructive",
            });
            return;
        }

        if (!dataPagamento) {
            toast({
                title: "Data obrigatória",
                description: "Informe a data do pagamento",
                variant: "destructive",
            });
            return;
        }

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const agora = new Date().toISOString();

            // Separar transações e DDAs
            const transacoesIds = transacoes.filter(t => t.tipo === 'transacao').map(t => t.id);
            const ddasIds = transacoes.filter(t => t.tipo === 'dda').map(t => t.id);

            // Baixar transações
            if (transacoesIds.length > 0) {
                const { error: transacoesError } = await supabase
                    .from("transacoes")
                    .update({
                        status: "pago",
                        data_baixa: dataPagamento,
                        conta_baixa_id: contaBancariaId,
                        updated_at: agora,
                    })
                    .in("id", transacoesIds);

                if (transacoesError) throw transacoesError;
            }

            // Baixar DDAs
            if (ddasIds.length > 0) {
                const { error: ddasError } = await supabase
                    .from("dda_boletos")
                    .update({
                        status: "pago",
                        data_pagamento: dataPagamento,
                        updated_at: agora,
                    })
                    .in("id", ddasIds);

                if (ddasError) throw ddasError;
            }

            toast({
                title: "Baixa realizada com sucesso",
                description: `${transacoes.length} item(ns) baixado(s)`,
            });

            onBaixaCompleted();
            onOpenChange(false);

            // Reset form
            setDataPagamento(new Date().toISOString().split("T")[0]);
            setContaBancariaId("");
        } catch (error: any) {
            toast({
                title: "Erro ao realizar baixa",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const totalValor = transacoes.reduce((sum, t) => sum + t.valor, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Baixar Transações</DialogTitle>
                    <DialogDescription>
                        Realizar baixa de {transacoes.length} transação(ões) selecionada(s)
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Total a Baixar</Label>
                        <div className="text-2xl font-bold">
                            R$ {totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="data-pagamento">Data do Pagamento *</Label>
                        <Input
                            id="data-pagamento"
                            type="date"
                            value={dataPagamento}
                            onChange={(e) => setDataPagamento(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="conta-bancaria">Conta Bancária *</Label>
                        <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a conta" />
                            </SelectTrigger>
                            <SelectContent>
                                {contas.map((conta) => (
                                    <SelectItem key={conta.id} value={conta.id}>
                                        {conta.nome_banco}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button onClick={handleBaixa} disabled={loading}>
                        {loading ? "Processando..." : "Confirmar Baixa"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
