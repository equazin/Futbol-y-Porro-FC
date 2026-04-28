import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminAuthProvider } from "@/components/auth/AdminAuthProvider";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import Index from "./pages/Index";
import Ranking from "./pages/Ranking";
import RankingPublico from "./pages/RankingPublico";
import Votacion from "./pages/Votacion";
import Partidos from "./pages/Partidos";
import PartidoDetalle from "./pages/PartidoDetalle";
import Jugadores from "./pages/Jugadores";
import Fondo from "./pages/Fondo";
import Multas from "./pages/Multas";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import MatchWizardPage from "./pages/admin/MatchWizardPage";
import MatchStats from "./pages/admin/MatchStats";
import Bonuses from "./pages/admin/Bonuses";
import Finanzas from "./pages/admin/Finanzas";
import FinePresets from "./pages/admin/FinePresets";
import Venues from "./pages/admin/Venues";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AdminAuthProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route path="/ranking-publico" element={<RankingPublico />} />
            <Route path="/admin/login" element={<AdminLogin />} />

            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/partidos" element={<Partidos basePath="/partidos" readOnly />} />
              <Route path="/partidos/:id" element={<PartidoDetalle backPath="/partidos" readOnly />} />
              <Route path="/jugadores" element={<Jugadores readOnly />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/votacion" element={<Votacion />} />
              <Route path="/fondo" element={<Fondo readOnly />} />
              <Route path="/multas" element={<Multas readOnly />} />
            </Route>

            <Route element={<RequireAdmin />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/partidos" element={<Partidos basePath="/admin/partidos" detailSuffix="/stats" readOnly={false} />} />
                <Route path="/admin/partidos/nuevo" element={<MatchWizardPage />} />
                <Route path="/admin/partidos/:id/stats" element={<MatchStats />} />
                <Route path="/admin/partidos/:id" element={<Navigate to="stats" replace />} />
                <Route path="/admin/jugadores" element={<Jugadores readOnly={false} />} />
                <Route path="/admin/fondo" element={<Fondo readOnly={false} />} />
                <Route path="/admin/multas" element={<Multas readOnly={false} />} />
                <Route path="/admin/bonuses" element={<Bonuses />} />
                <Route path="/admin/finanzas" element={<Finanzas />} />
                <Route path="/admin/fine-presets" element={<FinePresets />} />
                <Route path="/admin/canchas" element={<Venues />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </AdminAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
