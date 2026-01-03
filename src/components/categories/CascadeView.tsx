import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type CentroCusto = Tables<"centros_custo">;
type Categoria = Tables<"categorias"> & {
    transaction_count?: number;
};

interface GroupedData {
    centroCusto: CentroCusto;
    categorias: Categoria[];
}

interface CascadeViewProps {
    data: GroupedData[];
    title: string;
    icon: React.ReactNode;
    color: string;
}

export function CascadeView({ data, title, icon, color }: CascadeViewProps) {
    const [expandedCostCenters, setExpandedCostCenters] = useState<Set<string>>(new Set());

    const toggleCostCenter = (id: string) => {
        const newExpanded = new Set(expandedCostCenters);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedCostCenters(newExpanded);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {icon}
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {data.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum centro de custo encontrado
                    </p>
                ) : (
                    data.map((group) => {
                        const isExpanded = expandedCostCenters.has(group.centroCusto.id);
                        const totalTransactions = group.categorias.reduce(
                            (sum, cat) => sum + (cat.transaction_count || 0),
                            0
                        );

                        return (
                            <div key={group.centroCusto.id} className="border rounded-lg overflow-hidden">
                                {/* Cost Center Header */}
                                <div
                                    className={`p-3 cursor-pointer hover:bg-accent transition-colors ${color}`}
                                    onClick={() => toggleCostCenter(group.centroCusto.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {isExpanded ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                            <span className="font-semibold">
                                                {group.centroCusto.codigo} - {group.centroCusto.nome}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">
                                                {group.categorias.length} categoria{group.categorias.length !== 1 ? "s" : ""}
                                            </Badge>
                                            {totalTransactions > 0 && (
                                                <Badge variant="secondary">
                                                    {totalTransactions} transação{totalTransactions !== 1 ? "ões" : ""}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Categories List */}
                                {isExpanded && (
                                    <div className="bg-muted/30">
                                        {group.categorias.length === 0 ? (
                                            <p className="text-sm text-muted-foreground p-4 text-center">
                                                Nenhuma categoria vinculada
                                            </p>
                                        ) : (
                                            <div className="divide-y">
                                                {group.categorias.map((categoria) => (
                                                    <div
                                                        key={categoria.id}
                                                        className="p-3 pl-10 hover:bg-accent/50 transition-colors"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                {categoria.icone && (
                                                                    <span className="text-lg">{categoria.icone}</span>
                                                                )}
                                                                <div>
                                                                    <p className="font-medium text-sm">{categoria.nome}</p>
                                                                    {categoria.codigo_contabil && (
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {categoria.codigo_contabil}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {categoria.dre_grupo && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {categoria.dre_grupo}
                                                                    </Badge>
                                                                )}
                                                                {categoria.fixa_variavel && (
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        {categoria.fixa_variavel}
                                                                    </Badge>
                                                                )}
                                                                {(categoria.transaction_count || 0) > 0 && (
                                                                    <Badge className="text-xs">
                                                                        {categoria.transaction_count} transação
                                                                        {categoria.transaction_count !== 1 ? "ões" : ""}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}
