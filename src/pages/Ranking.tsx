import { Trophy, Goal, Star, Award, Heart } from "lucide-react";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { useRanking } from "@/hooks/useRanking";
import { useChemistry } from "@/hooks/useChemistry";
import { usePlayers } from "@/hooks/usePlayers";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS, FONDO } from "@/lib/scoring";

const Ranking = () => {
  const { data: ranking = [], isLoading } = useRanking();
  const { data: chemistry = [] } = useChemistry(2);
  const { data: players = [] } = usePlayers();
  const playerById = (id: string) => players.find((p) => p.id === id);

  if (isLoading) return <p className="text-muted-foreground">Cargando…</p>;

  if (ranking.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-black">Ranking</h1>
        <EmptyState icon={Trophy} title="Aún sin datos" description="Cargá partidos cerrados para ver el ranking." />
      </div>
    );
  }

  const podio = ranking.slice(0, 3);
  const resto = ranking.slice(3);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
          <Trophy className="h-6 w-6 text-mvp" />
          Ranking del torneo
        </h1>
        <p className="text-sm text-muted-foreground">
          +1 asist. · +2 gol · +1 pase · +5 MVP · +3 gol fecha
        </p>
      </header>

      {/* PODIO */}
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
                  👑 #1
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

      {/* TABLA */}
      <div className="rounded-2xl border border-border/60 bg-gradient-card overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 border-b border-border/40 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          <div className="col-span-1">#</div>
          <div className="col-span-4">Jugador</div>
          <div className="col-span-1 text-center">PJ</div>
          <div className="col-span-1 text-center"><Goal className="inline h-3 w-3" /></div>
          <div className="col-span-1 text-center">A</div>
          <div className="col-span-1 text-center"><Star className="inline h-3 w-3" /></div>
          <div className="col-span-1 text-center">⚽⭐</div>
          <div className="col-span-1 text-center">Prom</div>
          <div className="col-span-1 text-right">Pts</div>
        </div>

        {[...podio.slice(3), ...resto].length > 0 || podio.length > 0 ? (
          ranking.map((p, i) => (
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
              <div className="col-span-1 text-center text-muted-foreground">
                {p.promedio_calificacion?.toFixed(1) ?? "-"}
              </div>
              <div className="col-span-1 text-right font-black text-lg">{p.puntos}</div>
            </div>
          ))
        ) : null}
      </div>

      {/* PREMIOS INFO */}
      <div className="rounded-xl border border-border/60 bg-gradient-card p-4">
        <h3 className="font-black mb-3 flex items-center gap-2"><Award className="h-4 w-4 text-mvp" /> Premios del torneo</h3>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-mvp/10 border border-mvp/30">
            <p className="text-[10px] uppercase font-bold text-mvp">1° puesto</p>
            <p className="font-black">{formatARS(FONDO.PREMIO_1)}</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <p className="text-[10px] uppercase font-bold text-primary">2° puesto</p>
            <p className="font-black">{formatARS(FONDO.PREMIO_2)}</p>
          </div>
          <div className="p-3 rounded-lg bg-stats/10 border border-stats/30">
            <p className="text-[10px] uppercase font-bold text-stats">3° a 5°</p>
            <p className="font-black">Remera</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ranking;
