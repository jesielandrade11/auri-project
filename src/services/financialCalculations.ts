/**
 * Serviço centralizado para cálculos financeiros
 * Evita duplicação de lógica e garante consistência nos cálculos
 */

export interface Transacao {
  id: string;
  valor: number;
  tipo: "receita" | "despesa";
  data_transacao: string;
  status?: string;
  conciliado?: boolean;
  categoria?: {
    tipo: string;
    dre_grupo?: string;
  } | null;
}

export interface ContaBancaria {
  id: string;
  saldo_atual: number | null;
  saldo_inicial: number | null;
}

export interface KPIData {
  faturamentoBruto: number;
  gastosOperacionais: number;
  lucroOperacional: number;
  lucroLiquido: number;
  roi: number;
  saldoCaixa: number;
  margens: {
    operacional: number;
    liquida: number;
  };
  diasReserva: number;
}

/**
 * Calcula KPIs financeiros principais
 */
export function calcularKPIs(
  transacoes: Transacao[],
  contas: ContaBancaria[],
  diasPeriodo: number
): KPIData {
  const faturamentoBruto = transacoes
    .filter((t) => t.tipo === "receita")
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const gastosOperacionais = transacoes
    .filter((t) => t.tipo === "despesa")
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const lucroOperacional = faturamentoBruto - gastosOperacionais;
  
  // Considerar margem de impostos (exemplo: 18%)
  const lucroLiquido = lucroOperacional * 0.82;
  
  const roi = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0;
  
  const saldoCaixa = contas.reduce(
    (sum, c) => sum + Number(c.saldo_atual || 0),
    0
  );

  const margemOperacional = faturamentoBruto > 0 
    ? (lucroOperacional / faturamentoBruto) * 100 
    : 0;
  
  const margemLiquida = faturamentoBruto > 0 
    ? (lucroLiquido / faturamentoBruto) * 100 
    : 0;

  const mediaGastosDiarios = gastosOperacionais / Math.max(1, diasPeriodo);
  const diasReserva = mediaGastosDiarios > 0 
    ? Math.floor(saldoCaixa / mediaGastosDiarios) 
    : 999;

  return {
    faturamentoBruto,
    gastosOperacionais,
    lucroOperacional,
    lucroLiquido,
    roi,
    saldoCaixa,
    margens: {
      operacional: margemOperacional,
      liquida: margemLiquida,
    },
    diasReserva,
  };
}

/**
 * Calcula o saldo de uma conta bancária baseado em transações
 */
export function calcularSaldoConta(
  saldoInicial: number,
  transacoes: Transacao[]
): number {
  return transacoes.reduce((saldo, t) => {
    const valor = Number(t.valor);
    return saldo + (t.tipo === "receita" ? valor : -valor);
  }, saldoInicial);
}

/**
 * Agrupa transações por categoria
 */
export function agruparPorCategoria(transacoes: Transacao[]) {
  const grupos = new Map<string, {
    categoria: string;
    valor: number;
    quantidade: number;
  }>();

  transacoes.forEach((t) => {
    const categoriaNome = t.categoria?.tipo || "Sem Categoria";
    const existing = grupos.get(categoriaNome) || {
      categoria: categoriaNome,
      valor: 0,
      quantidade: 0,
    };

    existing.valor += Number(t.valor);
    existing.quantidade += 1;
    grupos.set(categoriaNome, existing);
  });

  return Array.from(grupos.values()).sort((a, b) => b.valor - a.valor);
}

/**
 * Agrupa transações por período
 */
export function agruparPorPeriodo(
  transacoes: Transacao[],
  granularidade: "diario" | "semanal" | "mensal" | "anual"
) {
  const grupos = new Map<string, {
    periodo: string;
    receitas: number;
    despesas: number;
    saldo: number;
  }>();

  transacoes.forEach((t) => {
    const data = new Date(t.data_transacao);
    let chave: string;

    switch (granularidade) {
      case "diario":
        chave = data.toISOString().split("T")[0];
        break;
      case "semanal":
        const semana = Math.ceil(data.getDate() / 7);
        chave = `${data.getFullYear()}-W${semana}`;
        break;
      case "mensal":
        chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
        break;
      case "anual":
        chave = `${data.getFullYear()}`;
        break;
    }

    const existing = grupos.get(chave) || {
      periodo: chave,
      receitas: 0,
      despesas: 0,
      saldo: 0,
    };

    const valor = Number(t.valor);
    if (t.tipo === "receita") {
      existing.receitas += valor;
    } else {
      existing.despesas += valor;
    }
    existing.saldo = existing.receitas - existing.despesas;

    grupos.set(chave, existing);
  });

  return Array.from(grupos.values()).sort((a, b) => 
    a.periodo.localeCompare(b.periodo)
  );
}

/**
 * Calcula métricas de aging (contas a pagar/receber)
 */
