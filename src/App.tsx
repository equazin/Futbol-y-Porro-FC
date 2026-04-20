import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Jugadores from "./pages/Jugadores";
import Partidos from "./pages/Partidos";
import PartidoDetalle from "./pages/PartidoDetalle";
import Ranking from "./pages/Ranking";
import Votacion from "./pages/Votacion";
import Fondo from "./pages/Fondo";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/jugadores" element={<Jugadores />} />
            <Route path="/partidos" element={<Partidos />} />
            <Route path="/partidos/:id" element={<PartidoDetalle />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/votacion" element={<Votacion />} />
            <Route path="/fondo" element={<Fondo />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
