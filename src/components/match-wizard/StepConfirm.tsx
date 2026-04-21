import { CalendarClock, MapPin, Wallet } from "lucide-react";
import type { Player } from "@/hooks/usePlayers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { formatARS } from "@/lib/scoring";

export const SEDES = ["Cancha Norte", "Cancha Sur", "Polideportivo", "Club Barrio", "Otra"] as const;

interface StepConfirmProps {
  selectedPlayers: Player[];
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  contribution: number;
  fecha: string;
  venuePreset: string;
  venueCustom: string;
  onContributionChange: (value: number) => void;
  onFechaChange: (value: string) => void;
  onVenuePresetChange: (value: string) => void;
  onVenueCustomChange: (value: string) => void;
}

const TeamPreview = ({ title, players, accent }: { title: string; players: Player[]; accent: string }) => (
  <div className="rounded-xl border border-border/50 bg-card/30 p-3">
    <p className={`text-xs uppercase tracking-wider font-bold ${accent} mb-2`}>{title}</p>
    {players.length === 0 ? (
      <p className="text-xs text-muted-foreground">Sin jugadores</p>
    ) : (
      <div className="space-y-2">
        {players.map((p) => (
          <div key={p.id} className="flex items-center gap-2">
            <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="sm" />
            <p className="text-sm font-semibold truncate">{p.apodo ?? p.nombre}</p>
          </div>
        ))}
      </div>
    )}
  </div>
);

export const StepConfirm = ({
  selectedPlayers,
  teamAPlayers,
  teamBPlayers,
  contribution,
  fecha,
  venuePreset,
  venueCustom,
  onContributionChange,
  onFechaChange,
  onVenuePresetChange,
  onVenueCustomChange,
}: StepConfirmProps) => {
  const aportantes = selectedPlayers.filter((p) => (p as any).tipo !== "invitado");
  const invitadosCount = selectedPlayers.length - aportantes.length;
  const total = contribution * aportantes.length;

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-border/60 bg-gradient-card p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold mb-1">Step 3</p>
        <h2 className="text-xl font-black">Confirmacion y fondo comun</h2>
        <p className="text-sm text-muted-foreground">Revisa datos del partido antes de crearlo.</p>
      </header>

      <div className="rounded-2xl border border-border/60 bg-card/20 p-4 space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <CalendarClock className="h-4 w-4" />
              Fecha y hora
            </Label>
            <Input type="datetime-local" value={fecha} onChange={(e) => onFechaChange(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Sede
            </Label>
            <Select value={venuePreset} onValueChange={onVenuePresetChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona sede" />
              </SelectTrigger>
              <SelectContent>
                {SEDES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {venuePreset === "Otra" && (
          <div className="space-y-2">
            <Label>Nombre de la sede</Label>
            <Input value={venueCustom} onChange={(e) => onVenueCustomChange(e.target.value)} placeholder="Ej: Complejo Don Bosco" />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Wallet className="h-4 w-4" />
              Aporte por jugador
            </Label>
            <Input
              type="number"
              min={0}
              step={100}
              value={contribution}
              onChange={(e) => onContributionChange(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <div className="rounded-xl border border-mvp/35 bg-mvp/10 p-3">
            <p className="text-[10px] uppercase tracking-wider text-mvp font-bold">Resumen fondo</p>
            <p className="text-lg font-black">{aportantes.length} aportan</p>
            <p className="text-sm font-semibold">{formatARS(contribution)} x jugador</p>
            {invitadosCount > 0 && (
              <p className="text-[10px] text-muted-foreground">{invitadosCount} invitado{invitadosCount > 1 ? "s" : ""} sin aporte</p>
            )}
            <p className="text-xl font-black text-mvp">{formatARS(total)}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <TeamPreview title="Equipo A" players={teamAPlayers} accent="text-primary" />
        <TeamPreview title="Equipo B" players={teamBPlayers} accent="text-stats" />
      </div>
    </section>
  );
};

