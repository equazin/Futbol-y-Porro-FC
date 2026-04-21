import type { DragEvent, ReactNode } from "react";
import { GripVertical, Shield } from "lucide-react";
import type { Player } from "@/hooks/usePlayers";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { cn } from "@/lib/utils";

interface PlayerCardProps {
  player: Player;
  draggable?: boolean;
  compact?: boolean;
  className?: string;
  rightSlot?: ReactNode;
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: DragEvent<HTMLDivElement>) => void;
}

const POSITION_LABEL: Record<string, string> = {
  arquero: "ARQ",
  defensor: "DEF",
  mediocampista: "MED",
  delantero: "DEL",
};

export const PlayerCard = ({
  player,
  draggable = false,
  compact = false,
  className,
  rightSlot,
  onDragStart,
  onDragOver,
  onDrop,
}: PlayerCardProps) => {
  const position = player.posicion ? POSITION_LABEL[player.posicion] ?? player.posicion : "SIN POS";

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "rounded-xl border border-border/60 bg-card/70 hover:bg-card transition-smooth",
        compact ? "p-2" : "p-3",
        draggable && "cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {draggable && <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />}
        <PlayerAvatar nombre={player.nombre} foto_url={player.foto_url} size={compact ? "sm" : "md"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className={cn("font-bold truncate", compact ? "text-xs" : "text-sm")}>{player.apodo ?? player.nombre}</p>
            {(player as any).tipo === "invitado" && (
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-500">
                Inv
              </span>
            )}
          </div>
          <p className="text-[10px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {position} · ELO {Math.round((player as any).elo ?? 1000)}
          </p>
        </div>
        {rightSlot}
      </div>
    </div>
  );
};
