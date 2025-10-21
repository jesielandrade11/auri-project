import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import NewDashboard from "./pages/NewDashboard";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Categorizacao from "./pages/Categorizacao";
import Categorias from "./pages/Categorias";
import Transacoes from "./pages/Transacoes";
import CentrosCusto from "./pages/CentrosCusto";
import Planejamento from "./pages/Planejamento";
import Contas from "./pages/Contas";
import FluxoCaixa from "./pages/FluxoCaixa";
import Contrapartes from "./pages/Contrapartes";
import FluxoCaixaReport from "./pages/reports/FluxoCaixa";
import DRECentroCusto from "./pages/reports/DRECentroCusto";
import Aging from "./pages/reports/Aging";
import Configuracoes from "./pages/Configuracoes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minuto
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <AuthGuard>
                  <AppLayout />
                </AuthGuard>
              }
            >
              <Route index element={<NewDashboard />} />
              <Route path="contas" element={<Contas />} />
              <Route path="transacoes" element={<Transacoes />} />
              <Route path="categorizacao" element={<Categorizacao />} />
              <Route path="categorias" element={<Categorias />} />
              <Route path="centros-custo" element={<CentrosCusto />} />
              <Route path="contrapartes" element={<Contrapartes />} />
              <Route path="planejamento" element={<Planejamento />} />
              <Route path="fluxo-caixa" element={<FluxoCaixa />} />
            <Route path="relatorios/fluxo-caixa" element={<FluxoCaixaReport />} />
            <Route path="relatorios/dre" element={<DRECentroCusto />} />
            <Route path="relatorios/aging" element={<Aging />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
