import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CostCenter {
    id: string;
    codigo: string;
    nome: string;
    tipo: string;
}

interface Category {
    id: string;
    nome: string;
    codigo_contabil: string;
    tipo: string;
    centro_custo_id: string;
    cor: string;
    fixa_variavel: string;
    dre_grupo: string;
}

interface GroupedData {
    costCenter: CostCenter;
    categories: Category[];
}

const RelatorioCascata = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [entradas, setEntradas] = useState<GroupedData[]>([]);
    const [saidas, setSaidas] = useState<GroupedData[]>([]);
    const [expandedCostCenters, setExpandedCostCenters] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            // Carregar Centros de Custo
            const { data: costCenters, error: ccError } = await supabase
                .from("centros_custo")
                .select("*")
                .eq("user_id", user.id)
                .eq("ativo", true)
                .order("codigo");

            if (ccError) throw ccError;

            // Carregar Categorias
            const { data: categories, error: catError } = await supabase
                .from("categorias")
                .select("*")
                .eq("user_id", user.id)
                .eq("ativo", true)
                .order("codigo_contabil");

            if (catError) throw catError;

            // Agrupar por Centro de Custo
            const grouped: GroupedData[] = (costCenters || []).map((cc) => ({
                costCenter: cc,
                categories: (categories || []).filter((cat) => cat.centro_custo_id === cc.id),
            }));

            // Separar ENTRADAS (1.x) e SAÍDAS (2.x)
            const entradasData = grouped.filter((g) => g.costCenter.codigo.startsWith("1"));
            const saidasData = grouped.filter((g) => g.costCenter.codigo.startsWith("2"));

            setEntradas(entradasData);
            setSaidas(saidasData);
        } catch (error: any) {
            toast({
                title: "Erro ao carregar dados",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleCostCenter = (ccId: string) => {
        const newExpanded = new Set(expandedCostCenters);
        if (newExpanded.has(ccId)) {
            newExpanded.delete(ccId);
        } else {
            newExpanded.add(ccId);
        }
        setExpandedCostCenters(newExpanded);
    };

    const renderGroup = (title: string, icon: React.ReactNode, data: GroupedData[], color: string) => (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {icon}
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhum centro de custo cadastrado</p>
                ) : (
                    <div className="space-y-2">
                        {data.map(({ costCenter, categories }) => {
                            const isExpanded = expandedCostCenters.has(costCenter.id);
                            return (
                                <div key={costCenter.id} className="border rounded-lg">
                                    {/* Cost Center Header */}
                                    <button
                                        onClick={() => toggleCostCenter(costCenter.id)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            {isExpanded ? (
                                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                            ) : (
                                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                            )}
                                            <span className="font-semibold" style={{ color }}>
                                                {costCenter.codigo}
                                            </span>
                                            <span className="font-medium">{costCenter.nome}</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {categories.length} {categories.length === 1 ? "categoria" : "categorias"}
                                        </span>
                                    </button>

                                    {/* Categories List */}
                                    {isExpanded && (
                                        <div className="border-t bg-muted/30">
                                            {categories.length === 0 ? (
                                                <p className="p-4 text-sm text-muted-foreground">
                                                    Nenhuma categoria vinculada a este centro de custo
                                                </p>
                                            ) : (
                                                <div className="divide-y">
                                                    {categories.map((cat) => (
                                                        <div
                                                            key={cat.id}
                                                            className="p-3 pl-12 flex items-center justify-between hover:bg-accent/50 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span
                                                                    className="text-xs font-mono px-2 py-1 rounded"
                                                                    style={{
                                                                        backgroundColor: cat.cor + "20",
                                                                        color: cat.cor,
                                                                    }}
                                                                >
                                                                    {cat.codigo_contabil}
                                                                </span>
                                                                <span className="text-sm">{cat.nome}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                                                                    {cat.fixa_variavel}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {cat.dre_grupo}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Carregando estrutura...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Relatório Cascata</h1>
                <p className="text-muted-foreground">
                    Visualização hierárquica de Centros de Custo e suas Categorias
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {renderGroup(
                    "1. ENTRADAS (Receitas)",
                    <TrendingUp className="h-5 w-5 text-green-600" />,
                    entradas,
                    "#10B981"
                )}
                {renderGroup(
                    "2. SAÍDAS (Despesas e Investimentos)",
                    <TrendingDown className="h-5 w-5 text-red-600" />,
                    saidas,
                    "#EF4444"
                )}
            </div>
        </div>
    );
};

export default RelatorioCascata;
