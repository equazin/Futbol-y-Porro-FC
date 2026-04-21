import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Save, Star, Goal, Sparkles, Vote, Lock } from "lucide-react";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { usePlayers } from "@/hooks/usePlayers";
import {
  useMatch, useMatchPlayers, useSaveMatchPlayers, useUpdateMatch, useCloseMatchVoting,
  type MatchPlayerInput,
} from "@/hooks/useMatches";
import { useVotes, tallyVotes } from "@/hooks/useVotes";

interface Row {
  player_id: string;
  equipo: "A" | "B" | null;
  goles: number;
  asistencias: number;
  calificacion: number | null;
  presente: boolean;
}

const PartidoDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const { data: match, isLoading: loadingM } = useMatch(id);
  const { data: players = [] } = usePlayers();
  const { data: existingMP = [] } = useMatchPlayers(id);

  const saveMut = useSaveMatchPlayers();
  const updateMut = useUpdateMatch();

  const [rows, setRows] = useState<Record<string, Row>>({});
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [estado, setEstado] = useState<string>("pendiente");
  const [mvpId, setMvpId] = useState<string>("");
  const [golFechaId, setGolFechaId] = useState<string>("");

  // Inicializar rows cuando carguen jugadores y planteles
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

  const equipoA = useMemo(() => Object.values(rows).filter((r) => r.equipo === "A"), [rows]);
  const equipoB = useMemo(() => Object.values(rows).filter((r) => r.equipo === "B"), [rows]);
  const presentes = useMemo(
    () => Object.values(rows).filter((r) => r.equipo !== null),
    [rows]
  );

  const update = (pid: string, patch: Partial<Row>) =>
    setRows((prev) => ({ ...prev, [pid]: { ...prev[pid], ...patch, presente: patch.equipo !== null ? true : prev[pid].presente } }));

  const setEquipo = (pid: string, eq: "A" | "B" | null) => {
    setRows((prev) => ({
      ...prev,
      [pid]: { ...prev[pid], equipo: eq, presente: eq !== null },
    }));
  };

  const onSavePlanteles = async () => {
    if (!id) return;
    const toSave: MatchPlayerInput[] = presentes.map((r) => ({
      player_id: r.player_id,
      equipo: r.equipo as "A" | "B",
      goles: r.goles,
      asistencias: r.asistencias,
      calificacion: r.calificacion,
      presente: r.presente,
    }));
    try {
      await saveMut.mutateAsync({ matchId: id, players: toSave });
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

  if (loadingM || !match) {
    return <p className="text-muted-foreground">Cargando partido…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/partidos"><ArrowLeft className="h-4 w-4" /></Link>
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

        {/* PLANTELES */}
        <TabsContent value="planteles" className="space-y-4 mt-4">
          <div className="rounded-xl border border-border/60 bg-gradient-card p-4">
            <p className="text-xs text-muted-foreground mb-3">
              Asigná cada jugador a un equipo (A o B). Quien quede sin equipo se considera ausente.
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {players.map((p) => {
                const r = rows[p.id];
                if (!r) return null;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border/40 bg-card/50"
                  >
                    <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{p.apodo ?? p.nombre}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEquipo(p.id, r.equipo === "A" ? null : "A")}
                        className={`h-8 w-8 rounded-md text-xs font-black transition-smooth ${
                          r.equipo === "A"
                            ? "bg-primary text-primary-foreground shadow-glow"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        }`}
                      >A</button>
                      <button
                        type="button"
                        onClick={() => setEquipo(p.id, r.equipo === "B" ? null : "B")}
                        className={`h-8 w-8 rounded-md text-xs font-black transition-smooth ${
                          r.equipo === "B"
                            ? "bg-stats text-stats-foreground"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        }`}
                      >B</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats por equipo */}
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
                              type="number" min={0}
                              value={r.goles}
                              onChange={(e) => update(r.player_id, { goles: Math.max(0, Number(e.target.value) || 0) })}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase text-muted-foreground">Asist.</Label>
                            <Input
                              type="number" min={0}
                              value={r.asistencias}
                              onChange={(e) => update(r.player_id, { asistencias: Math.max(0, Number(e.target.value) || 0) })}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase text-muted-foreground">Calif.</Label>
                            <Input
                              type="number" min={1} max={10} step={0.5}
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

        {/* RESULTADO */}
        <TabsContent value="resultado" className="space-y-4 mt-4">
          <div className="rounded-xl border border-border/60 bg-gradient-card p-5">
            <h3 className="font-black mb-4">Marcador</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-primary font-bold">Equipo A</Label>
                <Input type="number" min={0} value={scoreA} onChange={(e) => setScoreA(Math.max(0, Number(e.target.value) || 0))} className="h-14 text-3xl font-black text-center" />
              </div>
              <div className="space-y-2">
                <Label className="text-stats font-bold">Equipo B</Label>
                <Input type="number" min={0} value={scoreB} onChange={(e) => setScoreB(Math.max(0, Number(e.target.value) || 0))} className="h-14 text-3xl font-black text-center" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-mvp/30 bg-gradient-card p-5">
            <h3 className="font-black mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-mvp" /> Premios
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Star className="h-3 w-3 text-mvp" /> MVP del partido</Label>
                <Select value={mvpId} onValueChange={setMvpId}>
                  <SelectTrigger><SelectValue placeholder="Sin MVP designado" /></SelectTrigger>
                  <SelectContent>
                    {presentes.map((r) => {
                      const p = players.find((pl) => pl.id === r.player_id)!;
                      return <SelectItem key={r.player_id} value={r.player_id}>{p.apodo ?? p.nombre}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Goal className="h-3 w-3 text-stats" /> Gol de la fecha</Label>
                <Select value={golFechaId} onValueChange={setGolFechaId}>
                  <SelectTrigger><SelectValue placeholder="Sin gol designado" /></SelectTrigger>
                  <SelectContent>
                    {presentes.filter((r) => r.goles > 0).map((r) => {
                      const p = players.find((pl) => pl.id === r.player_id)!;
                      return <SelectItem key={r.player_id} value={r.player_id}>{p.apodo ?? p.nombre} ({r.goles} ⚽)</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado del partido</Label>
                <Select value={estado} onValueChange={setEstado}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PartidoDetalle;
