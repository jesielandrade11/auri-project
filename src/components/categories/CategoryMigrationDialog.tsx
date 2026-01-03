import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CategoryWithCount {
    id: string;
    nome: string;
    tipo: string;
    transaction_count: number;
}

interface StandardCategory {
    codigo: string;
    nome: string;
    tipo: string;
    centro_custo_codigo: string;
    centro_custo_nome: string;
}

interface MigrationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onMigrationComplete: () => void;
}

// Categorias padrão que serão criadas
const STANDARD_CATEGORIES: StandardCategory[] = [
    // RECEITAS - 1.1 Prestação de Serviços
    { codigo: "1.1.1", nome: "Receita de Consultoria", tipo: "receita", centro_custo_codigo: "1.1", centro_custo_nome: "Prestação de Serviços" },
    { codigo: "1.1.2", nome: "Receita de Manutenção e Suporte", tipo: "receita", centro_custo_codigo: "1.1", centro_custo_nome: "Prestação de Serviços" },
    { codigo: "1.1.3", nome: "Receita de Projetos", tipo: "receita", centro_custo_codigo: "1.1", centro_custo_nome: "Prestação de Serviços" },
    { codigo: "1.1.4", nome: "Receita de Instalação", tipo: "receita", centro_custo_codigo: "1.1", centro_custo_nome: "Prestação de Serviços" },

    // RECEITAS - 1.2 Venda de Produtos
    { codigo: "1.2.1", nome: "Venda de Mercadorias (Comércio)", tipo: "receita", centro_custo_codigo: "1.2", centro_custo_nome: "Venda de Produtos" },
    { codigo: "1.2.2", nome: "Venda de Produtos Fabricados (Indústria)", tipo: "receita", centro_custo_codigo: "1.2", centro_custo_nome: "Venda de Produtos" },
    { codigo: "1.2.3", nome: "Venda por E-commerce", tipo: "receita", centro_custo_codigo: "1.2", centro_custo_nome: "Venda de Produtos" },
    { codigo: "1.2.4", nome: "Fretes Cobrados de Clientes", tipo: "receita", centro_custo_codigo: "1.2", centro_custo_nome: "Venda de Produtos" },

    // RECEITAS - 1.3 Vendas em Geral
    { codigo: "1.3.1", nome: "Venda de Sucata ou Resíduos", tipo: "receita", centro_custo_codigo: "1.3", centro_custo_nome: "Vendas em Geral" },
    { codigo: "1.3.2", nome: "Venda de Subprodutos", tipo: "receita", centro_custo_codigo: "1.3", centro_custo_nome: "Vendas em Geral" },
    { codigo: "1.3.3", nome: "Outras Vendas Diversas", tipo: "receita", centro_custo_codigo: "1.3", centro_custo_nome: "Vendas em Geral" },

    // RECEITAS - 1.4 Receitas Não Operacionais
    { codigo: "1.4.1", nome: "Receita de Aluguel", tipo: "receita", centro_custo_codigo: "1.4", centro_custo_nome: "Receitas Não Operacionais" },
    { codigo: "1.4.2", nome: "Venda de Ativo Imobilizado", tipo: "receita", centro_custo_codigo: "1.4", centro_custo_nome: "Receitas Não Operacionais" },
    { codigo: "1.4.3", nome: "Indenizações de Seguros", tipo: "receita", centro_custo_codigo: "1.4", centro_custo_nome: "Receitas Não Operacionais" },
    { codigo: "1.4.4", nome: "Devoluções de Compras", tipo: "receita", centro_custo_codigo: "1.4", centro_custo_nome: "Receitas Não Operacionais" },

    // RECEITAS - 1.5 Receitas Financeiras
    { codigo: "1.5.1", nome: "Juros Recebidos", tipo: "receita", centro_custo_codigo: "1.5", centro_custo_nome: "Receitas Financeiras" },
    { codigo: "1.5.2", nome: "Rendimentos de Aplicações Financeiras", tipo: "receita", centro_custo_codigo: "1.5", centro_custo_nome: "Receitas Financeiras" },
    { codigo: "1.5.3", nome: "Descontos Obtidos de Fornecedores", tipo: "receita", centro_custo_codigo: "1.5", centro_custo_nome: "Receitas Financeiras" },

    // RECEITAS - 1.6 Financiamentos
    { codigo: "1.6.1", nome: "Empréstimo Bancário Concedido", tipo: "receita", centro_custo_codigo: "1.6", centro_custo_nome: "Financiamentos (Entrada)" },
    { codigo: "1.6.2", nome: "Aporte de Capital dos Sócios", tipo: "receita", centro_custo_codigo: "1.6", centro_custo_nome: "Financiamentos (Entrada)" },

    // DESPESAS - 2.1 Custos Operacionais
    { codigo: "2.1.1", nome: "Compra de Matéria-Prima", tipo: "despesa", centro_custo_codigo: "2.1", centro_custo_nome: "Custos Operacionais" },
    { codigo: "2.1.2", nome: "Compra de Mercadoria para Revenda", tipo: "despesa", centro_custo_codigo: "2.1", centro_custo_nome: "Custos Operacionais" },
    { codigo: "2.1.3", nome: "Embalagens", tipo: "despesa", centro_custo_codigo: "2.1", centro_custo_nome: "Custos Operacionais" },
    { codigo: "2.1.4", nome: "Serviços de Terceiros", tipo: "despesa", centro_custo_codigo: "2.1", centro_custo_nome: "Custos Operacionais" },
    { codigo: "2.1.5", nome: "Fretes sobre Compras", tipo: "despesa", centro_custo_codigo: "2.1", centro_custo_nome: "Custos Operacionais" },

    // DESPESAS - 2.2 Pessoal e RH
    { codigo: "2.2.1", nome: "Salários e Ordenados", tipo: "despesa", centro_custo_codigo: "2.2", centro_custo_nome: "Pessoal e RH" },
    { codigo: "2.2.2", nome: "Adiantamentos Salariais", tipo: "despesa", centro_custo_codigo: "2.2", centro_custo_nome: "Pessoal e RH" },
    { codigo: "2.2.3", nome: "Férias e 13º Salário", tipo: "despesa", centro_custo_codigo: "2.2", centro_custo_nome: "Pessoal e RH" },
    { codigo: "2.2.4", nome: "Pro Labore (Sócios)", tipo: "despesa", centro_custo_codigo: "2.2", centro_custo_nome: "Pessoal e RH" },
    { codigo: "2.2.5", nome: "Encargos Sociais (INSS, FGTS)", tipo: "despesa", centro_custo_codigo: "2.2", centro_custo_nome: "Pessoal e RH" },
    { codigo: "2.2.6", nome: "Benefícios (Vale Transporte, Alimentação, Plano de Saúde)", tipo: "despesa", centro_custo_codigo: "2.2", centro_custo_nome: "Pessoal e RH" },

    // DESPESAS - 2.3 Administrativo
    { codigo: "2.3.1", nome: "Aluguel do Imóvel", tipo: "despesa", centro_custo_codigo: "2.3", centro_custo_nome: "Administrativo" },
    { codigo: "2.3.2", nome: "Condomínio e IPTU", tipo: "despesa", centro_custo_codigo: "2.3", centro_custo_nome: "Administrativo" },
    { codigo: "2.3.3", nome: "Energia Elétrica, Água e Esgoto", tipo: "despesa", centro_custo_codigo: "2.3", centro_custo_nome: "Administrativo" },
    { codigo: "2.3.4", nome: "Telefonia e Internet", tipo: "despesa", centro_custo_codigo: "2.3", centro_custo_nome: "Administrativo" },
    { codigo: "2.3.5", nome: "Material de Escritório e Limpeza", tipo: "despesa", centro_custo_codigo: "2.3", centro_custo_nome: "Administrativo" },
    { codigo: "2.3.6", nome: "Contabilidade e Jurídico", tipo: "despesa", centro_custo_codigo: "2.3", centro_custo_nome: "Administrativo" },
    { codigo: "2.3.7", nome: "Softwares e Licenças", tipo: "despesa", centro_custo_codigo: "2.3", centro_custo_nome: "Administrativo" },

    // DESPESAS - 2.4 Comercial e Marketing
    { codigo: "2.4.1", nome: "Comissões de Vendas", tipo: "despesa", centro_custo_codigo: "2.4", centro_custo_nome: "Comercial e Marketing" },
    { codigo: "2.4.2", nome: "Verba de Propaganda (Ads, Mídias Sociais)", tipo: "despesa", centro_custo_codigo: "2.4", centro_custo_nome: "Comercial e Marketing" },
    { codigo: "2.4.3", nome: "Agência de Marketing", tipo: "despesa", centro_custo_codigo: "2.4", centro_custo_nome: "Comercial e Marketing" },
    { codigo: "2.4.4", nome: "Brindes e Eventos", tipo: "despesa", centro_custo_codigo: "2.4", centro_custo_nome: "Comercial e Marketing" },
    { codigo: "2.4.5", nome: "Viagens e Hospedagens Comerciais", tipo: "despesa", centro_custo_codigo: "2.4", centro_custo_nome: "Comercial e Marketing" },

    // DESPESAS - 2.5 Saídas Não Operacionais
    { codigo: "2.5.1", nome: "Devolução de Dinheiro a Clientes", tipo: "despesa", centro_custo_codigo: "2.5", centro_custo_nome: "Saídas Não Operacionais" },
    { codigo: "2.5.2", nome: "Pagamento de Multas Fiscais", tipo: "despesa", centro_custo_codigo: "2.5", centro_custo_nome: "Saídas Não Operacionais" },
    { codigo: "2.5.3", nome: "Doações", tipo: "despesa", centro_custo_codigo: "2.5", centro_custo_nome: "Saídas Não Operacionais" },

    // DESPESAS - 2.6 Financiamentos
    { codigo: "2.6.1", nome: "Juros de Financiamento", tipo: "despesa", centro_custo_codigo: "2.6", centro_custo_nome: "Financiamentos (Saída)" },
    { codigo: "2.6.2", nome: "Amortização", tipo: "despesa", centro_custo_codigo: "2.6", centro_custo_nome: "Financiamentos (Saída)" },
    { codigo: "2.6.3", nome: "Tarifas e Taxas Bancárias", tipo: "despesa", centro_custo_codigo: "2.6", centro_custo_nome: "Financiamentos (Saída)" },
    { codigo: "2.6.4", nome: "IOF", tipo: "despesa", centro_custo_codigo: "2.6", centro_custo_nome: "Financiamentos (Saída)" },

    // DESPESAS - 2.7 Investimentos
    { codigo: "2.7.1", nome: "Aquisição de Máquinas e Equipamentos", tipo: "despesa", centro_custo_codigo: "2.7", centro_custo_nome: "Investimentos" },
    { codigo: "2.7.2", nome: "Móveis e Utensílios", tipo: "despesa", centro_custo_codigo: "2.7", centro_custo_nome: "Investimentos" },
    { codigo: "2.7.3", nome: "Equipamentos de Informática (Computadores)", tipo: "despesa", centro_custo_codigo: "2.7", centro_custo_nome: "Investimentos" },
    { codigo: "2.7.4", nome: "Obras e Instalações", tipo: "despesa", centro_custo_codigo: "2.7", centro_custo_nome: "Investimentos" },
    { codigo: "2.7.5", nome: "Aplicações Financeiras (Saída para Guardar/Investir)", tipo: "despesa", centro_custo_codigo: "2.7", centro_custo_nome: "Investimentos" },
];