export function calcularAging(transacoes: Transacao[]) {
  const hoje = new Date();
  
  return transacoes.map((t) => {
    const dataVencimento = new Date(t.data_transacao);
    const diasAtraso = Math.floor(
      (hoje.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24)
    );

    let faixaAtraso: string;
    if (diasAtraso < 0) {
      faixaAtraso = "a_vencer";
    } else if (diasAtraso <= 7) {
      faixaAtraso = "0_7_dias";
    } else if (diasAtraso <= 15) {
      faixaAtraso = "8_15_dias";
    } else if (diasAtraso <= 30) {
      faixaAtraso = "16_30_dias";
    } else if (diasAtraso <= 60) {
      faixaAtraso = "31_60_dias";
    } else if (diasAtraso <= 90) {
      faixaAtraso = "61_90_dias";
    } else {
      faixaAtraso = "acima_90_dias";
    }

    return {
      ...t,
      diasAtraso,
      faixaAtraso,
    };
  });
}

/**
 * Calcula ponto de equilíbrio (break-even)
 */
export function calcularPontoEquilibrio(
  custosFixos: number,
  margemContribuicao: number
): number {
  if (margemContribuicao <= 0) return 0;
  return custosFixos / (margemContribuicao / 100);
}

/**
 * Calcula o EBITDA (Lucro antes de juros, impostos, depreciação e amortização)
 */
export function calcularEBITDA(
  receitas: number,
  despesasOperacionais: number,
  depreciacao: number = 0,
  amortizacao: number = 0
): number {
  return receitas - despesasOperacionais + depreciacao + amortizacao;
}

/**
 * Calcula o Payback (tempo de retorno do investimento)
 */
export function calcularPayback(
  investimentoInicial: number,
  fluxoCaixaMensal: number
): number {
  if (fluxoCaixaMensal <= 0) return Infinity;
  return investimentoInicial / fluxoCaixaMensal;
}

/**
 * Formata valor para moeda brasileira
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

/**
 * Formata porcentagem
 */
export function formatarPorcentagem(valor: number, casasDecimais: number = 1): string {
  return `${valor.toFixed(casasDecimais)}%`;
}

/**
 * Calcula variação percentual entre dois valores
 */
export function calcularVariacao(valorAtual: number, valorAnterior: number): number {
  if (valorAnterior === 0) return 0;
  return ((valorAtual - valorAnterior) / valorAnterior) * 100;
}

/**
 * Valida se uma transação está dentro de um período
 */
export function transacaoNoPeriodo(
  dataTransacao: string,
  dataInicio: string,
  dataFim: string
): boolean {
  const data = new Date(dataTransacao);
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  return data >= inicio && data <= fim;
}

/**
 * Calcula DRE (Demonstração do Resultado do Exercício)
 */
export interface DREData {
  receitaBruta: number;
  impostosSobreVendas: number;
  receitaLiquida: number;
  custosMercadoriaVendida: number;
  lucretaBruto: number;
  despesasOperacionais: number;
  lucroOperacional: number;
  despesasFinanceiras: number;
  receitasFinanceiras: number;
  lucroAntesImpostos: number;
  impostoRenda: number;
  lucroLiquido: number;
}

export function calcularDRE(
  transacoes: Transacao[],
  taxaImpostos: number = 0.18
): DREData {
  const receitaBruta = transacoes
    .filter((t) => t.tipo === "receita" && t.categoria?.dre_grupo === "receita_bruta")
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const impostosSobreVendas = receitaBruta * 0.12; // Exemplo: 12% de impostos

  const receitaLiquida = receitaBruta - impostosSobreVendas;

  const custosMercadoriaVendida = transacoes
    .filter((t) => t.tipo === "despesa" && t.categoria?.dre_grupo === "cogs")
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const lucretaBruto = receitaLiquida - custosMercadoriaVendida;

  const despesasOperacionais = transacoes
    .filter((t) => t.tipo === "despesa" && t.categoria?.dre_grupo === "opex")
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const lucroOperacional = lucretaBruto - despesasOperacionais;

  const despesasFinanceiras = transacoes
    .filter((t) => t.tipo === "despesa" && t.categoria?.dre_grupo === "financeiro")
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const receitasFinanceiras = transacoes
    .filter((t) => t.tipo === "receita" && t.categoria?.dre_grupo === "financeiro")
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const lucroAntesImpostos = lucroOperacional + receitasFinanceiras - despesasFinanceiras;

  const impostoRenda = lucroAntesImpostos * taxaImpostos;

  const lucroLiquido = lucroAntesImpostos - impostoRenda;

  return {
    receitaBruta,
    impostosSobreVendas,
    receitaLiquida,
    custosMercadoriaVendida,
    lucretaBruto,
    despesasOperacionais,
    lucroOperacional,
    despesasFinanceiras,
    receitasFinanceiras,
    lucroAntesImpostos,
    impostoRenda,
    lucroLiquido,
  };
}
