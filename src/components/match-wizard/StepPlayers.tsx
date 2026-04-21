import { History, ListChecks, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Player } from "@/hooks/usePlayers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { cn } from "@/lib/utils";

interface StepPlayersProps {
  titulares: Player[];
  invitados: Player[];
  selectedIds: string[];
  loadingLast: boolean;
  lastMatchDate?: string | null;
  onTogglePlayer: (playerId: string, checked: boolean) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onUseLastMatch: () => void;
  onAddGuest: () => void;
}

const positionLabel = (pos: Player["posicion"]) => {
  if (!pos) return "Sin posicion";
  if (pos === "arquero") return "Arquero";
  if (pos === "defensor") return "Defensor";
  if (pos === "mediocampista") return "Mediocampista";
  if (pos === "delantero") return "Delantero";
  return pos;
};

const PlayerRow = ({
  player,
  isSelected,
  isGuest,
  onToggle,
}: {
  player: Player;
  isSelected: boolean;
  isGuest: boolean;
  onToggle: (id: string, checked: boolean) => void;
}) => (
  <label
    className={cn(
      "rounded-xl border p-2.5 transition-smooth cursor-pointer bg-card/50",
      isSelected ? "border-primary/50 bg-primary/10" : "border-border/40 hover:border-border/70",
    )}
  >
    <div className="flex items-center gap-2">
      <Checkbox checked={isSelected} onCheckedChange={(v) => onToggle(player.id, !!v)} />
      <PlayerAvatar nombre={player.nombre} foto_url={player.foto_url} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-bold truncate">{player.apodo ?? player.nombre}</p>
          {isGuest && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-500">
              Invitado
            </span>
          )}
        </div>
        <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{positionLabel(player.posicion)}</p>
      </div>
    </div>
  </label>
);

export const StepPlayers = ({
  titulares,
  invitados,
  selectedIds,
  loadingLast,
  lastMatchDate,
  onTogglePlayer,
  onSelectAll,
  onClear,
  onUseLastMatch,
  onAddGuest,
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

      {/* Plantel titular */}
      <div className="rounded-2xl border border-border/60 bg-card/20 p-3">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold mb-2 px-1">Plantel</p>
        {titulares.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 text-center">No hay jugadores activos para seleccionar.</p>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {titulares.map((p) => (
              <PlayerRow key={p.id} player={p} isSelected={selected.has(p.id)} isGuest={false} onToggle={onTogglePlayer} />
            ))}
          </div>
        )}
      </div>

      {/* Jugadores extra / invitados */}
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-[10px] uppercase tracking-[0.15em] text-amber-500 font-bold">
            Jugadores extra
            {invitados.length > 0 && ` (${invitados.filter((p) => selected.has(p.id)).length}/${invitados.length})`}
          </p>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10" onClick={onAddGuest}>
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            Agregar invitado
          </Button>
        </div>
        {invitados.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Agregá invitados si faltan jugadores para completar los equipos.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {invitados.map((p) => (
              <PlayerRow key={p.id} player={p} isSelected={selected.has(p.id)} isGuest onToggle={onTogglePlayer} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