export function CategoryMigrationDialog({ open, onOpenChange, onMigrationComplete }: MigrationDialogProps) {
    const [loading, setLoading] = useState(false);
    const [categoriesWithTransactions, setCategoriesWithTransactions] = useState<CategoryWithCount[]>([]);
    const [migrationMap, setMigrationMap] = useState<Record<string, string>>({});
    const { toast } = useToast();

    // Carregar categorias que têm transações
    const loadCategoriesWithTransactions = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Buscar categorias com contagem de transações
            const { data, error } = await supabase
                .from("categorias")
                .select(`
          id,
          nome,
          tipo,
          transacoes(count)
        `)
                .eq("user_id", user.id)
                .eq("ativo", true);

            if (error) throw error;

            // Filtrar apenas categorias que têm transações
            const withTransactions = (data || [])
                .map((cat: any) => ({
                    id: cat.id,
                    nome: cat.nome,
                    tipo: cat.tipo,
                    transaction_count: cat.transacoes?.[0]?.count || 0,
                }))
                .filter((cat) => cat.transaction_count > 0);

            setCategoriesWithTransactions(withTransactions);
        } catch (error: any) {
            console.error("Erro ao carregar categorias:", error);
        }
    };

    // Carregar ao abrir o diálogo
    useEffect(() => {
        if (open) {
            loadCategoriesWithTransactions();
        }
    }, [open]);

    const handleMigrate = async () => {
        try {
            setLoading(true);

            // Verificar se todas as categorias foram mapeadas
            const unmappedCategories = categoriesWithTransactions.filter(
                (cat) => !migrationMap[cat.id]
            );

            if (unmappedCategories.length > 0) {
                toast({
                    title: "Mapeamento incompleto",
                    description: `Você precisa selecionar uma categoria padrão para: ${unmappedCategories.map(c => c.nome).join(", ")}`,
                    variant: "destructive",
                });
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            // Criar um mapa temporário de categoria antiga -> código da nova categoria
            const migrationData = Object.entries(migrationMap).map(([oldCatId, newCatCode]) => ({
                old_category_id: oldCatId,
                new_category_code: newCatCode,
            }));

            // Chamar função RPC para migrar (vamos criar essa função)
            const { error } = await supabase.rpc('migrate_and_install_categories' as any, {
                target_user_id: user.id,
                migration_mapping: migrationData,
            });

            if (error) throw error;

            toast({
                title: "Migração concluída!",
                description: "Categorias padrão instaladas e transações migradas com sucesso.",
            });

            onMigrationComplete();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: "Erro na migração",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const receitas = STANDARD_CATEGORIES.filter((c) => c.tipo === "receita");
    const despesas = STANDARD_CATEGORIES.filter((c) => c.tipo === "despesa");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Migração de Categorias</DialogTitle>
                    <DialogDescription>
                        Você possui transações cadastradas. Para instalar as categorias padrão,
                        selecione para onde migrar cada categoria atual.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {categoriesWithTransactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                            <p>Nenhuma categoria com transações encontrada</p>
                        </div>
                    ) : (
                        categoriesWithTransactions.map((category) => (
                            <div
                                key={category.id}
                                className="border rounded-lg p-4 space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{category.nome}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {category.transaction_count} transação
                                            {category.transaction_count !== 1 ? "ões" : ""}
                                        </p>
                                    </div>
                                    <Badge variant={category.tipo === "receita" ? "default" : "destructive"}>
                                        {category.tipo}
                                    </Badge>
                                </div>

                                <div className="flex items-center gap-2">
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    <Select
                                        value={migrationMap[category.id] || ""}
                                        onValueChange={(value) =>
                                            setMigrationMap({ ...migrationMap, [category.id]: value })
                                        }
                                    >
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Selecione a categoria padrão de destino" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <div className="p-2 font-semibold text-sm text-muted-foreground">
                                                {category.tipo === "receita" ? "RECEITAS" : "DESPESAS"}
                                            </div>
                                            {(category.tipo === "receita" ? receitas : despesas).map((stdCat) => (
                                                <SelectItem key={stdCat.codigo} value={stdCat.codigo}>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">
                                                            {stdCat.codigo} - {stdCat.nome}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {stdCat.centro_custo_codigo} - {stdCat.centro_custo_nome}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleMigrate} disabled={loading || categoriesWithTransactions.length === 0}>
                        {loading ? "Migrando..." : "Migrar e Instalar"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
