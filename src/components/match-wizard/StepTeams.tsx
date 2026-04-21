import { Bot, RefreshCcw, Shuffle, Sparkles } from "lucide-react";
import type { Player } from "@/hooks/usePlayers";
import { Button } from "@/components/ui/button";
import { TeamBuilder } from "./TeamBuilder";
import { avgElo } from "@/lib/elo";
import { cn } from "@/lib/utils";

interface StepTeamsProps {
  selectedPlayers: Player[];
  teamA: string[];
  teamB: string[];
  onMovePlayer: (playerId: string, to: "pool" | "A" | "B", targetIndex?: number) => void;
  onAutoRandom: () => void;
  onAutoBalance: () => void;
  onReuseLastTeams: () => void;
  loadingReuse: boolean;
}

const diffLabel = (avgA: number, avgB: number) => {
  if (!avgA || !avgB) return "Sin datos suficientes";
  const stronger = avgA >= avgB ? "Equipo A" : "Equipo B";
  const diff = Math.abs(avgA - avgB);
  const pct = Math.min(100, (diff / Math.max(avgA, avgB)) * 100);
  return `${stronger} +${pct.toFixed(1)}% mas fuerte`;
};

export const StepTeams = ({
  selectedPlayers,
  teamA,
  teamB,
  onMovePlayer,
  onAutoRandom,
  onAutoBalance,
  onReuseLastTeams,
  loadingReuse,
}: StepTeamsProps) => {
  const playersById = selectedPlayers.reduce<Record<string, Player>>((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});
  const selectedSet = new Set(selectedPlayers.map((p) => p.id));
  const assignedSet = new Set([...teamA, ...teamB]);
  const pool = selectedPlayers.map((p) => p.id).filter((id) => selectedSet.has(id) && !assignedSet.has(id));

  const teamAElo = avgElo(teamA.map((id) => Number((playersById[id] as any)?.elo ?? 1000)));
  const teamBElo = avgElo(teamB.map((id) => Number((playersById[id] as any)?.elo ?? 1000)));
  const totalAssigned = teamA.length + teamB.length;
  const isReady = teamA.length > 0 && teamB.length > 0 && totalAssigned === selectedPlayers.length;

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-border/60 bg-gradient-card p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold mb-1">Step 2</p>
        <h2 className="text-xl font-black">Armado de equipos</h2>
        <p className="text-sm text-muted-foreground">Arrastra jugadores al Equipo A o Equipo B. Puedes reordenar dentro de cada equipo.</p>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button type="button" variant="outline" onClick={onAutoRandom} disabled={selectedPlayers.length < 2}>
            <Shuffle className="h-4 w-4 mr-1.5" />
            Auto-armar aleatorio
          </Button>
          <Button type="button" variant="outline" onClick={onAutoBalance} disabled={selectedPlayers.length < 2}>
            <Bot className="h-4 w-4 mr-1.5" />
            Auto-armar balanceado
          </Button>
          <Button type="button" variant="ghost" onClick={onReuseLastTeams} disabled={loadingReuse}>
            <RefreshCcw className="h-4 w-4 mr-1.5" />
            {loadingReuse ? "Cargando..." : "Reutilizar equipos anteriores"}
          </Button>
        </div>
      </header>

      <TeamBuilder playersById={playersById} pool={pool} teamA={teamA} teamB={teamB} onMove={onMovePlayer} />

      <div className="grid md:grid-cols-3 gap-2">
        <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-primary font-bold">Equipo A</p>
          <p className="text-sm font-black">{teamA.length} jugadores · ELO {Math.round(teamAElo)}</p>
        </div>
        <div className="rounded-xl border border-stats/30 bg-stats/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-stats font-bold">Equipo B</p>
          <p className="text-sm font-black">{teamB.length} jugadores · ELO {Math.round(teamBElo)}</p>
        </div>
        <div className="rounded-xl border border-mvp/30 bg-mvp/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-mvp font-bold flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            Balance del partido
          </p>
          <p className="text-sm font-black">{diffLabel(teamAElo, teamBElo)}</p>
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border px-3 py-2 text-xs",
          isReady ? "border-primary/40 bg-primary/10 text-primary" : "border-amber-500/40 bg-amber-500/10 text-amber-200",
        )}
      >
        {isReady
          ? "Equipos listos. Puedes continuar al paso de confirmacion."
          : "Valida que ambos equipos tengan al menos 1 jugador y que todos los seleccionados esten asignados."}
      </div>
    </section>
  );
};

