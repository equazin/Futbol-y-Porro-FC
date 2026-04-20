import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Calendar, Trophy, Star, Wallet, ArrowRight, Goal, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { StatCard } from "@/components/ui/stat-card";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { useMatches } from "@/hooks/useMatches";
import { useRanking, useFondo } from "@/hooks/useRanking";
import { usePlayers } from "@/hooks/usePlayers";
import { formatARS } from "@/lib/scoring";
import stadiumHero from "@/assets/stadium-hero.jpg";

const Index = () => {
  const { data: matches = [] } = useMatches();
  const { data: ranking = [] } = useRanking();
  const { data: players = [] } = usePlayers();
  const { data: fondo } = useFondo();

  const ultimoPartido = useMemo(
    () => matches.find((m) => m.estado !== "pendiente"),
    [matches]
  );
  const proximoPartido = useMemo(
    () => [...matches].reverse().find((m) => m.estado === "pendiente"),
    [matches]
  );
  const top10 = ranking.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 shadow-elevated">
        <img
          src={stadiumHero}
          alt="Estadio iluminado"
          className="absolute inset-0 h-full w-full object-cover opacity-50"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/80 to-transparent" />
        <div className="relative p-6 md:p-10 min-h-[220px] md:min-h-[280px] flex flex-col justify-end">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 w-fit">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Domingo de fútbol</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            Domingueros <span className="text-gradient-primary">FC</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-md">
            La cancha, las estadísticas y el fondo común — todo en un solo lugar.
          </p>
        </div>
      </section>

      {/* QUICK STATS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Jugadores"
          value={players.length}
          icon={Trophy}
          variant="primary"
        />
        <StatCard
          label="Partidos"
          value={matches.length}
          icon={Calendar}
          variant="stats"
        />
        <StatCard
          label="Fondo común"
          value={formatARS(fondo?.total ?? 0)}
          icon={Wallet}
          variant="mvp"
          hint={fondo ? `${formatARS(fondo.pendiente)} por cobrar` : undefined}
        />
        <StatCard
          label="MVPs entregados"
          value={matches.filter((m) => m.mvp_player_id).length}
          icon={Star}
        />
      </section>

      {/* PRÓXIMO + ÚLTIMO */}
      <section className="grid md:grid-cols-2 gap-4">
        {/* Próximo partido */}
        <div className="rounded-2xl border border-primary/30 bg-gradient-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Próximo partido</span>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          {proximoPartido ? (
            <div className="space-y-3">
              <p className="text-xl font-black">
                {format(new Date(proximoPartido.fecha), "EEEE d 'de' MMMM", { locale: es })}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(proximoPartido.fecha), "HH:mm 'hs'")}
              </p>
              <Button asChild className="w-full mt-2">
                <Link to={`/partidos/${proximoPartido.id}`}>
                  Cargar planteles <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No hay partido programado.</p>
              <Button asChild variant="default" className="w-full">
                <Link to="/partidos">Crear partido</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Último partido / MVP */}
        <div className="rounded-2xl border border-mvp/30 bg-gradient-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-mvp">Último partido</span>
            <Star className="h-4 w-4 text-mvp" />
          </div>
          {ultimoPartido ? (
            <div className="space-y-3">
              <div className="flex items-center justify-around bg-secondary/50 rounded-xl p-3">
                <div className="text-center">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold">Equipo A</p>
                  <p className="text-3xl font-black">{ultimoPartido.equipo_a_score}</p>
                </div>
                <span className="text-muted-foreground font-bold">vs</span>
                <div className="text-center">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold">Equipo B</p>
                  <p className="text-3xl font-black">{ultimoPartido.equipo_b_score}</p>
                </div>
              </div>
              {(ultimoPartido as any).mvp && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-mvp/10 border border-mvp/30">
                  <PlayerAvatar
                    nombre={(ultimoPartido as any).mvp.nombre}
                    foto_url={(ultimoPartido as any).mvp.foto_url}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase font-bold text-mvp">MVP</p>
                    <p className="text-sm font-bold truncate">{(ultimoPartido as any).mvp.apodo ?? (ultimoPartido as any).mvp.nombre}</p>
                  </div>
                </div>
              )}
              {(ultimoPartido as any).gol_fecha && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-stats/10 border border-stats/30">
                  <PlayerAvatar
                    nombre={(ultimoPartido as any).gol_fecha.nombre}
                    foto_url={(ultimoPartido as any).gol_fecha.foto_url}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase font-bold text-stats">Gol de la fecha</p>
                    <p className="text-sm font-bold truncate">{(ultimoPartido as any).gol_fecha.apodo ?? (ultimoPartido as any).gol_fecha.nombre}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aún no se jugaron partidos.</p>
          )}
        </div>
      </section>

      {/* TOP 10 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Trophy className="h-5 w-5 text-mvp" />
            Top 10 del torneo
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/ranking">Ver todo <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </div>
        {top10.length > 0 ? (
          <div className="rounded-2xl border border-border/60 bg-gradient-card overflow-hidden">
            {top10.map((row, i) => (
              <div
                key={row.player_id}
                className="flex items-center gap-3 p-3 border-b border-border/40 last:border-b-0 hover:bg-secondary/40 transition-smooth"
              >
                <div className={`w-7 text-center font-black text-sm ${
                  i === 0 ? "text-mvp" : i < 3 ? "text-primary" : "text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <PlayerAvatar nombre={row.nombre} foto_url={row.foto_url} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{row.apodo ?? row.nombre}</p>
                  <p className="text-xs text-muted-foreground flex gap-2">
                    <span><Goal className="inline h-3 w-3" /> {row.goles}</span>
                    <span>A: {row.asistencias}</span>
                    {row.mvp_count > 0 && <span className="text-mvp">★ {row.mvp_count}</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-lg leading-none">{row.puntos}</p>
                  <p className="text-[10px] uppercase text-muted-foreground font-bold">pts</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Cargá jugadores y partidos para ver el ranking.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Index;
