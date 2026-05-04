import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Goal, Lock, Save, Sparkles, Star, Vote, Info } from "lucide-react";
import { fmtPartidoLargo } from "@/lib/dates";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import {
  useCloseMatchVoting,
  useMatch,
  useMatchPlayers,
  useSaveMatchPlayers,
  useUpdateMatch,
  type MatchPlayerInput,
} from "@/hooks/useMatches";
import { usePlayers } from "@/hooks/usePlayers";
import { useVotes, tallyVotes } from "@/hooks/useVotes";
import { FONDO, CALIFICACION_CRITERIOS } from "@/lib/scoring";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Row {
  player_id: string;
  equipo: "A" | "B";
  goles: number;
  asistencias: number;
  calificacion: number | null;
  presente: boolean;
}

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const voteWindowFor = (fechaIso: string, estado: string) =>
  estado === "jugado"
    ? {
        votacion_abre: fechaIso,
        votacion_cierra: new Date(new Date(fechaIso).getTime() + 48 * 60 * 60 * 1000).toISOString(),
      }
    : {};

const MatchStats = () => {
  const { id } = useParams<{ id: string }>();
  const { data: match, isLoading: loadingM } = useMatch(id);
  const { data: players = [] } = usePlayers();
  const { data: existingMP = [], isLoading: loadingMP } = useMatchPlayers(id);
  const { data: votes = [] } = useVotes(id);

  const saveMut = useSaveMatchPlayers();
  const updateMut = useUpdateMatch();
  const closeMut = useCloseMatchVoting();

  const [rows, setRows] = useState<Record<string, Row>>({});
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [fecha, setFecha] = useState("");
  const [estado, setEstado] = useState<string>("pendiente");
  const [mvpId, setMvpId] = useState<string>("none");
  const [golFechaId, setGolFechaId] = useState<string>("none");
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (!existingMP.length) return;
    const next: Record<string, Row> = {};
    existingMP.forEach((mp: any) => {
      next[mp.player_id] = {
        player_id: mp.player_id,
        equipo: mp.equipo,
        goles: Number(mp.goles ?? 0),
        asistencias: Number(mp.asistencias ?? 0),
        calificacion: mp.calificacion === null ? null : Number(mp.calificacion),
        presente: mp.presente !== false,
      };
    });
    setRows(next);
  }, [existingMP]);

  useEffect(() => {
    if (!match) return;
    setScoreA(Number(match.equipo_a_score ?? 0));
    setScoreB(Number(match.equipo_b_score ?? 0));
    setFecha(toDateTimeLocalValue(match.fecha));
    setEstado(match.estado);
    setMvpId(match.mvp_player_id ?? "none");
    setGolFechaId(match.gol_de_la_fecha_player_id ?? "none");
  }, [match]);

  const teamA = useMemo(() => Object.values(rows).filter((r) => r.presente && r.equipo === "A"), [rows]);
  const teamB = useMemo(() => Object.values(rows).filter((r) => r.presente && r.equipo === "B"), [rows]);
  const presentes = useMemo(() => Object.values(rows).filter((r) => r.presente), [rows]);

  const mvpTally = useMemo(() => tallyVotes(votes, "mvp"), [votes]);
  const goalTally = useMemo(() => tallyVotes(votes, "goal"), [votes]);
  const totalVoters = useMemo(() => new Set(votes.map((v) => v.voter_player_id)).size, [votes]);
  const isFriendly = Boolean((match as any)?.is_friendly);
  const eloApplied = Boolean((match as any)?.elo_applied);

  const closeBlockers = useMemo(() => {
    const issues: string[] = [];
    if (teamA.length === 0 || teamB.length === 0)
      issues.push("Ambos equipos deben tener al menos un jugador presente.");
    if (scoreA === 0 && scoreB === 0 && presentes.length > 0)
      issues.push("El resultado es 0-0. Guardá el marcador antes de cerrar.");
    if (mvpId === "none" && mvpTally.length === 0)
      issues.push("No hay MVP asignado ni votos de MVP.");
    return issues;
  }, [teamA, teamB, scoreA, scoreB, presentes, mvpId, mvpTally]);

  const playerById = (playerId: string) => players.find((p) => p.id === playerId);

  const updateRow = (playerId: string, patch: Partial<Row>) =>
    setRows((prev) => ({ ...prev, [playerId]: { ...prev[playerId], ...patch } }));

  const onSaveStats = async () => {
    if (!id) return;
    const payload: MatchPlayerInput[] = presentes.map((r) => ({
      player_id: r.player_id,
      equipo: r.equipo,
      goles: r.goles,
      asistencias: r.asistencias,
      calificacion: r.calificacion,
      presente: true,
    }));

    try {
      await saveMut.mutateAsync({
        matchId: id,
        players: payload,
        aportePorJugador: FONDO.APORTE_POR_PARTIDO,
      });
      // Transición automática pendiente → jugado al cargar stats
      if (estado === "pendiente" && payload.length > 0) {
        const fechaIso = fecha ? new Date(fecha).toISOString() : match?.fecha;
        await updateMut.mutateAsync({ id, estado: "jugado" as any, ...voteWindowFor(fechaIso!, "jugado") } as any);
        setEstado("jugado");
        toast.success("Stats guardadas · Partido marcado como jugado");
      } else {
        toast.success("Stats guardadas");
      }
    } catch (e: any) {
      toast.error(e.message ?? "No se pudieron guardar las stats.");
    }
  };

  const onSaveResult = async () => {
    if (!id) return;
    if (!fecha) {
      toast.error("La fecha y hora del partido es obligatoria.");
      return;
    }
    try {
      const fechaIso = new Date(fecha).toISOString();
      await updateMut.mutateAsync({
        id,
        fecha: fechaIso,
        equipo_a_score: scoreA,
        equipo_b_score: scoreB,
        estado: estado as any,
        mvp_player_id: isFriendly || mvpId === "none" ? null : mvpId,
        gol_de_la_fecha_player_id: isFriendly || golFechaId === "none" ? null : golFechaId,
        ...voteWindowFor(fechaIso, estado),
      } as any);
      toast.success(estado === "pendiente" ? "Partido guardado" : "Partido guardado · ELO actualizado");
    } catch (e: any) {
      if (e?.code === "23505" && e?.message?.includes("matches_fecha_key")) {
        toast.error("Ya existe un partido con esa fecha y hora.");
        return;
      }
      toast.error(e.message ?? "No se pudo guardar el partido.");
    }
  };

  const onSaveDate = async () => {
    if (!id) return;
    if (!fecha) {
      toast.error("La fecha y hora del partido es obligatoria.");
      return;
    }
    try {
      const fechaIso = new Date(fecha).toISOString();
      await updateMut.mutateAsync({
        id,
        fecha: fechaIso,
        ...voteWindowFor(fechaIso, estado),
      } as any);
      toast.success("Fecha actualizada");
    } catch (e: any) {
      if (e?.code === "23505" && e?.message?.includes("matches_fecha_key")) {
        toast.error("Ya existe un partido con esa fecha y hora.");
        return;
      }
      toast.error(e.message ?? "No se pudo guardar la fecha.");
    }
  };

  const onCloseVoting = async () => {
    if (!id) return;
    try {
      const result = await closeMut.mutateAsync(id);
      const mvp = players.find((p) => p.id === result.mvp);
      const gol = players.find((p) => p.id === result.gol);
      toast.success(`Votacion cerrada · MVP: ${mvp?.apodo ?? mvp?.nombre ?? "-"} · Gol: ${gol?.apodo ?? gol?.nombre ?? "-"}`);
      setConfirmClose(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo cerrar la votacion.");
    }
  };

  if (loadingM || loadingMP || !match) {
    return <p className="text-muted-foreground">Cargando partido...</p>;
  }

  const headerFecha = fecha ? new Date(fecha).toISOString() : match.fecha;

  const TeamCard = ({
    teamKey,
    title,
    playersRows,
    accentClass,
  }: {
    teamKey: "A" | "B";
    title: string;
    playersRows: Row[];
    accentClass: string;
  }) => (
    <div className="rounded-2xl border border-border/60 bg-card/20 overflow-hidden">
      <div className={`px-4 py-3 border-b border-border/50 ${accentClass}`}>
        <p className="font-black">{title}</p>
        <p className="text-xs text-muted-foreground">{playersRows.length} jugadores</p>
      </div>
      <div className="divide-y divide-border/40">
        {playersRows.map((row) => {
          const p = playerById(row.player_id);
          if (!p) return null;
          return (
            <div key={`${teamKey}-${row.player_id}`} className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="sm" />
                <p className="text-sm font-bold truncate">{p.apodo ?? p.nombre}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Goles</Label>
                  <Input
                    type="number"
                    min={0}
                    value={row.goles}
                    onChange={(e) => updateRow(row.player_id, { goles: Math.max(0, Number(e.target.value) || 0) })}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Asist.</Label>
                  <Input
                    type="number"
                    min={0}
                    value={row.asistencias}
                    onChange={(e) => updateRow(row.player_id, { asistencias: Math.max(0, Number(e.target.value) || 0) })}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                    Calif.
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px] text-xs space-y-1">
                        {CALIFICACION_CRITERIOS.map((c) => (
                          <p key={c.rango}><span className="font-bold">{c.rango}</span> — {c.label}</p>
                        ))}
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    value={row.calificacion ?? ""}
                    placeholder="-"
                    onChange={(e) => {
                      const v = e.target.value;
                      updateRow(row.player_id, { calificacion: v === "" ? null : Math.min(10, Math.max(1, Number(v))) });
                    }}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-border/60 bg-gradient-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Carga de stats</p>
            <h1 className="text-xl md:text-2xl font-black capitalize">
              {fmtPartidoLargo(headerFecha)}
            </h1>
            <p className="text-sm text-muted-foreground">
              Equipos definidos: {teamA.length} vs {teamB.length} · Carga rapida de goles, asistencias y calificacion.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border ${
                isFriendly ? "border-stats/40 bg-stats/10 text-stats" : "border-primary/40 bg-primary/10 text-primary"
              }`}>
                {isFriendly ? "Amistoso · solo ELO" : "Oficial · ranking + ELO"}
              </span>
              {eloApplied && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border border-mvp/40 bg-mvp/10 text-mvp">
                  ELO aplicado
                </span>
              )}
            </div>
          </div>
          <Button asChild variant="ghost">
            <Link to="/admin/partidos">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Volver
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-3">
        <TeamCard teamKey="A" title="Equipo A" playersRows={teamA} accentClass="bg-primary/10 text-primary" />
        <TeamCard teamKey="B" title="Equipo B" playersRows={teamB} accentClass="bg-stats/10 text-stats" />
      </div>

      <Button onClick={onSaveStats} disabled={saveMut.isPending} className="w-full shadow-glow" size="lg">
        <Save className="h-4 w-4 mr-2" />
        {saveMut.isPending ? "Guardando..." : "Guardar stats"}
      </Button>

      <section className="rounded-2xl border border-border/60 bg-gradient-card p-4 space-y-4">
        <h2 className="font-black">Resultado y premios</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-2 md:col-span-3">
            <Label>Fecha y hora</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="datetime-local"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="h-12 font-bold"
              />
              <Button type="button" variant="outline" onClick={onSaveDate} disabled={updateMut.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Guardar fecha
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-primary font-bold">Equipo A</Label>
            <Input type="number" min={0} value={scoreA} onChange={(e) => setScoreA(Math.max(0, Number(e.target.value) || 0))} className="h-12 text-2xl font-black text-center" />
          </div>
          <div className="space-y-2">
            <Label className="text-stats font-bold">Equipo B</Label>
            <Input type="number" min={0} value={scoreB} onChange={(e) => setScoreB(Math.max(0, Number(e.target.value) || 0))} className="h-12 text-2xl font-black text-center" />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="jugado">Jugado</SelectItem>
                <SelectItem value="cerrado">Cerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!isFriendly && (
            <>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-mvp" />
                  MVP
                </Label>
                <Select value={mvpId} onValueChange={setMvpId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin MVP" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin MVP</SelectItem>
                    {/* Si hay plantel cargado, mostrar solo los presentes; si no, todos los jugadores */}
                    {(presentes.length > 0 ? presentes.map((r) => playerById(r.player_id)).filter(Boolean) : players).map((p) => (
                      <SelectItem key={p!.id} value={p!.id}>
                        {p!.apodo ?? p!.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Goal className="h-3.5 w-3.5 text-stats" />
                  Gol de la fecha
                </Label>
                <Select value={golFechaId} onValueChange={setGolFechaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin gol destacado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin gol destacado</SelectItem>
                    {/* Si hay plantel con goles, filtrar por goles; si no, todos los jugadores */}
                    {presentes.some((r) => r.goles > 0)
                      ? presentes.filter((r) => r.goles > 0).map((r) => {
                          const p = playerById(r.player_id);
                          if (!p) return null;
                          return (
                            <SelectItem key={r.player_id} value={r.player_id}>
                              {p.apodo ?? p.nombre} ({r.goles} gol)
                            </SelectItem>
                          );
                        })
                      : players.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.apodo ?? p.nombre}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <Button onClick={onSaveResult} disabled={updateMut.isPending} className="w-full">
          <Sparkles className="h-4 w-4 mr-2" />
          {updateMut.isPending ? "Guardando..." : "Guardar partido"}
        </Button>
      </section>

      {!isFriendly && (
      <section className="rounded-2xl border border-mvp/30 bg-gradient-card p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-black flex items-center gap-2">
            <Vote className="h-4 w-4 text-mvp" />
            Votacion
          </h2>
          <span className="text-xs text-muted-foreground font-semibold">
            {totalVoters} {totalVoters === 1 ? "voto" : "votos"}
          </span>
        </div>

        {votes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aun no hay votos. Comparte <Link to="/votacion" className="text-mvp underline">/votacion</Link> con el grupo.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                <Star className="h-3 w-3 text-mvp" />
                MVP
              </p>
              {mvpTally.slice(0, 5).map((t) => {
                const p = playerById(t.player_id);
                if (!p) return null;
                return (
                  <div key={`mvp-${t.player_id}`} className="flex items-center gap-2 text-sm">
                    <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="sm" />
                    <span className="font-semibold flex-1 truncate">{p.apodo ?? p.nombre}</span>
                    <span className="font-black text-mvp">{t.count}</span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                <Goal className="h-3 w-3 text-stats" />
                Gol de la fecha
              </p>
              {goalTally.slice(0, 5).map((t) => {
                const p = playerById(t.player_id);
                if (!p) return null;
                return (
                  <div key={`goal-${t.player_id}`} className="flex items-center gap-2 text-sm">
                    <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="sm" />
                    <span className="font-semibold flex-1 truncate">{p.apodo ?? p.nombre}</span>
                    <span className="font-black text-stats">{t.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {closeBlockers.length > 0 && estado !== "cerrado" && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 space-y-1">
            <p className="text-xs font-bold text-yellow-600 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Para cerrar el partido primero:
            </p>
            {closeBlockers.map((b) => (
              <p key={b} className="text-xs text-yellow-600 pl-5">· {b}</p>
            ))}
          </div>
        )}
        <Button
          onClick={() => setConfirmClose(true)}
          disabled={estado === "cerrado" || closeMut.isPending || closeBlockers.length > 0}
          variant="outline"
          className="w-full border-mvp/40 hover:bg-mvp/10 disabled:opacity-50"
        >
          <Lock className="h-4 w-4 mr-2" />
          {estado === "cerrado" ? "Partido cerrado" : "Cerrar votación y aplicar ganadores"}
        </Button>
      </section>
      )}

      {!isFriendly && (
      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar votacion?</AlertDialogTitle>
            <AlertDialogDescription>
              Se asignaran MVP y Gol de la fecha segun los votos actuales y el partido pasara a estado <b>cerrado</b>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onCloseVoting} className="bg-mvp text-mvp-foreground hover:bg-mvp/90">
              Cerrar votacion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      )}
    </div>
  );
};

export default MatchStats;

