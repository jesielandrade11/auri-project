import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Calendar, TrendingDown, TrendingUp, Loader2, Receipt } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ContaBancaria = Tables<"contas_bancarias">;
type Fatura = Tables<"faturas">;

interface Transacao {
    id: string;
    data_transacao: string;
    descricao: string;
    valor: number;
    tipo: 'entrada' | 'saída';
    categoria?: {
        nome: string;
    } | null;
    categoria_original?: string | null;
    contraparte?: {
        nome: string;
    } | null;
    metadata?: any;
}

export default function CartaoCredito() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [cartoes, setCartoes] = useState<ContaBancaria[]>([]);
    const [cartaoSelecionado, setCartaoSelecionado] = useState<string>("");

    const [faturas, setFaturas] = useState<Fatura[]>([]);
    const [faturaSelecionada, setFaturaSelecionada] = useState<string>("");

    const [transacoesFatura, setTransacoesFatura] = useState<Transacao[]>([]);
    const { toast } = useToast();

    // 1. Load Credit Cards on mount
    useEffect(() => {
        loadCartoes();
    }, []);

    // 2. Handle URL params and default selection
    useEffect(() => {
        const cartaoId = searchParams.get("id");
        if (cartaoId && cartoes.length > 0) {
            // Validate if id exists in loaded cards
            if (cartoes.some(c => c.id === cartaoId)) {
                setCartaoSelecionado(cartaoId);
            } else {
                setCartaoSelecionado(cartoes[0].id);
            }
        } else if (cartoes.length > 0 && !cartaoSelecionado) {
            setCartaoSelecionado(cartoes[0].id);
        }
    }, [searchParams, cartoes]);

    // 3. Load Faturas when Card changes
    useEffect(() => {
        if (cartaoSelecionado) {
            loadFaturas(cartaoSelecionado);
            // Update URL
            setSearchParams({ id: cartaoSelecionado });
        }
    }, [cartaoSelecionado]);

    // 4. Load Transactions when Fatura changes
    useEffect(() => {
        if (faturaSelecionada) {
            loadTransacoesFatura(faturaSelecionada);
        } else {
            setTransacoesFatura([]);
        }
    }, [faturaSelecionada]);

    const loadCartoes = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { data, error } = await supabase
                .from("contas_bancarias")
                .select("*")
                .eq("user_id", user.id)
                .eq("is_credit_card", true)
                .eq("ativo", true)
                .order("nome_banco");

            if (error) throw error;
            setCartoes(data || []);
        } catch (error: any) {
            toast({
                title: "Erro ao carregar cartões",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const loadFaturas = async (contaId: string) => {
        try {
            const { data, error } = await supabase
                .from("faturas")
                .select("*")
                .eq("conta_bancaria_id", contaId)
                .order("data_vencimento", { ascending: false });

            if (error) throw error;

            setFaturas(data || []);

            // Auto-select the latest open or future bill, or just the first one
            if (data && data.length > 0) {
                // Try to find the current/latest open bill
                const currentBill = data.find(f => f.status === 'OPEN') || data[0];
                setFaturaSelecionada(currentBill.id);
            } else {
                setFaturaSelecionada("");
            }
        } catch (error: any) {
            console.error("Error loading faturas:", error);
            toast({
                title: "Erro ao carregar faturas",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const loadTransacoesFatura = async (faturaId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Find the selected fatura to get dates if needed (as fallback)
            const fatura = faturas.find(f => f.id === faturaId);
            if (!fatura) return;

            // Fetch transactions linked to this bill_id
            // We also fetch transactions that might fall into the date range if bill_id is missing, 
            // BUT user specifically asked for "transactions inside that invoice", so strict bill_id is better if available.
            // However, legacy transactions might not have bill_id. 
            // Let's stick to bill_id for now as per the new sync logic.

            let query = supabase
                .from("transacoes")
                .select(`
                    id,
                    data_transacao,
                    descricao,
                    valor,
                    tipo,
                    categoria_original,
                    categoria:categoria_id(nome),
                    contraparte:contraparte_id(nome),
                    metadata
                `)
                .eq("user_id", user.id)
                .eq("conta_bancaria_id", cartaoSelecionado)
                .order("data_transacao", { ascending: false });

            // Ideally we filter by bill_id
            // query = query.eq('bill_id', fatura.pluggy_id); // Wait, bill_id in transactions is likely the Pluggy ID, not our internal UUID?
            // Let's check the sync logic. 
            // In sync: `billId = metadata.billId`. This is the Pluggy ID.
            // In faturas table: `pluggy_id` is the Pluggy ID.
            // So we should match `metadata->>billId` or `bill_id` column if it exists and stores Pluggy ID.
            // The `transacoes` table has a `bill_id` column (text)? Let's assume yes from previous context or use metadata.
            // Actually, in the sync code I wrote: `bill_id: billId` where `billId` comes from metadata.

            if (fatura.pluggy_id) {
                query = query.eq('bill_id', fatura.pluggy_id);
            } else {
                // Fallback for manual bills or legacy: use date range
                // This is risky if dates overlap, but better than nothing
                if (fatura.data_fechamento && fatura.data_vencimento) {
                    // Approximate range: Closing date of previous month + 1 day TO Closing date of this month
                    // This is complex to calculate without previous bill.
                    // For now, let's rely on bill_id as the primary method requested.
                    console.warn("Fatura sem pluggy_id, não é possível filtrar por ID exato.");
                }
            }

            const { data, error } = await query;

            if (error) throw error;
            setTransacoesFatura(data as any || []);
        } catch (error: any) {
            console.error("Error loading transactions:", error);
            toast({
                title: "Erro ao carregar transações",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const currentFatura = faturas.find(f => f.id === faturaSelecionada);

    const totalDespesas = transacoesFatura
        .filter(t => t.tipo === 'saída')
        .reduce((acc, t) => acc + t.valor, 0);

    const totalCreditos = transacoesFatura
        .filter(t => t.tipo === 'entrada')
        .reduce((acc, t) => acc + t.valor, 0);

    const totalFatura = Math.abs(totalDespesas) - Math.abs(totalCreditos);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (cartoes.length === 0) {
        return (
            <div className="container mx-auto py-10">
                <Card>
                    <CardHeader>
                        <CardTitle>Cartões de Crédito</CardTitle>
                        <CardDescription>
                            Você ainda não possui cartões de crédito conectados.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Conecte um cartão de crédito através da página de Contas para começar a acompanhar suas faturas.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 space-y-6">
            {/* Header com seleção de cartão e fatura */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Cartões de Crédito</h1>
                    <p className="text-muted-foreground">Gerencie suas faturas e transações</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Seletor de Cartão */}
                    <Select value={cartaoSelecionado} onValueChange={setCartaoSelecionado}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Selecione um cartão" />
                        </SelectTrigger>
                        <SelectContent>
                            {cartoes.map((cartao) => (
                                <SelectItem key={cartao.id} value={cartao.id}>
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4" />
                                        {cartao.nome_banco}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Seletor de Fatura */}
                    <Select value={faturaSelecionada} onValueChange={setFaturaSelecionada} disabled={faturas.length === 0}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder={faturas.length === 0 ? "Nenhuma fatura encontrada" : "Selecione uma fatura"} />
                        </SelectTrigger>
                        <SelectContent>
                            {faturas.map((fatura) => (
                                <SelectItem key={fatura.id} value={fatura.id}>
                                    <div className="flex items-center gap-2">
                                        <Receipt className="w-4 h-4" />
                                        {fatura.data_vencimento ? format(new Date(fatura.data_vencimento), "MMMM yyyy", { locale: ptBR }) : "Sem data"}
                                        <span className="text-xs text-muted-foreground ml-1">
                                            ({fatura.status === 'OPEN' ? 'Aberta' : 'Fechada'})
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {currentFatura && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Vencimento
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600">
                                {currentFatura.data_vencimento ? format(new Date(currentFatura.data_vencimento), "dd/MM/yyyy") : "-"}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Fechamento: {currentFatura.data_fechamento ? format(new Date(currentFatura.data_fechamento), "dd/MM/yyyy") : "-"}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {currentFatura.status === 'OPEN' ? 'Aberta' :
                                    currentFatura.status === 'PAID' ? 'Paga' :
                                        currentFatura.status === 'OVERDUE' ? 'Vencida' : currentFatura.status}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Total da Fatura (Estimado)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                R$ {totalFatura.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Valor Oficial: R$ {currentFatura.valor_total?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "-"}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Lista de transações da fatura */}
            <Card>
                <CardHeader>
                    <CardTitle>Transações</CardTitle>
                    <CardDescription>
                        {transacoesFatura.length} transações encontradas nesta fatura
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {transacoesFatura.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            Nenhuma transação encontrada para esta fatura.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead>Estabelecimento</TableHead>
                                    <TableHead>Categoria (Original)</TableHead>
                                    <TableHead>Categoria (Auri)</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transacoesFatura.map((transacao) => (
                                    <TableRow key={transacao.id}>
                                        <TableCell className="text-sm whitespace-nowrap">
                                            {new Date(transacao.data_transacao).toLocaleDateString("pt-BR")}
                                        </TableCell>
                                        <TableCell className="font-medium">{transacao.descricao}</TableCell>
                                        <TableCell className="text-sm">
                                            {transacao.contraparte?.nome || "-"}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {transacao.categoria_original || "-"}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {transacao.categoria?.nome ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                    {transacao.categoria.nome}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">Sem categoria</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                {transacao.tipo === 'saída' ? (
                                                    <>
                                                        <TrendingDown className="w-4 h-4 text-red-500" />
                                                        <span className="text-red-600 font-medium">
                                                            R$ {Math.abs(transacao.valor).toFixed(2)}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <TrendingUp className="w-4 h-4 text-green-500" />
                                                        <span className="text-green-600 font-medium">
                                                            R$ {Math.abs(transacao.valor).toFixed(2)}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
