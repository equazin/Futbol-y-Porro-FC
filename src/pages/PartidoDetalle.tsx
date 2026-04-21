import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Save, Star, Goal, Sparkles, Vote, Lock, Shuffle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { usePlayers } from "@/hooks/usePlayers";
import {
  useMatch,
  useMatchPlayers,
  useSaveMatchPlayers,
  useUpdateMatch,
  useCloseMatchVoting,
  useMatchContributionAmount,
  type MatchPlayerInput,
} from "@/hooks/useMatches";
import { useVotes, tallyVotes } from "@/hooks/useVotes";
import { balanceTeams } from "@/lib/elo";
import { FONDO, formatARS } from "@/lib/scoring";

interface Row {
  player_id: string;
  equipo: "A" | "B" | null;
  goles: number;
  asistencias: number;
  calificacion: number | null;
  presente: boolean;
}

const PartidoDetalle = ({ backPath = "/admin/partidos" }: { backPath?: string }) => {
  const { id } = useParams<{ id: string }>();
  const { data: match, isLoading: loadingM } = useMatch(id);
  const { data: players = [] } = usePlayers();
  const { data: existingMP = [] } = useMatchPlayers(id);
  const { data: existingAporte } = useMatchContributionAmount(id);

  const saveMut = useSaveMatchPlayers();
  const updateMut = useUpdateMatch();
  const closeMut = useCloseMatchVoting();
  const { data: votes = [] } = useVotes(id);

  const [rows, setRows] = useState<Record<string, Row>>({});
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [estado, setEstado] = useState<string>("pendiente");
  const [mvpId, setMvpId] = useState<string>("");
  const [golFechaId, setGolFechaId] = useState<string>("");
  const [aportePorJugador, setAportePorJugador] = useState<number>(FONDO.APORTE_POR_PARTIDO);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (players.length === 0) return;
    const init: Record<string, Row> = {};
    players.forEach((p) => {
      const ex = existingMP.find((mp: any) => mp.player_id === p.id);
      init[p.id] = ex
        ? {
            player_id: p.id,
            equipo: ex.equipo,
            goles: ex.goles,
            asistencias: ex.asistencias,
            calificacion: ex.calificacion ? Number(ex.calificacion) : null,
            presente: ex.presente,
          }
        : {
            player_id: p.id,
            equipo: null,
            goles: 0,
            asistencias: 0,
            calificacion: null,
            presente: false,
          };
    });
    setRows(init);
  }, [players, existingMP]);

  useEffect(() => {
    if (match) {
      setScoreA(match.equipo_a_score);
      setScoreB(match.equipo_b_score);
      setEstado(match.estado);
      setMvpId(match.mvp_player_id ?? "");
      setGolFechaId(match.gol_de_la_fecha_player_id ?? "");
    }
  }, [match]);

  useEffect(() => {
    if (typeof existingAporte === "number" && existingAporte > 0) {
      setAportePorJugador(existingAporte);
    } else {
      setAportePorJugador(FONDO.APORTE_POR_PARTIDO);
    }
  }, [existingAporte]);

  const equipoA = useMemo(() => Object.values(rows).filter((r) => r.presente && r.equipo === "A"), [rows]);
  const equipoB = useMemo(() => Object.values(rows).filter((r) => r.presente && r.equipo === "B"), [rows]);
  const presentes = useMemo(() => Object.values(rows).filter((r) => r.presente), [rows]);

  const update = (pid: string, patch: Partial<Row>) =>
    setRows((prev) => ({ ...prev, [pid]: { ...prev[pid], ...patch } }));

  const rebalanceSelectedRows = (
    baseRows: Record<string, Row>,
    options?: { showToast?: boolean; showErrorOnEmpty?: boolean }
  ) => {
    const selected = Object.values(baseRows).filter((r) => r.presente);
    if (selected.length === 0) {
      if (options?.showErrorOnEmpty) toast.error("Marca al menos 1 jugador para armar equipos");
      return baseRows;
    }

    const next = { ...baseRows };
    selected.forEach((r) => {
      next[r.player_id] = { ...next[r.player_id], equipo: null, presente: true };
    });

    if (selected.length === 1) {
      const only = selected[0].player_id;
      next[only] = { ...next[only], equipo: "A", presente: true };
      return next;
    }

    const lite = selected.map((r) => {
      const p = players.find((pl) => pl.id === r.player_id)!;
      return { id: p.id, elo: Number((p as any).elo ?? 1000), posicion: p.posicion };
    });
    const { A, B } = balanceTeams(lite);

    A.forEach((pid) => {
      next[pid] = { ...next[pid], equipo: "A", presente: true };
    });
    B.forEach((pid) => {
      next[pid] = { ...next[pid], equipo: "B", presente: true };
    });

    if (options?.showToast) toast.success(`Equipos auto-armados: ${A.length} vs ${B.length}`);
    return next;
  };

  const setEquipo = (pid: string, eq: "A" | "B" | null) => {
    setRows((prev) => ({
      ...prev,
      [pid]: { ...prev[pid], equipo: eq, presente: eq !== null },
    }));
  };

  const toggleParticipa = (pid: string, willPlay: boolean) => {
    setRows((prev) => {
      const next = { ...prev };
      next[pid] = {
        ...next[pid],
        presente: willPlay,
        equipo: willPlay ? next[pid].equipo : null,
      };
      return rebalanceSelectedRows(next);
    });
  };

  const onBalance = () => {
    setRows((prev) => rebalanceSelectedRows(prev, { showToast: true, showErrorOnEmpty: true }));
  };

  const onSavePlanteles = async () => {
    if (!id) return;
    const sinEquipo = presentes.filter((r) => r.equipo === null);
    if (sinEquipo.length > 0) {
      toast.error("Hay jugadores marcados para jugar sin equipo asignado");
      return;
    }
    const toSave: MatchPlayerInput[] = presentes.map((r) => ({
      player_id: r.player_id,
      equipo: r.equipo as "A" | "B",
      goles: r.goles,
      asistencias: r.asistencias,
      calificacion: r.calificacion,
      presente: r.presente,
    }));
    try {
      await saveMut.mutateAsync({
        matchId: id,
        players: toSave,
        aportePorJugador,
      });
      toast.success(`Planteles guardados (${toSave.length} jugadores)`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onSaveResultado = async () => {
    if (!id) return;
    try {
      await updateMut.mutateAsync({
        id,
        equipo_a_score: scoreA,
        equipo_b_score: scoreB,
        estado: estado as any,
        mvp_player_id: mvpId || null,
        gol_de_la_fecha_player_id: golFechaId || null,
      });
      toast.success("Resultado guardado");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onCloseVoting = async () => {
    if (!id) return;
    try {
      const res = await closeMut.mutateAsync(id);
      const mvpName = players.find((p) => p.id === res.mvp)?.apodo ?? players.find((p) => p.id === res.mvp)?.nombre;
      const golName = players.find((p) => p.id === res.gol)?.apodo ?? players.find((p) => p.id === res.gol)?.nombre;
      toast.success(`Votacion cerrada · MVP: ${mvpName ?? "-"} · Gol: ${golName ?? "-"}`);
      setConfirmClose(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const mvpTally = useMemo(() => tallyVotes(votes, "mvp"), [votes]);
  const goalTally = useMemo(() => tallyVotes(votes, "goal"), [votes]);
  const totalVoters = useMemo(() => new Set(votes.map((v) => v.voter_player_id)).size, [votes]);

  if (loadingM || !match) {
    return <p className="text-muted-foreground">Cargando partido...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to={backPath}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-black capitalize">
            {format(new Date(match.fecha), "EEEE d 'de' MMMM, HH:mm 'hs'", { locale: es })}
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Estado: <span className="font-bold">{estado}</span> · {presentes.length} jugadores
          </p>
        </div>
      </div>

      <Tabs defaultValue="planteles" className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="planteles">Planteles & Stats</TabsTrigger>
          <TabsTrigger value="resultado">Resultado & Premios</TabsTrigger>
        </TabsList>

        <TabsContent value="planteles" className="space-y-4 mt-4">
          <div className="rounded-xl border border-border/60 bg-gradient-card p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] items-start mb-3">
              <p className="text-xs text-muted-foreground">
                Marca quienes juegan y los equipos se arman automaticamente con esos jugadores.
              </p>
              <Button type="button" size="sm" variant="outline" onClick={onBalance} className="border-mvp/40 hover:bg-mvp/10 shrink-0">
                <Shuffle className="h-3.5 w-3.5 mr-1.5" />
                Rebalancear
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <div className="space-y-2">
                <Label>Aporte por jugador (fondo comun)</Label>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={aportePorJugador}
                  onChange={(e) => setAportePorJugador(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
                <p className="text-[10px] uppercase font-bold text-primary">Resumen fondo</p>
                <p className="text-sm font-bold">
                  {presentes.length} jugadores x {formatARS(aportePorJugador)} ={" "}
                  {formatARS(presentes.length * aportePorJugador)}
                </p>
                <p className="text-[11px] text-muted-foreground">Default recomendado: {formatARS(FONDO.APORTE_POR_PARTIDO)}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              {players.map((p) => {
                const r = rows[p.id];
                if (!r) return null;
                return (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/40 bg-card/50">
                    <Checkbox
                      checked={r.presente}
                      onCheckedChange={(v) => toggleParticipa(p.id, !!v)}
                    />
                    <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{p.apodo ?? p.nombre}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {r.presente ? `Juega · Equipo ${r.equipo ?? "-"}` : "No juega"}
                      </p>
                    </div>
                    {r.presente && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setEquipo(p.id, "A")}
                          className={`h-8 w-8 rounded-md text-xs font-black transition-smooth ${
                            r.equipo === "A" ? "bg-primary text-primary-foreground shadow-glow" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                          }`}
                        >
                          A
                        </button>
                        <button
                          type="button"
                          onClick={() => setEquipo(p.id, "B")}
                          className={`h-8 w-8 rounded-md text-xs font-black transition-smooth ${
                            r.equipo === "B" ? "bg-stats text-stats-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                          }`}
                        >
                          B
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {[
            { team: "A" as const, list: equipoA, color: "primary", label: "Equipo A" },
            { team: "B" as const, list: equipoB, color: "stats", label: "Equipo B" },
          ].map(({ team, list, label, color }) => (
            <div key={team} className="rounded-xl border border-border/60 bg-gradient-card overflow-hidden">
              <div className={`px-4 py-3 border-b border-border/40 bg-${color}/10 flex items-center justify-between`}>
                <h3 className="font-black">{label}</h3>
                <span className="text-xs font-bold text-muted-foreground">{list.length} jugadores</span>
              </div>
              {list.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">Sin jugadores asignados</p>
              ) : (
                <div className="divide-y divide-border/40">
                  {list.map((r) => {
                    const p = players.find((pl) => pl.id === r.player_id)!;
                    return (
                      <div key={r.player_id} className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="sm" />
                          <p className="font-bold text-sm flex-1 truncate">{p.apodo ?? p.nombre}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-[10px] uppercase text-muted-foreground">Goles</Label>
                            <Input
                              type="number"
                              min={0}
                              value={r.goles}
                              onChange={(e) => update(r.player_id, { goles: Math.max(0, Number(e.target.value) || 0) })}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase text-muted-foreground">Asist.</Label>
                            <Input
                              type="number"
                              min={0}
                              value={r.asistencias}
                              onChange={(e) => update(r.player_id, { asistencias: Math.max(0, Number(e.target.value) || 0) })}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase text-muted-foreground">Calif.</Label>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              step={0.5}
                              value={r.calificacion ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                update(r.player_id, { calificacion: v === "" ? null : Math.min(10, Math.max(1, Number(v))) });
                              }}
                              placeholder="-"
                              className="h-9"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          <Button onClick={onSavePlanteles} disabled={saveMut.isPending} className="w-full shadow-glow" size="lg">
            <Save className="h-4 w-4 mr-2" />
            Guardar planteles & stats
          </Button>
        </TabsContent>

        <TabsContent value="resultado" className="space-y-4 mt-4">
          <div className="rounded-xl border border-border/60 bg-gradient-card p-5">
            <h3 className="font-black mb-4">Marcador</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-primary font-bold">Equipo A</Label>
                <Input
                  type="number"
                  min={0}
                  value={scoreA}
                  onChange={(e) => setScoreA(Math.max(0, Number(e.target.value) || 0))}
                  className="h-14 text-3xl font-black text-center"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-stats font-bold">Equipo B</Label>
                <Input
                  type="number"
                  min={0}
                  value={scoreB}
                  onChange={(e) => setScoreB(Math.max(0, Number(e.target.value) || 0))}
                  className="h-14 text-3xl font-black text-center"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-mvp/30 bg-gradient-card p-5">
            <h3 className="font-black mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-mvp" /> Premios
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-mvp" /> MVP del partido
                </Label>
                <Select value={mvpId} onValueChange={setMvpId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin MVP designado" />
                  </SelectTrigger>
                  <SelectContent>
                    {presentes.map((r) => {
                      const p = players.find((pl) => pl.id === r.player_id)!;
                      return (
                        <SelectItem key={r.player_id} value={r.player_id}>
                          {p.apodo ?? p.nombre}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Goal className="h-3 w-3 text-stats" /> Gol de la fecha
                </Label>
                <Select value={golFechaId} onValueChange={setGolFechaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin gol designado" />
                  </SelectTrigger>
                  <SelectContent>
                    {presentes
                      .filter((r) => r.goles > 0)
                      .map((r) => {
                        const p = players.find((pl) => pl.id === r.player_id)!;
                        return (
                          <SelectItem key={r.player_id} value={r.player_id}>
                            {p.apodo ?? p.nombre} ({r.goles} gol)
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado del partido</Label>
                <Select value={estado} onValueChange={setEstado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="jugado">Jugado</SelectItem>
                    <SelectItem value="cerrado">Cerrado (cuenta para ranking)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Solo los partidos <b>cerrados</b> suman MVP y gol de la fecha al ranking.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={onSaveResultado} disabled={updateMut.isPending} className="w-full shadow-glow" size="lg">
            <Save className="h-4 w-4 mr-2" />
            Guardar resultado
          </Button>

          <div className="rounded-xl border border-mvp/30 bg-gradient-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-black flex items-center gap-2">
                <Vote className="h-4 w-4 text-mvp" /> Votacion de los jugadores
              </h3>
              <span className="text-xs font-bold text-muted-foreground">
                {totalVoters} {totalVoters === 1 ? "voto" : "votos"}
              </span>
            </div>

            {votes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">
                Aun no hay votos. Comparte el link de{" "}
                <Link to="/votacion" className="text-mvp underline">
                  /votacion
                </Link>{" "}
                con el grupo.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2 flex items-center gap-1">
                    <Star className="h-3 w-3 text-mvp" /> MVP
                  </p>
                  <div className="space-y-1.5">
                    {mvpTally.slice(0, 5).map((t) => {
                      const p = players.find((pl) => pl.id === t.player_id);
                      if (!p) return null;
                      const pct = totalVoters ? (t.count / totalVoters) * 100 : 0;
                      return (
                        <div key={t.player_id} className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="sm" />
                            <p className="text-xs font-bold flex-1 truncate">{p.apodo ?? p.nombre}</p>
                            <span className="text-xs font-black text-mvp">{t.count}</span>
                          </div>
                          <div className="h-1 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full bg-mvp" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2 flex items-center gap-1">
                    <Goal className="h-3 w-3 text-stats" /> Gol de la fecha
                  </p>
                  <div className="space-y-1.5">
                    {goalTally.slice(0, 5).map((t) => {
                      const p = players.find((pl) => pl.id === t.player_id);
                      if (!p) return null;
                      const pct = totalVoters ? (t.count / totalVoters) * 100 : 0;
                      return (
                        <div key={t.player_id} className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="sm" />
                            <p className="text-xs font-bold flex-1 truncate">{p.apodo ?? p.nombre}</p>
                            <span className="text-xs font-black text-stats">{t.count}</span>
                          </div>
                          <div className="h-1 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full bg-stats" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <Button onClick={() => setConfirmClose(true)} disabled={estado === "cerrado" || closeMut.isPending} variant="outline" className="w-full border-mvp/40 hover:bg-mvp/10">
              <Lock className="h-4 w-4 mr-2" />
              {estado === "cerrado" ? "Votacion cerrada" : "Cerrar votacion y aplicar ganadores"}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Al cerrar se asignan automaticamente MVP y Gol de la fecha segun los votos. El partido pasa a estado <b>cerrado</b> y suma al ranking.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar la votacion?</AlertDialogTitle>
            <AlertDialogDescription>
              Se asignaran MVP y Gol de la fecha segun los {totalVoters} {totalVoters === 1 ? "voto" : "votos"} actuales y el partido quedara <b>cerrado</b> (no se podra volver a votar). Esta accion se puede deshacer cambiando el estado manualmente.
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
    </div>
  );
};

export default PartidoDetalle;
