import { History, ListChecks, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Player } from "@/hooks/usePlayers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { cn } from "@/lib/utils";

interface StepPlayersProps {
  players: Player[];
  selectedIds: string[];
  loadingLast: boolean;
  lastMatchDate?: string | null;
  onTogglePlayer: (playerId: string, checked: boolean) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onUseLastMatch: () => void;
}

const positionLabel = (pos: Player["posicion"]) => {
  if (!pos) return "Sin posicion";
  if (pos === "arquero") return "Arquero";
  if (pos === "defensor") return "Defensor";
  if (pos === "mediocampista") return "Mediocampista";
  if (pos === "delantero") return "Delantero";
  return pos;
};

export const StepPlayers = ({
  players,
  selectedIds,
  loadingLast,
  lastMatchDate,
  onTogglePlayer,
  onSelectAll,
  onClear,
  onUseLastMatch,
}: StepPlayersProps) => {
  const selected = new Set(selectedIds);

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-border/60 bg-gradient-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold mb-1">Step 1</p>
            <h2 className="text-xl font-black">Seleccion de jugadores</h2>
            <p className="text-sm text-muted-foreground">Marca quienes van a jugar este domingo.</p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-center min-w-[98px]">
            <p className="text-[10px] uppercase text-primary font-bold">Seleccionados</p>
            <p className="text-2xl font-black">{selectedIds.length}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button type="button" variant="outline" onClick={onSelectAll}>
            <ListChecks className="h-4 w-4 mr-1.5" />
            Seleccionar todos
          </Button>
          <Button type="button" variant="outline" onClick={onUseLastMatch} disabled={loadingLast || !lastMatchDate}>
            <History className="h-4 w-4 mr-1.5" />
            {loadingLast
              ? "Cargando..."
              : lastMatchDate
                ? `Repetir del ${format(new Date(lastMatchDate), "d MMM", { locale: es })}`
                : "Sin partidos previos"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClear}>
            Limpiar
          </Button>
        </div>
      </header>

      <div className="rounded-2xl border border-border/60 bg-card/20 p-3">
        {players.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 text-center">No hay jugadores activos para seleccionar.</div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {players.map((p) => {
              const isSelected = selected.has(p.id);
              return (
                <label
                  key={p.id}
                  className={cn(
                    "rounded-xl border p-2.5 transition-smooth cursor-pointer bg-card/50",
                    isSelected ? "border-primary/50 bg-primary/10" : "border-border/40 hover:border-border/70",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox checked={isSelected} onCheckedChange={(v) => onTogglePlayer(p.id, !!v)} />
                    <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate">{p.apodo ?? p.nombre}</p>
                      <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{positionLabel(p.posicion)}</p>
                    </div>
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

