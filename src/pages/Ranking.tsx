import { Fragment, useMemo, useState } from "react";
import {
  Activity,
  Award,
  CalendarCheck,
  ExternalLink,
  Goal,
  Heart,
  ListChecks,
  Share2,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { useRankingDataset, type RankingHistoryPoint, type RankingRow } from "@/hooks/useRanking";
import { useChemistry } from "@/hooks/useChemistry";
import { usePlayers } from "@/hooks/usePlayers";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatARS, FONDO } from "@/lib/scoring";
import { fmtFechaMini } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HistoryMetric =
  | "puntos"
  | "partidos_jugados"
  | "partidos_ganados"
  | "goles"
  | "asistencias"
  | "mvp_count"
  | "gol_fecha_count";

const historyMetrics: Array<{
  key: HistoryMetric;
  label: string;
  shortLabel: string;
  deltaKey: keyof Pick<
    RankingHistoryPoint,
    | "puntos_delta"
    | "partidos_jugados_delta"
    | "partidos_ganados_delta"
    | "goles_delta"
    | "asistencias_delta"
    | "mvp_count_delta"
    | "gol_fecha_count_delta"
  >;
  icon: typeof Trophy;
  color: string;
}> = [
  { key: "puntos", label: "Puntos", shortLabel: "Pts", deltaKey: "puntos_delta", icon: Trophy, color: "text-mvp" },
  { key: "partidos_jugados", label: "Partidos jugados", shortLabel: "PJ", deltaKey: "partidos_jugados_delta", icon: CalendarCheck, color: "text-primary" },
  { key: "partidos_ganados", label: "Partidos ganados", shortLabel: "PG", deltaKey: "partidos_ganados_delta", icon: ListChecks, color: "text-emerald-400" },
  { key: "goles", label: "Goles", shortLabel: "Goles", deltaKey: "goles_delta", icon: Target, color: "text-destructive" },
  { key: "asistencias", label: "Asistencias", shortLabel: "A", deltaKey: "asistencias_delta", icon: Zap, color: "text-primary" },
  { key: "mvp_count", label: "MVP", shortLabel: "MVP", deltaKey: "mvp_count_delta", icon: Star, color: "text-mvp" },
  { key: "gol_fecha_count", label: "Gol de fecha", shortLabel: "GF", deltaKey: "gol_fecha_count_delta", icon: Goal, color: "text-stats" },
];

