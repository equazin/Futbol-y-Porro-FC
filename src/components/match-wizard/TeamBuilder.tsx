import type { DragEvent } from "react";
import { Users } from "lucide-react";
import type { Player } from "@/hooks/usePlayers";
import { PlayerCard } from "./PlayerCard";
import { cn } from "@/lib/utils";

type Zone = "pool" | "A" | "B";

interface TeamBuilderProps {
  playersById: Record<string, Player>;
  pool: string[];
  teamA: string[];
  teamB: string[];
  onMove: (playerId: string, to: Zone, targetIndex?: number) => void;
}

interface DragPayload {
  playerId: string;
}

const zoneConfig: Record<Exclude<Zone, "pool">, { title: string; accent: string; border: string }> = {
  A: {
    title: "Equipo A",
    accent: "text-primary",
    border: "border-primary/35",
  },
  B: {
    title: "Equipo B",
    accent: "text-stats",
    border: "border-stats/35",
  },
};

const parseDragPayload = (event: DragEvent): DragPayload | null => {
  const raw = event.dataTransfer.getData("application/json");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
};

const TeamColumn = ({
  zone,
  ids,
  playersById,
  title,
  accentClass,
  borderClass,
  onMove,
}: {
  zone: Zone;
  ids: string[];
  playersById: Record<string, Player>;
  title: string;
  accentClass: string;
  borderClass: string;
  onMove: (playerId: string, to: Zone, targetIndex?: number) => void;
}) => (
  <div
    className={cn("rounded-2xl border bg-card/30 p-3 min-h-[220px]", borderClass)}
    onDragOver={(e) => e.preventDefault()}
    onDrop={(e) => {
      e.preventDefault();
      const payload = parseDragPayload(e);
      if (!payload) return;
      onMove(payload.playerId, zone, ids.length);
    }}
  >
    <div className="flex items-center justify-between mb-3">
      <p className={cn("text-sm font-black", accentClass)}>{title}</p>
      <span className="text-[10px] uppercase text-muted-foreground">{ids.length} jugadores</span>
    </div>

    <div className="space-y-2">
      {ids.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
          Suelta jugadores aqui
        </div>
      ) : (
        ids.map((id, index) => {
          const player = playersById[id];
          if (!player) return null;
          return (
            <PlayerCard
              key={`${zone}-${id}`}
              player={player}
              draggable
              compact
              onDragStart={(e) => {
                const payload: DragPayload = { playerId: id };
                e.dataTransfer.setData("application/json", JSON.stringify(payload));
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const payload = parseDragPayload(e);
                if (!payload) return;
                onMove(payload.playerId, zone, index);
              }}
            />
          );
        })
      )}
    </div>
  </div>
);

export const TeamBuilder = ({ playersById, pool, teamA, teamB, onMove }: TeamBuilderProps) => {
  return (
    <div className="space-y-3">
      <div
        className="rounded-2xl border border-border/60 bg-card/20 p-3 min-h-[120px]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const payload = parseDragPayload(e);
          if (!payload) return;
          onMove(payload.playerId, "pool", pool.length);
        }}
      >
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          Jugadores disponibles
        </p>
        {pool.length === 0 ? (
          <p className="text-xs text-muted-foreground">Todos los jugadores ya fueron asignados.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-2">
            {pool.map((id, index) => {
              const player = playersById[id];
              if (!player) return null;
              return (
                <PlayerCard
                  key={`pool-${id}`}
                  player={player}
                  draggable
                  compact
                  onDragStart={(e) => {
                    const payload: DragPayload = { playerId: id };
                    e.dataTransfer.setData("application/json", JSON.stringify(payload));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const payload = parseDragPayload(e);
                    if (!payload) return;
                    onMove(payload.playerId, "pool", index);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <TeamColumn
          zone="A"
          ids={teamA}
          playersById={playersById}
          title={zoneConfig.A.title}
          accentClass={zoneConfig.A.accent}
          borderClass={zoneConfig.A.border}
          onMove={onMove}
        />
        <TeamColumn
          zone="B"
          ids={teamB}
          playersById={playersById}
          title={zoneConfig.B.title}
          accentClass={zoneConfig.B.accent}
          borderClass={zoneConfig.B.border}
          onMove={onMove}
        />
      </div>
    </div>
  );
};
