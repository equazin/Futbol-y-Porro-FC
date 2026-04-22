import { Trophy, Goal, Star, Award, Heart, Share2, ExternalLink } from "lucide-react";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { useRanking } from "@/hooks/useRanking";
import { useChemistry } from "@/hooks/useChemistry";
import { usePlayers } from "@/hooks/usePlayers";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatARS, FONDO } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Ranking = () => {
  const navigate = useNavigate();
  const { data: ranking = [], isLoading, isError, error, refetch, fetchStatus } = useRanking();

  const onShare = async () => {
    const publicUrl = `${window.location.origin}${window.location.pathname}#/ranking-publico`;
    if (navigator.share) {
      try { await navigator.share({ title: "Ranking Fútbol y Porro FC", url: publicUrl }); }
      catch { /* canceled */ }
    } else {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copiado");
    }
  };
  const { data: chemistry = [] } = useChemistry(2);
  const { data: players = [] } = usePlayers();
  const playerById = (id: string) => players.find((p) => p.id === id);

  if (fetchStatus === "paused") {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-black">Ranking</h1>
        <p className="text-muted-foreground">Sin conexion para cargar el ranking. Revisa internet y reintenta.</p>
        <Button onClick={() => refetch()}>Reintentar</Button>
      </div>
    );
  }

  if (isLoading) return <p className="text-muted-foreground">Cargando...</p>;

  if (isError) {
    const msg =
      error instanceof Error
        ? error.message
        : (error as any)?.message ?? "No se pudo cargar el ranking.";
    return (
      <div className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-black">Ranking</h1>
        <p className="text-destructive text-sm">{msg}</p>
        <Button onClick={() => refetch()}>Reintentar</Button>
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-black">Ranking</h1>
        <EmptyState icon={Trophy} title="Todavía no hay datos" description="Cerrá partidos para ver el ranking actualizado." />
      </div>
    );
  }

  const podio = ranking.slice(0, 3);
  const resto = ranking.slice(3);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
            <Trophy className="h-6 w-6 text-mvp" />
            Ranking del torneo
          </h1>
          <p className="text-sm text-muted-foreground">
            Puntos: PJ x30 + PG x20 + MVP x50 + Gol fecha x20 + Bonus
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate("/ranking-publico")} className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> Ver público
          </Button>
          <Button variant="outline" size="sm" onClick={onShare} className="gap-1.5">
            <Share2 className="h-3.5 w-3.5" /> Compartir
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        {[1, 0, 2].map((idx) => {
          const p = podio[idx];
          if (!p) return <div key={idx} className="rounded-xl border border-dashed border-border/50" />;
          const pos = idx + 1;
          const isFirst = pos === 1;
          const heightCls = isFirst ? "pt-4" : pos === 2 ? "pt-8" : "pt-10";
          const colorCls = isFirst
            ? "border-mvp/50 shadow-mvp bg-gradient-card"
            : pos === 2
            ? "border-primary/40 bg-gradient-card"
            : "border-stats/30 bg-gradient-card";
          const prizeLabel = pos === 1 ? formatARS(FONDO.PREMIO_1) : pos === 2 ? formatARS(FONDO.PREMIO_2) : "Remera";
          return (
            <div key={p.player_id} className={`relative rounded-xl border ${colorCls} p-3 text-center ${heightCls}`}>
              {isFirst && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-1 rounded-full bg-gradient-mvp text-mvp-foreground text-[10px] font-black shadow-mvp animate-pulse-glow">
                  TOP #1
                </div>
              )}
              <div className="flex justify-center mb-2">
                <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size={isFirst ? "xl" : "lg"} />
              </div>
              <p className="font-black text-sm truncate">{p.apodo ?? p.nombre}</p>
              <p className="text-3xl font-black mt-1">{p.puntos}</p>
              <p className="text-[10px] uppercase text-muted-foreground font-bold">pts</p>
              <p className="text-[10px] mt-2 font-bold text-mvp">{prizeLabel}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-card overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 border-b border-border/40 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          <div className="col-span-1">#</div>
          <div className="col-span-4">Jugador</div>
          <div className="col-span-1 text-center">PJ</div>
          <div className="col-span-1 text-center">
            <Goal className="inline h-3 w-3" />
          </div>
          <div className="col-span-1 text-center">A</div>
          <div className="col-span-1 text-center">
            <Star className="inline h-3 w-3" />
          </div>
          <div className="col-span-1 text-center">GF</div>
          <div className="col-span-1 text-center">Prom</div>
          <div className="col-span-1 text-right">Pts</div>
        </div>

        {[...podio.slice(3), ...resto].length > 0 || podio.length > 0
          ? ranking.map((p, i) => (
              <div
                key={p.player_id}
                className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border/30 last:border-b-0 items-center text-sm hover:bg-secondary/30 transition-smooth"
              >
                <div className={`col-span-1 font-black ${i === 0 ? "text-mvp" : i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                  {i + 1}
                </div>
                <div className="col-span-4 flex items-center gap-2 min-w-0">
                  <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="sm" />
                  <span className="font-bold truncate">{p.apodo ?? p.nombre}</span>
                </div>
                <div className="col-span-1 text-center text-muted-foreground">{p.partidos_jugados}</div>
                <div className="col-span-1 text-center font-bold">{p.goles}</div>
                <div className="col-span-1 text-center">{p.asistencias}</div>
                <div className="col-span-1 text-center text-mvp font-bold">{p.mvp_count || "-"}</div>
                <div className="col-span-1 text-center text-stats font-bold">{p.gol_fecha_count || "-"}</div>
                <div className="col-span-1 text-center text-muted-foreground">{p.promedio_rendimiento?.toFixed(1) ?? "-"}</div>
                <div className="col-span-1 text-right font-black text-lg">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="font-black text-lg hover:text-primary transition-smooth">
                        {p.puntos}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[280px] text-xs leading-relaxed">
                      <p className="font-bold mb-1">Desglose de puntos</p>
                      <p>PJ: {p.partidos_jugados} x 30 = {p.partidos_jugados * 30}</p>
                      <p>PG: {p.partidos_ganados} x 20 = {p.partidos_ganados * 20}</p>
                      <p>MVP: {p.mvp_count} x 50 = {p.mvp_count * 50}</p>
                      <p>Gol fecha: {p.gol_fecha_count} x 20 = {p.gol_fecha_count * 20}</p>
                      <p>Bonus: {p.bonus_points}</p>
                      <p className="mt-1 font-bold">Total: {p.puntos}</p>
                      <p className="text-muted-foreground">Efectividad: {p.efectividad}%</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))
          : null}
      </div>

      {chemistry.length > 0 && (
        <div className="rounded-xl border border-mvp/30 bg-gradient-card p-4">
          <h3 className="font-black mb-3 flex items-center gap-2">
            <Heart className="h-4 w-4 text-mvp" /> Mejores duplas (quimica)
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            % de victorias jugando juntos en el mismo equipo (min. 2 partidos).
          </p>
          <div className="space-y-2">
            {chemistry.slice(0, 5).map((c) => {
              const a = playerById(c.player_a_id);
              const b = playerById(c.player_b_id);
              if (!a || !b) return null;
              return (
                <div key={`${c.player_a_id}-${c.player_b_id}`} className="flex items-center gap-3 p-2 rounded-lg bg-card/50">
                  <div className="flex -space-x-2">
                    <PlayerAvatar nombre={a.nombre} foto_url={a.foto_url} size="sm" />
                    <PlayerAvatar nombre={b.nombre} foto_url={b.foto_url} size="sm" />
                  </div>
                  <p className="flex-1 text-sm font-bold truncate">
                    {a.apodo ?? a.nombre} <span className="text-muted-foreground">+</span> {b.apodo ?? b.nombre}
                  </p>
                  <div className="text-right">
                    <p className="font-black text-mvp">{Math.round(c.win_rate * 100)}%</p>
                    <p className="text-[10px] text-muted-foreground">
                      {c.ganados}G {c.empatados}E {c.perdidos}P
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-gradient-card p-4">
        <h3 className="font-black mb-3 flex items-center gap-2">
          <Award className="h-4 w-4 text-mvp" /> Premios del torneo
        </h3>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-mvp/10 border border-mvp/30">
            <p className="text-[10px] uppercase font-bold text-mvp">1 puesto</p>
            <p className="font-black">{formatARS(FONDO.PREMIO_1)}</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <p className="text-[10px] uppercase font-bold text-primary">2 puesto</p>
            <p className="font-black">{formatARS(FONDO.PREMIO_2)}</p>
          </div>
          <div className="p-3 rounded-lg bg-stats/10 border border-stats/30">
            <p className="text-[10px] uppercase font-bold text-stats">3 a 5</p>
            <p className="font-black">Remera</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ranking;
