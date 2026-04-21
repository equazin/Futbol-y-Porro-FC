import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Trophy,
  Star,
  Wallet,
  ArrowRight,
  Goal,
  Sparkles,
  Pencil,
  Save,
  Trash2,
  BarChart3,
  Gift,
  CircleDollarSign,
  Shirt,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Cell, Pie, PieChart } from "recharts";
import { StatCard } from "@/components/ui/stat-card";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useAdminAuth } from "@/components/auth/AdminAuthProvider";
import { useMatches } from "@/hooks/useMatches";
import { useRanking, useFondo } from "@/hooks/useRanking";
import { usePlayers } from "@/hooks/usePlayers";
import { formatARS } from "@/lib/scoring";
import stadiumHero from "@/assets/stadium-hero.jpg";

type ManualMvpConfig = {
  playerId: string;
  note: string;
};

const RENDIMIENTO_COLORS = [
  "#16A34A",
  "#F59E0B",
  "#EF4444",
  "#38BDF8",
  "#A855F7",
  "#E2E8F0",
  "#22C55E",
  "#3B82F6",
  "#F97316",
  "#14B8A6",
];

const Index = () => {
  const { isAdmin } = useAdminAuth();
  const { data: matches = [] } = useMatches();
  const { data: ranking = [] } = useRanking();
  const { data: players = [] } = usePlayers();
  const { data: fondo } = useFondo();

  const ultimoPartido = useMemo(() => matches.find((m) => m.estado !== "pendiente"), [matches]);
  const proximoPartido = useMemo(() => [...matches].reverse().find((m) => m.estado === "pendiente"), [matches]);
  const top10 = ranking.slice(0, 10);
  const partidosJugadosCount = useMemo(() => matches.filter((m) => m.estado === "cerrado").length, [matches]);

  const rendimientoActual = useMemo(
    () =>
      top10.map((row, index) => ({
        key: row.player_id,
        name: row.apodo ?? row.nombre,
        puntos: row.puntos,
        color: RENDIMIENTO_COLORS[index % RENDIMIENTO_COLORS.length],
      })),
    [top10],
  );

  const rendimientoChartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {
      puntos: { label: "Puntos", color: RENDIMIENTO_COLORS[0] },
    };

    for (const item of rendimientoActual) {
      config[item.key] = { label: item.name, color: item.color };
    }

    return config;
  }, [rendimientoActual]);

  const year = new Date().getFullYear();
  const previousYear = year - 1;
  const manualStorageKey = `fyp:mvp_prev_year_manual:${previousYear}`;

  const [openManualDialog, setOpenManualDialog] = useState(false);
  const [manualPlayerId, setManualPlayerId] = useState("");
  const [manualNote, setManualNote] = useState(`${previousYear}`);
  const [manualConfig, setManualConfig] = useState<ManualMvpConfig | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(manualStorageKey);
      if (!raw) {
        setManualConfig(null);
        return;
      }
      const parsed = JSON.parse(raw) as ManualMvpConfig;
      if (!parsed?.playerId) {
        setManualConfig(null);
        return;
      }
      setManualConfig(parsed);
      setManualPlayerId(parsed.playerId);
      setManualNote(parsed.note || `${previousYear}`);
    } catch {
      setManualConfig(null);
    }
  }, [manualStorageKey, previousYear]);

  const mvpUltimaFecha = useMemo(() => {
    if (!ultimoPartido || !(ultimoPartido as any).mvp) return null;
    return {
      player: (ultimoPartido as any).mvp,
      fecha: ultimoPartido.fecha,
    };
  }, [ultimoPartido]);

  const mvpAnioPasadoManual = useMemo(() => {
    if (!manualConfig) return null;
    const player = players.find((p) => p.id === manualConfig.playerId);
    if (!player) return null;
    return {
      player,
      note: manualConfig.note || `${previousYear}`,
    };
  }, [manualConfig, players, previousYear]);

  const saveManualMvp = () => {
    if (!manualPlayerId) {
      toast.error("Selecciona un jugador");
      return;
    }
    const payload: ManualMvpConfig = {
      playerId: manualPlayerId,
      note: manualNote.trim() || `${previousYear}`,
    };
    localStorage.setItem(manualStorageKey, JSON.stringify(payload));
    setManualConfig(payload);
    setOpenManualDialog(false);
    toast.success("MVP del anio pasado guardado manualmente");
  };

  const clearManualMvp = () => {
    localStorage.removeItem(manualStorageKey);
    setManualConfig(null);
    setManualPlayerId("");
    setManualNote(`${previousYear}`);
    toast.success("MVP del anio pasado limpiado");
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 shadow-elevated">
        <img
          src={stadiumHero}
          alt="Estadio iluminado"
          className="absolute inset-0 h-full w-full object-cover opacity-50"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/80 to-transparent" />

        <div className="relative p-6 md:p-10 min-h-[260px] md:min-h-[300px] grid gap-5 md:grid-cols-[1fr_320px] items-end">
          <div>
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 w-fit">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Domingos de Futbol y Porro</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Futbol y Porro <span className="text-gradient-primary">FC</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-md">Las estadisticas, el ranking, el fondo comun y mas.</p>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-mvp/30 bg-card/70 backdrop-blur p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-mvp font-bold mb-2">MVP ultima fecha</p>
              {mvpUltimaFecha?.player ? (
                <div className="flex items-center gap-3">
                  <PlayerAvatar nombre={mvpUltimaFecha.player.nombre} foto_url={mvpUltimaFecha.player.foto_url} size="md" />
                  <div className="min-w-0">
                    <p className="font-black truncate">{mvpUltimaFecha.player.apodo ?? mvpUltimaFecha.player.nombre}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(mvpUltimaFecha.fecha), "d 'de' MMMM", { locale: es })}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sin MVP cargado aun.</p>
              )}
            </div>

            <div className="rounded-xl border border-primary/30 bg-card/70 backdrop-blur p-3">
              <div className="flex items-center justify-between mb-2 gap-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">MVP {previousYear} (manual)</p>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpenManualDialog(true)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {manualConfig && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={clearManualMvp}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {mvpAnioPasadoManual?.player ? (
                <div className="flex items-center gap-3">
                  <PlayerAvatar nombre={mvpAnioPasadoManual.player.nombre} foto_url={mvpAnioPasadoManual.player.foto_url} size="md" />
                  <div className="min-w-0">
                    <p className="font-black truncate">{mvpAnioPasadoManual.player.apodo ?? mvpAnioPasadoManual.player.nombre}</p>
                    <p className="text-xs text-muted-foreground">{mvpAnioPasadoManual.note}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No cargado manualmente.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Jugadores" value={players.length} icon={Trophy} variant="primary" />
        <StatCard label="Partidos" value={matches.length} icon={Calendar} variant="stats" />
        <StatCard
          label="Fondo comun"
          value={formatARS(fondo?.total ?? 0)}
          icon={Wallet}
          variant="mvp"
          hint={fondo ? `${formatARS(fondo.pendiente)} por cobrar` : undefined}
        />
        <StatCard label="MVPs entregados" value={matches.filter((m) => m.mvp_player_id).length} icon={Star} />
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-primary/30 bg-gradient-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Proximo partido</span>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          {proximoPartido ? (
            <div className="space-y-3">
              <p className="text-xl font-black">{format(new Date(proximoPartido.fecha), "EEEE d 'de' MMMM", { locale: es })}</p>
              <p className="text-sm text-muted-foreground">{format(new Date(proximoPartido.fecha), "HH:mm 'hs'")}</p>
              <Button asChild className="w-full mt-2">
                <Link to={isAdmin ? `/admin/partidos/${proximoPartido.id}` : `/partidos/${proximoPartido.id}`}>
                  {isAdmin ? "Cargar planteles" : "Ver detalle"} <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No hay partido programado.</p>
              <Button asChild variant="default" className="w-full">
                <Link to={isAdmin ? "/admin/partidos" : "/partidos"}>{isAdmin ? "Crear partido" : "Ver partidos"}</Link>
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-mvp/30 bg-gradient-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-mvp">Ultimo partido</span>
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
                  <PlayerAvatar nombre={(ultimoPartido as any).mvp.nombre} foto_url={(ultimoPartido as any).mvp.foto_url} size="sm" />
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
            <p className="text-sm text-muted-foreground">Aun no se jugaron partidos.</p>
          )}
        </div>
      </section>

      <section className="grid xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-5 w-5 text-stats" />
            <h3 className="text-2xl font-black tracking-tight">Rendimiento Actual</h3>
          </div>
          <p className="text-sm font-semibold mb-4">
            Partidos Jugados: <span className="text-mvp">{partidosJugadosCount}</span>
          </p>

          {rendimientoActual.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-[minmax(0,220px)_1fr] items-center">
              <ChartContainer config={rendimientoChartConfig} className="mx-auto aspect-square h-[220px]">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value, _, item) => (
                          <>
                            <span className="text-muted-foreground">{item.name}</span>
                            <span className="ml-auto font-mono font-semibold">{Number(value).toLocaleString()} pts</span>
                          </>
                        )}
                      />
                    }
                  />
                  <Pie data={rendimientoActual} dataKey="puntos" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2}>
                    {rendimientoActual.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {rendimientoActual.map((item) => (
                  <div key={`legend-${item.key}`} className="flex items-center gap-2 text-sm min-w-0">
                    <span className="h-2.5 w-2.5 rounded-[2px] shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin datos para mostrar rendimiento actual.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="h-5 w-5 text-mvp" />
            <h3 className="text-2xl font-black tracking-tight">Premios Temporada</h3>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between py-3 border-b border-border/40">
              <span className="text-2xl font-black text-mvp">1°</span>
              <span className="flex items-center gap-2 font-black text-xl">
                <CircleDollarSign className="h-5 w-5 text-mvp" />
                {formatARS(100000)}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border/40">
              <span className="text-2xl font-black text-muted-foreground">2°</span>
              <span className="flex items-center gap-2 font-black text-xl">
                <CircleDollarSign className="h-5 w-5 text-primary" />
                {formatARS(50000)}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border/40">
              <span className="text-2xl font-black text-primary">3°</span>
              <span className="flex items-center gap-2 font-black text-lg">
                <Shirt className="h-5 w-5 text-primary" />
                Remera Nuevos Trapos
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border/40">
              <span className="text-2xl font-black text-muted-foreground">4°</span>
              <span className="flex items-center gap-2 font-black text-lg">
                <Shirt className="h-5 w-5 text-primary" />
                Remera Nuevos Trapos
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-2xl font-black text-muted-foreground">5°</span>
              <span className="flex items-center gap-2 font-black text-lg">
                <Shirt className="h-5 w-5 text-primary" />
                Remera Nuevos Trapos
              </span>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Trophy className="h-5 w-5 text-mvp" />
            Top 10 del torneo
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/ranking">
              Ver todo <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
        {top10.length > 0 ? (
          <div className="rounded-2xl border border-border/60 bg-gradient-card overflow-hidden">
            {top10.map((row, i) => (
              <div
                key={row.player_id}
                className="flex items-center gap-3 p-3 border-b border-border/40 last:border-b-0 hover:bg-secondary/40 transition-smooth"
              >
                <div className={`w-7 text-center font-black text-sm ${i === 0 ? "text-mvp" : i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                  {i + 1}
                </div>
                <PlayerAvatar nombre={row.nombre} foto_url={row.foto_url} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{row.apodo ?? row.nombre}</p>
                  <p className="text-xs text-muted-foreground flex gap-2">
                    <span>
                      <Goal className="inline h-3 w-3" /> {row.goles}
                    </span>
                    <span>Asist: {row.asistencias}</span>
                    <span className={row.mvp_count > 0 ? "text-mvp font-semibold" : ""}>MVPs: {row.mvp_count ?? 0}</span>
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
            <p className="text-sm text-muted-foreground">Carga jugadores y partidos para ver el ranking.</p>
          </div>
        )}
      </section>

      <Dialog open={openManualDialog} onOpenChange={setOpenManualDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cargar MVP {previousYear} (manual)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Jugador</Label>
              <Select value={manualPlayerId} onValueChange={setManualPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona jugador" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.apodo ?? p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Texto secundario</Label>
              <Input value={manualNote} onChange={(e) => setManualNote(e.target.value)} placeholder={`${previousYear}`} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenManualDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveManualMvp}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
