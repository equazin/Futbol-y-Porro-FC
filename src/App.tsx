import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const LegacyMatchRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/admin/partidos/${id}` : "/admin/partidos"} replace />;
};

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
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/votacion" element={<Votacion />} />
            </Route>

            <Route path="/partidos" element={<Navigate to="/admin/partidos" replace />} />
            <Route path="/partidos/:id" element={<LegacyMatchRedirect />} />
            <Route path="/jugadores" element={<Navigate to="/admin/jugadores" replace />} />
            <Route path="/fondo" element={<Navigate to="/admin/fondo" replace />} />
            <Route path="/multas" element={<Navigate to="/admin/multas" replace />} />

            <Route element={<RequireAdmin />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/partidos" element={<Partidos basePath="/admin/partidos" />} />
                <Route path="/admin/partidos/:id" element={<PartidoDetalle backPath="/admin/partidos" />} />
                <Route path="/admin/jugadores" element={<Jugadores />} />
                <Route path="/admin/fondo" element={<Fondo />} />
                <Route path="/admin/multas" element={<Multas />} />
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
