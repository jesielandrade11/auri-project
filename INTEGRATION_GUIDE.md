# 📚 Guia de Integração - Sistema Financeiro

## 🎯 Visão Geral

Este guia documenta a integração completa entre o frontend (React + TypeScript) e o backend (Supabase) do sistema financeiro.

## 🏗️ Arquitetura

```
src/
├── hooks/
│   └── useFinancialData.ts          # Hooks customizados para queries
├── services/
│   └── financialCalculations.ts     # Lógica de negócio centralizada
├── components/
│   ├── common/                       # Componentes reutilizáveis
│   │   ├── ErrorBoundary.tsx
│   │   ├── LoadingState.tsx
│   │   ├── ErrorState.tsx
│   │   └── EmptyState.tsx
│   └── dashboard/                    # Componentes do dashboard
├── pages/                            # Páginas da aplicação
└── integrations/
    └── supabase/                     # Cliente e tipos do Supabase
```

## 🔌 Hooks Customizados

### Hooks Disponíveis

#### `useTransacoes(filters?)`
Busca transações com suporte a filtros e sincronização em tempo real.

```typescript
import { useTransacoes } from "@/hooks/useFinancialData";

const { data: transacoes, isLoading, error } = useTransacoes({
  dataInicio: "2025-01-01",
  dataFim: "2025-12-31",
  contaIds: ["conta-id-1", "conta-id-2"],
  categoriaIds: ["categoria-id-1"],
  status: ["pago", "pendente"]
});
```

#### `useCategorias(tipo?)`
Busca categorias ativas com cache otimizado.

```typescript
import { useCategorias } from "@/hooks/useFinancialData";

// Todas as categorias
const { data: categorias } = useCategorias();

// Apenas receitas
const { data: categorias } = useCategorias("receita");
```

#### `useContasBancarias()`
Busca contas bancárias com sincronização em tempo real.

```typescript
import { useContasBancarias } from "@/hooks/useFinancialData";

const { data: contas, isLoading } = useContasBancarias();
```

#### `useCentrosCusto()`
Busca centros de custo ativos.

```typescript
import { useCentrosCusto } from "@/hooks/useFinancialData";

const { data: centrosCusto } = useCentrosCusto();
```

#### `useContrapartes(papel?)`
Busca contrapartes (clientes e fornecedores).

```typescript
import { useContrapartes } from "@/hooks/useFinancialData";

// Todos
const { data: contrapartes } = useContrapartes();

// Apenas clientes
const { data: clientes } = useContrapartes("cliente");
```

#### `useBudgets(mesReferencia?)`
Busca planejamentos financeiros.

```typescript
import { useBudgets } from "@/hooks/useFinancialData";

const { data: budgets } = useBudgets("2025-10");
```

#### `useAging(papel?)`
Busca dados de aging (contas a pagar/receber).

```typescript
import { useAging } from "@/hooks/useFinancialData";

const { data: aging } = useAging("cliente");
```

#### `useDRECentroCusto(mesReferencia, centroCustoId?)`
Busca DRE por centro de custo.

```typescript
import { useDRECentroCusto } from "@/hooks/useFinancialData";

const { data: dre } = useDRECentroCusto("2025-10", "centro-id");
```

#### `useFluxoCaixa(dataInicio, dataFim)`
Busca dados do fluxo de caixa.

```typescript
import { useFluxoCaixa } from "@/hooks/useFinancialData";

const { data: fluxo } = useFluxoCaixa("2025-01-01", "2025-12-31");
```

## 🧮 Serviço de Cálculos Financeiros

### Funções Disponíveis

#### `calcularKPIs(transacoes, contas, diasPeriodo)`
Calcula KPIs principais do negócio.

```typescript
import { calcularKPIs } from "@/services/financialCalculations";

const kpis = calcularKPIs(transacoes, contas, 30);
// Retorna: {
//   faturamentoBruto,
//   gastosOperacionais,
//   lucroOperacional,
//   lucroLiquido,
//   roi,
//   saldoCaixa,
//   margens: { operacional, liquida },
//   diasReserva
// }
```

#### `calcularDRE(transacoes, taxaImpostos?)`
Calcula DRE completo.

```typescript
import { calcularDRE } from "@/services/financialCalculations";

const dre = calcularDRE(transacoes, 0.18);
// Retorna: {
//   receitaBruta,
//   receitaLiquida,
//   lucretaBruto,
//   lucroOperacional,
//   lucroLiquido,
//   ...
// }
```

#### `agruparPorCategoria(transacoes)`
Agrupa transações por categoria.

```typescript
import { agruparPorCategoria } from "@/services/financialCalculations";

const grupos = agruparPorCategoria(transacoes);
// Retorna: Array<{ categoria, valor, quantidade }>
```

#### `agruparPorPeriodo(transacoes, granularidade)`
Agrupa transações por período.

```typescript
import { agruparPorPeriodo } from "@/services/financialCalculations";

const periodos = agruparPorPeriodo(transacoes, "mensal");
// Retorna: Array<{ periodo, receitas, despesas, saldo }>
```

#### Outras funções úteis:

