import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { CascadeView } from "./CascadeView";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function CascadeReportDialog() {
    const [open, setOpen] = useState(false);

    // Load cost centers
    const { data: centros } = useQuery({
        queryKey: ["centros-custo-report"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("centros_custo")
                .select("*")
                .eq("ativo", true)
                .order("codigo");
            if (error) throw error;
            return data;
        },
        enabled: open, // Only load when dialog is open
    });

    // Load categories
    const { data: categorias } = useQuery({
        queryKey: ["categorias-report"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("categorias")
                .select("*")
                .eq("ativo", true);
            if (error) throw error;
            return data;
        },
        enabled: open, // Only load when dialog is open
    });

    // Group categories by cost center
    const groupByCostCenter = () => {
        if (!categorias || !centros) return { receitas: [], despesas: [] };

        // Map to store grouped data
        const grouped = new Map<string, { centroCusto: any; categorias: any[] }>();

        // Initialize all cost centers in the map
        centros.forEach((cc) => {
            grouped.set(cc.id, { centroCusto: cc, categorias: [] });
        });

        // Add categories to their respective cost centers
        categorias.forEach((cat: any) => {
            if (!cat.centro_custo_id) return;

            const group = grouped.get(cat.centro_custo_id);
            if (group) {
                group.categorias.push(cat);
            }
        });

        const allGrouped = Array.from(grouped.values()).sort((a, b) =>
            a.centroCusto.codigo.localeCompare(b.centroCusto.codigo)
        );

        // Filter for Receitas based on cost center operation type
        const receitas = allGrouped
            .filter((g) => {
                const tipo = g.centroCusto.tipo_operacao;
                return tipo === 'receita' || tipo === 'ambos';
            })
            .map((g) => ({
                ...g,
                // Only show revenue categories if mixed, or all if pure revenue center?
                // For now, show all categories linked to this cost center that are revenues
                // OR show all categories if the cost center is purely revenue?
                // Let's stick to showing categories that match the type 'receita'
                categorias: g.categorias.filter((c: any) => c.tipo === "receita"),
            }));

        // Filter for Despesas based on cost center operation type
        const despesas = allGrouped
            .filter((g) => {
                const tipo = g.centroCusto.tipo_operacao;
                // Default to 'despesa' if null (backward compatibility)
                return tipo === 'despesa' || tipo === 'ambos' || !tipo;
            })
            .map((g) => ({
                ...g,
                categorias: g.categorias.filter((c: any) => c.tipo === "despesa"),
            }));

        return { receitas, despesas };
    };

    const { receitas: receitasGrouped, despesas: despesasGrouped } = groupByCostCenter();


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Relatório em Cascata
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Relatório de Categorias por Centro de Custo</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 md:grid-cols-2 mt-4">
                    <CascadeView
                        data={receitasGrouped}
                        title="Receitas"
                        icon={<span className="text-success">💰</span>}
                        color="bg-success/5"
                    />
                    <CascadeView
                        data={despesasGrouped}
                        title="Despesas"
                        icon={<span className="text-danger">💸</span>}
                        color="bg-danger/5"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
