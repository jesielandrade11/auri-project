import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Calendar, Loader2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

type ContaBancaria = Tables<"contas_bancarias">;

interface Transacao {
    id: string;
    data_transacao: string;
    descricao: string;
    valor: number;
    tipo: string;
    categoria?: {
        nome: string;
    } | null;
    contraparte?: {
        nome: string;
    } | null;
}

export default function CartaoCredito() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [cartoes, setCartoes] = useState<ContaBancaria[]>([]);
    const [cartaoSelecionado, setCartaoSelecionado] = useState<string>("");
    const [mesSelecionado, setMesSelecionado] = useState<string>(format(new Date(), "yyyy-MM"));
    const [transacoes, setTransacoes] = useState<Transacao[]>([]);
    const { toast } = useToast();

    // Available months for selection (last 12 months)
    const mesesDisponiveis = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return format(date, "yyyy-MM");
    });

    // 1. Load Credit Cards on mount
    useEffect(() => {
        loadCartoes();
    }, []);

    // 2. Handle URL params and default selection
    useEffect(() => {
        const cartaoId = searchParams.get("id");
        if (cartaoId && cartoes.length > 0) {
            if (cartoes.some(c => c.id === cartaoId)) {
                setCartaoSelecionado(cartaoId);
            } else {
                setCartaoSelecionado(cartoes[0].id);
            }
        } else if (cartoes.length > 0 && !cartaoSelecionado) {
            setCartaoSelecionado(cartoes[0].id);
        }
    }, [searchParams, cartoes]);

    // 3. Load Transactions when Card or Month changes
    useEffect(() => {
        if (cartaoSelecionado && mesSelecionado) {
            loadTransacoes(cartaoSelecionado, mesSelecionado);
            setSearchParams({ id: cartaoSelecionado });
        }
    }, [cartaoSelecionado, mesSelecionado]);

    const loadCartoes = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            // Load accounts that could be credit cards (tipo_conta can indicate this)
            const { data, error } = await supabase
                .from("contas_bancarias")
                .select("*")
                .eq("user_id", user.id)
                .eq("ativo", true)
                .order("nome_banco");

            if (error) throw error;
            
            // Filter for credit card type accounts
            const creditCards = (data || []).filter(c => 
                c.tipo_conta === 'credito' || 
                c.nome_banco?.toLowerCase().includes('cartão') ||
                c.nome_banco?.toLowerCase().includes('cartao') ||
                c.nome_banco?.toLowerCase().includes('credit')
            );
            
            setCartoes(creditCards.length > 0 ? creditCards : data || []);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            toast({
                title: "Erro ao carregar cartões",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const loadTransacoes = async (contaId: string, mes: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [year, month] = mes.split('-').map(Number);
            const startDate = startOfMonth(new Date(year, month - 1));
            const endDate = endOfMonth(new Date(year, month - 1));

            const { data, error } = await supabase
                .from("transacoes")
                .select(`
                    id,
                    data_transacao,
                    descricao,
                    valor,
                    tipo,
                    categoria:categoria_id(nome),
                    contraparte:contraparte_id(nome)
                `)
                .eq("user_id", user.id)
                .eq("conta_bancaria_id", contaId)
                .gte("data_transacao", format(startDate, "yyyy-MM-dd"))
                .lte("data_transacao", format(endDate, "yyyy-MM-dd"))
                .order("data_transacao", { ascending: false });

            if (error) throw error;
            setTransacoes((data as unknown as Transacao[]) || []);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error("Error loading transactions:", error);
            toast({
                title: "Erro ao carregar transações",
                description: errorMessage,
                variant: "destructive",
            });
        }
    };

    const totalDespesas = transacoes
        .filter(t => t.tipo === 'despesa')
        .reduce((acc, t) => acc + t.valor, 0);

    const totalReceitas = transacoes
        .filter(t => t.tipo === 'receita')
        .reduce((acc, t) => acc + t.valor, 0);

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
                            Você ainda não possui contas cadastradas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Cadastre uma conta bancária através da página de Contas para começar.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 space-y-6">
            {/* Header with card and month selection */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Cartões de Crédito</h1>
                    <p className="text-muted-foreground">Gerencie suas transações por mês</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Card Selector */}
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

                    {/* Month Selector */}
                    <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Selecione o mês" />
                        </SelectTrigger>
                        <SelectContent>
                            {mesesDisponiveis.map((mes) => (
                                <SelectItem key={mes} value={mes}>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {format(new Date(mes + "-01"), "MMMM yyyy", { locale: ptBR })}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            R$ {totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total de Receitas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            R$ {totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Transações</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {transacoes.length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions List */}
            <Card>
                <CardHeader>
                    <CardTitle>Transações</CardTitle>
                    <CardDescription>
                        {transacoes.length} transações em {format(new Date(mesSelecionado + "-01"), "MMMM yyyy", { locale: ptBR })}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {transacoes.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            Nenhuma transação encontrada para este período.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead>Contraparte</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transacoes.map((transacao) => (
                                    <TableRow key={transacao.id}>
                                        <TableCell className="text-sm whitespace-nowrap">
                                            {new Date(transacao.data_transacao).toLocaleDateString("pt-BR")}
                                        </TableCell>
                                        <TableCell className="font-medium">{transacao.descricao}</TableCell>
                                        <TableCell className="text-sm">
                                            {transacao.contraparte?.nome || "-"}
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
                                            <span className={transacao.tipo === 'despesa' ? 'text-red-600' : 'text-green-600'}>
                                                {transacao.tipo === 'despesa' ? '-' : '+'}
                                                R$ {transacao.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                            </span>
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
