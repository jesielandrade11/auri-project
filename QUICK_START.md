# 🚀 Quick Start - Sistema Financeiro Integrado

## ⚡ Começando Agora

### 1. Instale as dependências (se ainda não instalou)
```bash
npm install
```

### 2. Configure as variáveis de ambiente
```bash
# .env
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_aqui
```

### 3. Inicie o projeto
```bash
npm run dev
```

## 📚 Como Usar os Novos Recursos

### Exemplo 1: Buscar Transações

```typescript
import { useTransacoes } from "@/hooks/useFinancialData";
import { LoadingState, ErrorState } from "@/components/common";

function MinhasPagina() {
  const { data: transacoes, isLoading, error, refetch } = useTransacoes({
    dataInicio: "2025-01-01",
    dataFim: "2025-12-31",
    status: ["pago"]
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div>
      {transacoes?.map(t => (
        <div key={t.id}>{t.descricao} - R$ {t.valor}</div>
      ))}
    </div>
  );
}
```

### Exemplo 2: Calcular KPIs

```typescript
import { useTransacoes, useContasBancarias } from "@/hooks/useFinancialData";
import { calcularKPIs, formatarMoeda } from "@/services/financialCalculations";

function DashboardSimples() {
  const { data: transacoes } = useTransacoes();
  const { data: contas } = useContasBancarias();

  const kpis = calcularKPIs(transacoes || [], contas || [], 30);

  return (
    <div>
      <h2>Faturamento: {formatarMoeda(kpis.faturamentoBruto)}</h2>
      <h2>Lucro: {formatarMoeda(kpis.lucroOperacional)}</h2>
      <h2>Margem: {kpis.margens.operacional.toFixed(1)}%</h2>
    </div>
  );
}
```

### Exemplo 3: Listar Categorias

```typescript
import { useCategorias } from "@/hooks/useFinancialData";

function ListaCategorias() {
  const { data: categorias, isLoading } = useCategorias("receita");

  if (isLoading) return <p>Carregando...</p>;

  return (
    <select>
      {categorias?.map(c => (
        <option key={c.id} value={c.id}>
          {c.icone} {c.nome}
        </option>
      ))}
    </select>
  );
}
```

## 🎯 Recursos Principais

### 1. Hooks Customizados
Todos os hooks estão em `src/hooks/useFinancialData.ts`:

```typescript
useTransacoes()       // Transações
useCategorias()       // Categorias
useCentrosCusto()     // Centros de custo
useContasBancarias()  // Contas bancárias
useContrapartes()     // Clientes/Fornecedores
useBudgets()          // Planejamento
useAging()            // Contas a pagar/receber
useDRECentroCusto()   // DRE por centro
useFluxoCaixa()       // Fluxo de caixa
```

### 2. Funções de Cálculo
Todas as funções estão em `src/services/financialCalculations.ts`:

```typescript
calcularKPIs()              // KPIs principais
calcularDRE()               // DRE completo
agruparPorCategoria()       // Agrupa por categoria
agruparPorPeriodo()         // Agrupa por período
calcularAging()             // Aging de títulos
formatarMoeda()             // Formata R$
formatarPorcentagem()       // Formata %
calcularVariacao()          // Calcula variação %
```

### 3. Componentes de UI
Todos os componentes estão em `src/components/common/`:

```typescript
<LoadingState />          // Estado de carregamento
<ErrorState />            // Estado de erro
<EmptyState />            // Estado vazio
<ErrorBoundary />         // Captura erros (já no App.tsx)
```

## 📖 Guias Disponíveis

1. **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** 
   - Guia completo de integração
   - Documentação de todos os hooks
   - Exemplos de uso
   - Boas práticas

2. **[MIGRATION_EXAMPLE.md](./MIGRATION_EXAMPLE.md)**
   - Como migrar páginas antigas
   - Comparação antes/depois
   - Checklist de migração
   - Métricas de melhoria

3. **[INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md)**
   - Resumo do que foi implementado
   - Benefícios e métricas
   - Estrutura final
   - Próximos passos

## 🔧 Configuração Atual