const chartConfig = {
  value: { label: "Valor", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

function formatDelta(value: number) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function getHistoryLabel(point: RankingHistoryPoint, index: number) {
  if (point.fecha) return fmtFechaMini(point.fecha);
  return index === 0 ? "Base" : "Inicio";
}

function buildChartData(timeline: RankingHistoryPoint[], metric: HistoryMetric) {
  return timeline.map((point, index) => ({
    id: point.id,
    label: getHistoryLabel(point, index),
    value: Number(point[metric] ?? 0),
    note: point.note,
  }));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "No se pudo cargar el ranking.";
}

function PlayerHistoryPanel({
  ranking,
  histories,
  player,
  selectedMetric,
  onMetricChange,
}: {
  ranking: RankingRow[];
  histories: Map<string, RankingHistoryPoint[]>;
  player: RankingRow;
  selectedMetric: HistoryMetric;
  onMetricChange: (metric: HistoryMetric) => void;
}) {
  const timeline = useMemo(
    () => histories.get(player.player_id) ?? [],
    [histories, player.player_id],
  );
  const selectedMetricConfig = historyMetrics.find((metric) => metric.key === selectedMetric) ?? historyMetrics[0];
  const chartData = useMemo(() => buildChartData(timeline, selectedMetric), [selectedMetric, timeline]);
  const lastEvents = [...timeline].reverse().filter((point) => point.source !== "start").slice(0, 5);

  return (
    <section className="border-b border-primary/25 bg-primary/5 p-4 md:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.95fr)]">
        <div className="space-y-4 min-w-0">
          <div className="flex items-start gap-3">
            <PlayerAvatar nombre={player.nombre} foto_url={player.foto_url} size="xl" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-primary">Detalle del jugador</p>
              <h2 className="text-xl md:text-2xl font-black truncate">{player.apodo ?? player.nombre}</h2>
              <p className="text-xs text-muted-foreground">
                #{ranking.findIndex((row) => row.player_id === player.player_id) + 1} en ranking - {player.efectividad}% efectividad
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {historyMetrics.map((metric) => {
              const Icon = metric.icon;
              const active = selectedMetric === metric.key;
              return (
                <button
                  key={metric.key}
                  type="button"
                  onClick={() => onMetricChange(metric.key)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-smooth bg-card/50 hover:bg-card min-h-[82px]",
                    active ? "border-primary/60 shadow-glow" : "border-border/50 hover:border-primary/35",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{metric.shortLabel}</span>
                    <Icon className={cn("h-4 w-4", metric.color)} />
                  </div>
                  <p className="mt-2 text-2xl font-black leading-none">{player[metric.key] ?? 0}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground truncate">{metric.label}</p>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div className="rounded-lg border border-border/50 bg-card/40 p-3">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Prom</p>
              <p className="font-black">{player.promedio_rendimiento?.toFixed(1) ?? "-"}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-card/40 p-3">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">ELO</p>
              <p className="font-black">{Math.round(Number(player.elo ?? 1000))}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-card/40 p-3">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Bonus</p>
              <p className="font-black">{player.bonus_points}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-card/40 p-3">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Multas</p>
              <p className="font-black">{formatARS(player.multas_pendientes)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Evolucion</p>
              <h3 className="font-black flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                {selectedMetricConfig.label}
              </h3>
            </div>
            <ToggleGroup
              type="single"
              value={selectedMetric}
              onValueChange={(value) => value && onMetricChange(value as HistoryMetric)}
              className="hidden sm:flex justify-end flex-wrap"
              size="sm"
              variant="outline"
            >
              {historyMetrics.slice(0, 4).map((metric) => (
                <ToggleGroupItem key={metric.key} value={metric.key} aria-label={metric.label} className="px-2">
                  {metric.shortLabel}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <ChartContainer config={chartConfig} className="h-[250px] w-full aspect-auto">
            <LineChart data={chartData} margin={{ left: 0, right: 12, top: 12, bottom: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={18} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={38} allowDecimals={false} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, _, item) => (
                      <>
                        <span className="text-muted-foreground">{item.payload.note}</span>
                        <span className="ml-auto font-mono font-semibold">{Number(value).toLocaleString()}</span>
                      </>
                    )}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-value)"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>

          <div className="rounded-lg border border-border/50 bg-card/40 overflow-hidden">
            {lastEvents.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">Todavia no tiene movimientos digitales.</p>
            ) : (
              <div className="divide-y divide-border/40">
                {lastEvents.map((event) => {
                  const delta = Number(event[selectedMetricConfig.deltaKey] ?? 0);
                  return (
                    <div key={event.id} className="grid grid-cols-[72px_minmax(0,1fr)_auto] gap-2 px-3 py-2 text-xs items-center">
                      <span className="text-muted-foreground">{event.fecha ? fmtFechaMini(event.fecha) : "Base"}</span>
                      <span className="font-bold truncate">{event.note}</span>
                      <span className={cn("font-black", delta > 0 ? selectedMetricConfig.color : "text-muted-foreground")}>
                        {formatDelta(delta)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const Ranking = () => {
  const navigate = useNavigate();
  const {
    data: rankingData,
    isLoading,
    isError,
    error,
    refetch,
    fetchStatus,
  } = useRankingDataset();
  const ranking = rankingData?.rows ?? [];
  const histories = useMemo(
    () => new Map((rankingData?.histories ?? []).map((history) => [history.player_id, history.timeline])),
    [rankingData?.histories],
  );
  const [expandedPlayerId, setExpandedPlayerId] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<HistoryMetric>("puntos");

  const onShare = async () => {
    const publicUrl = `${window.location.origin}${window.location.pathname}#/ranking-publico`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Ranking Futbol y Porro FC", url: publicUrl });
      } catch {
        /* canceled */
      }
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
    const msg = getErrorMessage(error);
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
        <EmptyState icon={Trophy} title="Todavia no hay datos" description="Cerra partidos para ver el ranking actualizado." />
      </div>
    );
  }

  const podio = ranking.slice(0, 3);
  const resto = ranking.slice(3);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-3">
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
          <Button variant="outline" size="icon" onClick={() => navigate("/ranking-publico")} aria-label="Ver ranking publico">
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onShare} aria-label="Compartir ranking">
            <Share2 className="h-4 w-4" />
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
            <div
              key={p.player_id}
              className={cn(
                "relative rounded-xl border p-3 text-center",
                colorCls,
                heightCls,
              )}
            >
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

      <div className="rounded-xl border border-border/60 bg-gradient-card overflow-hidden">
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
              <Fragment key={p.player_id}>
                <button
                  type="button"
                  onClick={() => setExpandedPlayerId((current) => (current === p.player_id ? "" : p.player_id))}
                  className={cn(
                    "w-full grid grid-cols-12 gap-2 px-4 py-3 border-b border-border/30 items-center text-sm text-left hover:bg-secondary/30 transition-smooth focus:outline-none focus:bg-secondary/40",
                    expandedPlayerId === p.player_id && "bg-primary/10 border-primary/30",
                  )}
                >
                  <div className={`col-span-1 font-black ${i === 0 ? "text-mvp" : i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                    {i + 1}
                  </div>
                  <div className="col-span-5 md:col-span-4 flex items-center gap-2 min-w-0">
                    <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="sm" />
                    <span className="font-bold truncate">{p.apodo ?? p.nombre}</span>
                  </div>
                  <div className="col-span-1 text-center text-muted-foreground">{p.partidos_jugados}</div>
                  <div className="col-span-1 text-center font-bold">{p.goles}</div>
                  <div className="hidden md:block col-span-1 text-center">{p.asistencias}</div>
                  <div className="col-span-1 text-center text-mvp font-bold">{p.mvp_count || "-"}</div>
                  <div className="hidden md:block col-span-1 text-center text-stats font-bold">{p.gol_fecha_count || "-"}</div>
                  <div className="hidden md:block col-span-1 text-center text-muted-foreground">{p.promedio_rendimiento?.toFixed(1) ?? "-"}</div>
                  <div className="col-span-2 md:col-span-1 text-right font-black text-lg">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex font-black text-lg hover:text-primary transition-smooth">{p.puntos}</span>
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
                </button>
                {expandedPlayerId === p.player_id && (
                  <PlayerHistoryPanel
                    ranking={ranking}
                    histories={histories}
                    player={p}
                    selectedMetric={selectedMetric}
                    onMetricChange={setSelectedMetric}
                  />
                )}
              </Fragment>
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
