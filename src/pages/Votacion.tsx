import { Vote } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

const Votacion = () => {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
          <Vote className="h-6 w-6 text-mvp" />
          Votación
        </h1>
        <p className="text-sm text-muted-foreground">MVP y Gol de la fecha</p>
      </header>

      <div className="rounded-xl border border-mvp/30 bg-gradient-card p-6">
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-mvp/15 border border-mvp/30">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-mvp">Próxima iteración</span>
        </div>
        <h2 className="text-xl font-black mb-2">Sistema de votación en camino 🗳️</h2>
        <p className="text-sm text-muted-foreground max-w-lg">
          La votación de MVP y Gol de la fecha se habilita en la próxima iteración. Mientras tanto,
          podés asignar el MVP y el gol de la fecha manualmente desde la pantalla del partido,
          en la pestaña <b>Resultado &amp; Premios</b>.
        </p>
      </div>
    </div>
  );
};

export default Votacion;