### QueryClient (App.tsx)
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,                    // 3 tentativas em erro
      refetchOnWindowFocus: false, // Não refetch ao focar janela
      staleTime: 60000,            // Cache de 1 minuto
    },
  },
});
```

### Cache por Hook
| Hook | Tempo de Cache | Realtime |
|------|---------------|----------|
| useTransacoes | 30s | ✅ Sim |
| useContasBancarias | 1min | ✅ Sim |
| useCategorias | 5min | ❌ Não |
| useCentrosCusto | 5min | ❌ Não |
| useContrapartes | 5min | ❌ Não |
| useBudgets | 1min | ❌ Não |
| useAging | 1min | ❌ Não |
| useDRECentroCusto | 1min | ❌ Não |
| useFluxoCaixa | 1min | ❌ Não |

## 🎨 Padrão de Código

### Template Básico de Página

```typescript
import { useSeuHook } from "@/hooks/useFinancialData";
import { LoadingState, ErrorState, EmptyState } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuaPagina() {
  const { data, isLoading, error, refetch } = useSeuHook();

  if (isLoading) {
    return <LoadingState message="Carregando..." fullScreen />;
  }

  if (error) {
    return (
      <ErrorState 
        title="Erro ao carregar"
        message={error.message}
        onRetry={refetch}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState 
        icon={YourIcon}
        title="Sem dados"
        description="Adicione itens para começar"
        actionLabel="Adicionar"
        onAction={() => navigate("/criar")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Título</h1>
        <p className="text-muted-foreground">Descrição</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conteúdo</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Seu conteúdo aqui */}
        </CardContent>
      </Card>
    </div>
  );
}
```

## 🐛 Debug

### React Query DevTools
Para debug de queries, adicione no `App.tsx`:

```typescript
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// No return do App
<ReactQueryDevtools initialIsOpen={false} />
```

### Console Logs
Todos os erros são automaticamente logados no console. Para mais detalhes:

```typescript
const { data, error } = useTransacoes();

console.log("Data:", data);
console.log("Error:", error);
```

## 📱 Estrutura de Páginas

Todas as páginas já estão conectadas:

```
✅ / (Dashboard)
✅ /contas (Contas Bancárias)
✅ /transacoes (Transações)
✅ /categorizacao (Categorização)
✅ /categorias (Gestão de Categorias)
✅ /centros-custo (Centros de Custo)
✅ /contrapartes (Clientes/Fornecedores)
✅ /planejamento (Orçamento)
✅ /fluxo-caixa (Fluxo de Caixa)
✅ /relatorios/aging (Aging)
✅ /relatorios/dre (DRE)
✅ /relatorios/fluxo-caixa (Relatório de Fluxo)
```

## 🚦 Status dos Recursos

| Recurso | Status | Observação |
|---------|--------|-----------|
| Hooks Customizados | ✅ | 10 hooks criados |
| Cálculos Centralizados | ✅ | 15+ funções |
| Componentes UI | ✅ | 4 componentes |
| Sincronização Realtime | ✅ | Em transações e contas |
| Cache Inteligente | ✅ | Configurado |
| Tratamento de Erros | ✅ | ErrorBoundary + ErrorState |
| Documentação | ✅ | 4 guias completos |
| TypeScript | ✅ | 100% tipado |

## 💡 Dicas Rápidas

### 1. Sempre use os hooks customizados
```typescript
// ✅ Correto
const { data } = useTransacoes();

// ❌ Evite
const [data, setData] = useState([]);
useEffect(() => { /* fetch manual */ }, []);
```

### 2. Use funções de formatação
```typescript
// ✅ Correto
import { formatarMoeda } from "@/services/financialCalculations";
formatarMoeda(1500.50); // "R$ 1.500,50"

// ❌ Evite
valor.toLocaleString(); // Inconsistente
```

### 3. Trate todos os estados
```typescript
// ✅ Correto
if (isLoading) return <LoadingState />;
if (error) return <ErrorState />;
if (!data?.length) return <EmptyState />;
return <Content />;

// ❌ Evite
return data ? <Content /> : <div>Loading...</div>;
```

### 4. Centralize cálculos
```typescript
// ✅ Correto
const kpis = calcularKPIs(transacoes, contas, 30);

// ❌ Evite
const receitas = transacoes.filter(...).reduce(...); // Duplicado
```

## 🎓 Próximos Aprendizados

1. Leia o [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) para detalhes
2. Veja o [MIGRATION_EXAMPLE.md](./MIGRATION_EXAMPLE.md) para exemplos
3. Explore o código em `src/pages/NewDashboard.tsx`
4. Teste com React Query DevTools
5. Experimente criar sua própria página

## ❓ FAQ

**P: Onde estão os hooks?**  
R: `src/hooks/useFinancialData.ts`

**P: Onde estão os cálculos?**  
R: `src/services/financialCalculations.ts`

**P: Como adicionar um novo hook?**  
R: Siga o padrão dos hooks existentes em `useFinancialData.ts`

**P: Como fazer cache invalidation?**  
R: `queryClient.invalidateQueries(["nome-da-query"])`

**P: Como desabilitar realtime?**  
R: Remova o `useEffect` com `supabase.channel()` do hook

**P: Por que usar ErrorBoundary?**  
R: Captura erros não tratados e evita crash da aplicação

## 🎉 Pronto!

Seu sistema financeiro está **100% integrado** e pronto para uso! 

Para começar, abra qualquer página e veja os dados carregando automaticamente do Supabase. 

Boa codificação! 🚀
