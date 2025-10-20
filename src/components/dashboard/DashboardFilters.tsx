import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  contas: any[];
  categorias: any[];
}

export interface FilterState {
  dataInicio: string;
  dataFim: string;
  contaIds: string[];
  categoriaIds: string[];
  granularidade: "diario" | "semanal" | "mensal" | "anual";
  compararComPeriodoAnterior: boolean;
}

const periodoAtalhos = [
  { label: "Hoje", dias: 0 },
  { label: "Ontem", dias: 1 },
  { label: "7 Dias", dias: 7 },
  { label: "15 Dias", dias: 15 },
  { label: "30 Dias", dias: 30 },
  { label: "90 Dias", dias: 90 },
  { label: "6 Meses", dias: 180 },
  { label: "Este Ano", tipo: "ano-atual" },
  { label: "Ano Passado", tipo: "ano-passado" },
  { label: "Tudo", tipo: "tudo" },
];

export const DashboardFilters = ({ onFiltersChange, contas, categorias }: DashboardFiltersProps) => {
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  
  const [filters, setFilters] = useState<FilterState>({
    dataInicio: primeiroDiaMes.toISOString().split("T")[0],
    dataFim: hoje.toISOString().split("T")[0],
    contaIds: contas.map(c => c.id),
    categoriaIds: categorias.map(c => c.id),
    granularidade: "diario",
    compararComPeriodoAnterior: false,
  });

  const [atalhoSelecionado, setAtalhoSelecionado] = useState<string | null>(null);

  const handleAtalhoClick = (atalho: any) => {
    const hoje = new Date();
    let dataInicio: Date;
    let dataFim: Date = hoje;

    if (atalho.tipo === "ano-atual") {
      dataInicio = new Date(hoje.getFullYear(), 0, 1);
    } else if (atalho.tipo === "ano-passado") {
      dataInicio = new Date(hoje.getFullYear() - 1, 0, 1);
      dataFim = new Date(hoje.getFullYear() - 1, 11, 31);
    } else if (atalho.tipo === "tudo") {
      dataInicio = new Date(2020, 0, 1);
    } else if (atalho.dias === 0) {
      dataInicio = hoje;
    } else if (atalho.dias === 1) {
      dataInicio = new Date(hoje.getTime() - 86400000);
      dataFim = new Date(hoje.getTime() - 86400000);
    } else {
      dataInicio = new Date(hoje.getTime() - atalho.dias * 86400000);
    }

    const newFilters = {
      ...filters,
      dataInicio: dataInicio.toISOString().split("T")[0],
      dataFim: dataFim.toISOString().split("T")[0],
    };

    setFilters(newFilters);
    setAtalhoSelecionado(atalho.label);
    onFiltersChange(newFilters);
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setAtalhoSelecionado(null);
    onFiltersChange(newFilters);
  };

  const handleRefresh = () => {
    onFiltersChange(filters);
  };

  return (
    <div className="bg-muted/30 border-b sticky top-0 z-10 backdrop-blur-sm">
      <div className="p-4 space-y-4">
        {/* Linha 1: Período Personalizado */}
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs font-medium mb-1.5 block">Data Início</Label>
            <div className="relative">
              <Input
                type="date"
                value={filters.dataInicio}
                onChange={(e) => handleFilterChange("dataInicio", e.target.value)}
                className="pl-8"
              />
              <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs font-medium mb-1.5 block">Data Fim</Label>
            <div className="relative">
              <Input
                type="date"
                value={filters.dataFim}
                onChange={(e) => handleFilterChange("dataFim", e.target.value)}
                className="pl-8"
              />
              <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="flex-1 min-w-[150px]">
            <Label className="text-xs font-medium mb-1.5 block">Granularidade</Label>
            <Select
              value={filters.granularidade}
              onValueChange={(value) => handleFilterChange("granularidade", value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diario">Diário</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleRefresh} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Linha 2: Atalhos Rápidos */}
        <div className="flex flex-wrap gap-2">
          {periodoAtalhos.map((atalho) => (
            <Button
              key={atalho.label}
              variant={atalhoSelecionado === atalho.label ? "default" : "outline"}
              size="sm"
              onClick={() => handleAtalhoClick(atalho)}
              className="text-xs"
            >
              {atalho.label}
            </Button>
          ))}
        </div>

        {/* Linha 3: Filtros Adicionais */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Checkbox
              id="comparar"
              checked={filters.compararComPeriodoAnterior}
              onCheckedChange={(checked) =>
                handleFilterChange("compararComPeriodoAnterior", checked)
              }
            />
            <Label htmlFor="comparar" className="text-sm cursor-pointer">
              Comparar com período anterior
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
};