- `calcularSaldoConta(saldoInicial, transacoes)` - Calcula saldo de uma conta
- `calcularAging(transacoes)` - Calcula aging de transações
- `calcularPontoEquilibrio(custosFixos, margemContribuicao)` - Ponto de equilíbrio
- `calcularEBITDA(receitas, despesas, depreciacao, amortizacao)` - EBITDA
- `calcularPayback(investimentoInicial, fluxoCaixaMensal)` - Payback
- `formatarMoeda(valor)` - Formata para R$
- `formatarPorcentagem(valor, casasDecimais)` - Formata %
- `calcularVariacao(valorAtual, valorAnterior)` - Variação %

## 🎨 Componentes de UI

### LoadingState
Exibe estado de carregamento.

```typescript
import { LoadingState } from "@/components/common/LoadingState";

<LoadingState message="Carregando transações..." fullScreen />
```

### ErrorState
Exibe erro com opção de retry.

```typescript
import { ErrorState } from "@/components/common/ErrorState";

<ErrorState 
  title="Erro ao carregar"
  message="Não foi possível buscar os dados"
  onRetry={() => refetch()}
/>
```

### EmptyState
Exibe estado vazio com ação.

```typescript
import { EmptyState } from "@/components/common/EmptyState";
import { FileText } from "lucide-react";

<EmptyState 
  icon={FileText}
  title="Nenhuma transação"
  description="Adicione sua primeira transação para começar"
  actionLabel="Nova Transação"
  onAction={() => navigate("/transacoes")}
/>
```

## 📊 Exemplo Completo de Página

```typescript
import { useTransacoes, useCategorias } from "@/hooks/useFinancialData";
import { calcularKPIs } from "@/services/financialCalculations";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { FileText } from "lucide-react";

export default function MinhasPagina() {
  const { data: transacoes, isLoading, error, refetch } = useTransacoes({
    dataInicio: "2025-01-01",
    dataFim: "2025-12-31",
    status: ["pago"]
  });

  const { data: categorias } = useCategorias();

  // Loading
  if (isLoading) {
    return <LoadingState message="Carregando dados financeiros..." />;
  }

  // Error
  if (error) {
    return (
      <ErrorState 
        title="Erro ao carregar dados"
        message={error.message}
        onRetry={refetch}
      />
    );
  }

  // Empty
  if (!transacoes || transacoes.length === 0) {
    return (
      <EmptyState 
        icon={FileText}
        title="Nenhuma transação encontrada"
        description="Adicione transações para visualizar suas análises"
        actionLabel="Adicionar Transação"
        onAction={() => navigate("/transacoes")}
      />
    );
  }

  // Calcular KPIs
  const kpis = calcularKPIs(transacoes, contas, 30);

  return (
    <div>
      <h1>Faturamento: {formatarMoeda(kpis.faturamentoBruto)}</h1>
      <p>Margem: {formatarPorcentagem(kpis.margens.operacional)}</p>
      {/* Resto da página */}
    </div>
  );
}
```

## 🔄 Sincronização em Tempo Real

Os hooks `useTransacoes()` e `useContasBancarias()` já incluem sincronização em tempo real usando Supabase Realtime. Qualquer mudança no banco será automaticamente refletida no frontend.

## 🎯 Boas Práticas

1. **Use os hooks customizados** ao invés de queries inline
2. **Centralize cálculos** no serviço financialCalculations
3. **Trate erros** com ErrorState
4. **Mostre loading** com LoadingState
5. **Mostre estados vazios** com EmptyState
6. **Use ErrorBoundary** para capturar erros não tratados
7. **Aproveite o cache** do React Query (já configurado)

## 📝 Tipos TypeScript

Todos os tipos do banco de dados estão disponíveis em:

```typescript
import { Tables } from "@/integrations/supabase/types";

type Transacao = Tables<"transacoes">;
type Categoria = Tables<"categorias">;
type CentroCusto = Tables<"centros_custo">;
type ContaBancaria = Tables<"contas_bancarias">;
```

## 🔐 Autenticação

Todos os hooks verificam automaticamente a autenticação do usuário. Se não houver usuário autenticado, lançam um erro que pode ser capturado pelos componentes de erro.

## 📈 Performance

- **Cache inteligente**: Queries são cached por padrão
- **Sincronização eficiente**: Apenas dados alterados são refetched
- **Retry automático**: 3 tentativas em caso de falha
- **Stale time**: 60 segundos para evitar refetches desnecessários

## 🐛 Debug

Para debug de queries do React Query:

```typescript
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Adicione no App.tsx
<ReactQueryDevtools initialIsOpen={false} />
```

## ✅ Checklist de Integração

- [x] Hooks customizados criados
- [x] Serviço de cálculos centralizado
- [x] Sincronização em tempo real implementada
- [x] Componentes de UI (Loading, Error, Empty)
- [x] ErrorBoundary configurado
- [x] Tipos TypeScript disponíveis
- [x] Cache otimizado
- [x] Tratamento de erros consistente

## 🚀 Próximos Passos

1. Migrar páginas antigas para usar os novos hooks
2. Adicionar testes unitários para os cálculos
3. Implementar refresh manual em páginas críticas
4. Adicionar logs de auditoria para operações críticas
5. Otimizar queries com índices no banco

## 📞 Suporte

Para dúvidas sobre a integração, consulte:
- Documentação do Supabase: https://supabase.com/docs
- Documentação do React Query: https://tanstack.com/query/latest
- Código de exemplo nas páginas existentes
