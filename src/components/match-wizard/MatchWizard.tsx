import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePlayers } from "@/hooks/usePlayers";
import { useMatches, useCreateMatch, useSaveMatchPlayers } from "@/hooks/useMatches";
import { useMatchWizard } from "@/context/MatchWizardContext";
import { StepPlayers } from "./StepPlayers";
import { StepTeams } from "./StepTeams";
import { StepConfirm } from "./StepConfirm";
import { GuestPlayerDialog } from "./GuestPlayerDialog";
import { balanceTeams } from "@/lib/elo";
import { useRanking } from "@/hooks/useRanking";
import { supabase } from "@/integrations/supabase/client";

const steps = [
  { id: 1, title: "Jugadores" },
  { id: 2, title: "Equipos" },
  { id: 3, title: "Confirmacion" },
];

const shuffle = (ids: string[]) => {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const MatchWizard = () => {
  const navigate = useNavigate();
  const { data: players = [] } = usePlayers({ onlyActive: true, tipo: "all" });
  const { data: matches = [] } = useMatches();
  const { data: ranking = [] } = useRanking();
  const rankingByPlayer = useMemo(
    () => new Map(ranking.map((r) => [r.player_id, r])),
    [ranking],
  );
  const createMatchMut = useCreateMatch();
  const savePlayersMut = useSaveMatchPlayers();
  const { draft, setDraft, resetDraft } = useMatchWizard();

  const [step, setStep] = useState(1);
  const [loadingLastPlayers, setLoadingLastPlayers] = useState(false);
  const [loadingReuseTeams, setLoadingReuseTeams] = useState(false);
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);

  const titulares = useMemo(() => players.filter((p) => p.tipo !== "invitado"), [players]);
  const invitados = useMemo(() => players.filter((p) => p.tipo === "invitado"), [players]);

  const selectedPlayers = useMemo(
    () => players.filter((p) => draft.players.includes(p.id)),
    [players, draft.players],
  );
  const teamAPlayers = useMemo(() => selectedPlayers.filter((p) => draft.teamA.includes(p.id)), [selectedPlayers, draft.teamA]);
  const teamBPlayers = useMemo(() => selectedPlayers.filter((p) => draft.teamB.includes(p.id)), [selectedPlayers, draft.teamB]);

  const assignedCount = draft.teamA.length + draft.teamB.length;

  const togglePlayer = (playerId: string, checked: boolean) => {
    const next = checked
      ? [...draft.players, playerId]
      : draft.players.filter((id) => id !== playerId);
    const ordered = players.filter((p) => next.includes(p.id)).map((p) => p.id);
    setDraft({ players: ordered });
  };

  const selectAllPlayers = () => {
    setDraft({ players: titulares.map((p) => p.id) });
  };

  const clearPlayers = () => {
    setDraft({ players: [], teamA: [], teamB: [] });
  };

  const loadLastMatchPlayers = async () => {
    const lastMatch = matches[0];
    if (!lastMatch) {
      toast.error("No hay partidos previos para reutilizar.");
      return;
    }
    setLoadingLastPlayers(true);
    try {
      const { data, error } = await (supabase as any)
        .from("match_players")
        .select("player_id, presente")
        .eq("match_id", lastMatch.id);
      if (error) throw error;

      const ids = (data ?? []).filter((row: any) => row.presente).map((row: any) => row.player_id as string);
      if (ids.length === 0) {
        toast.error("El ultimo partido no tiene jugadores presentes.");
        return;
      }
      const uniqueIds = [...new Set(ids)];
      const ordered = players.filter((p) => uniqueIds.includes(p.id)).map((p) => p.id);
      setDraft({ players: ordered, teamA: [], teamB: [] });
      toast.success(`Se cargaron ${ordered.length} jugadores del ultimo partido.`);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudieron cargar los jugadores.");
    } finally {
      setLoadingLastPlayers(false);
    }
  };

  const movePlayer = (playerId: string, to: "pool" | "A" | "B", targetIndex?: number) => {
    if (!draft.players.includes(playerId)) return;

    const nextA = draft.teamA.filter((id) => id !== playerId);
    const nextB = draft.teamB.filter((id) => id !== playerId);

    if (to === "A") {
      const idx = typeof targetIndex === "number" ? Math.max(0, Math.min(targetIndex, nextA.length)) : nextA.length;
      nextA.splice(idx, 0, playerId);
    } else if (to === "B") {
      const idx = typeof targetIndex === "number" ? Math.max(0, Math.min(targetIndex, nextB.length)) : nextB.length;
      nextB.splice(idx, 0, playerId);
    }

    setDraft({ teamA: nextA, teamB: nextB });
  };

  const autoRandomTeams = () => {
    if (draft.players.length < 2) {
      toast.error("Selecciona al menos 2 jugadores.");
      return;
    }
    const mix = shuffle(draft.players);
    const split = Math.ceil(mix.length / 2);
    setDraft({ teamA: mix.slice(0, split), teamB: mix.slice(split) });
    toast.success("Equipos armados de forma aleatoria.");
  };

  const autoBalancedTeams = () => {
    if (selectedPlayers.length < 2) {
      toast.error("Selecciona al menos 2 jugadores.");
      return;
    }
    const lite = selectedPlayers.map((p) => ({
      id: p.id,
      elo: Number((p as any).elo ?? 1000),
      posicion: p.posicion,
      promedio_rendimiento: rankingByPlayer.get(p.id)?.promedio_rendimiento ?? null,
    }));
    const balanced = balanceTeams(lite);
    setDraft({ teamA: balanced.A, teamB: balanced.B });
    toast.success(`Equipos balanceados: ${balanced.A.length} vs ${balanced.B.length}.`);
  };

  const reuseLastTeams = async () => {
    const lastMatch = matches[0];
    if (!lastMatch) {
      toast.error("No hay partidos previos para reutilizar.");
      return;
    }
    setLoadingReuseTeams(true);
    try {
      const { data, error } = await (supabase as any)
        .from("match_players")
        .select("player_id, equipo, presente")
        .eq("match_id", lastMatch.id);
      if (error) throw error;
      const selected = new Set(draft.players);
      const teamA = (data ?? [])
        .filter((row: any) => row.presente && row.equipo === "A" && selected.has(row.player_id))
        .map((row: any) => row.player_id as string);
      const teamB = (data ?? [])
        .filter((row: any) => row.presente && row.equipo === "B" && selected.has(row.player_id))
        .map((row: any) => row.player_id as string);
      if (teamA.length === 0 || teamB.length === 0) {
        toast.error("No hay equipos reutilizables con la seleccion actual.");
        return;
      }
      setDraft({ teamA, teamB });
      toast.success("Equipos anteriores aplicados.");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudieron reutilizar equipos.");
    } finally {
      setLoadingReuseTeams(false);
    }
  };

  const validateStep = (stepToValidate: number) => {
    if (stepToValidate === 1) {
      if (draft.players.length < 2) {
        toast.error("Debes seleccionar al menos 2 jugadores.");
        return false;
      }
    }
    if (stepToValidate === 2) {
      if (draft.teamA.length === 0 || draft.teamB.length === 0) {
        toast.error("Cada equipo debe tener al menos 1 jugador.");
        return false;
      }
      if (assignedCount !== draft.players.length) {
        toast.error("Todos los jugadores seleccionados deben estar asignados a un equipo.");
        return false;
      }
    }
    if (stepToValidate === 3) {
      const venue = draft.venuePreset === "Otra" ? draft.venueCustom.trim() : draft.venuePreset.trim();
      if (!draft.fecha) {
        toast.error("Debes definir fecha y hora.");
        return false;
      }
      if (!venue) {
        toast.error("Debes definir la sede del partido.");
        return false;
      }
    }
    return true;
  };

  const onNext = () => {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(3, prev + 1));
  };

  const onBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const onCreateMatch = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    const venue = draft.venuePreset === "Otra" ? draft.venueCustom.trim() : draft.venuePreset.trim();
    try {
      const match = await createMatchMut.mutateAsync({
        fecha: new Date(draft.fecha).toISOString(),
        notas: venue,
        estado: "pendiente",
      } as any);

      const playersPayload = [
        ...draft.teamA.map((id) => ({
          player_id: id,
          equipo: "A" as const,
          goles: 0,
          asistencias: 0,
          calificacion: null,
          presente: true,
        })),
        ...draft.teamB.map((id) => ({
          player_id: id,
          equipo: "B" as const,
          goles: 0,
          asistencias: 0,
          calificacion: null,
          presente: true,
        })),
      ];

      await savePlayersMut.mutateAsync({
        matchId: match.id,
        players: playersPayload,
        aportePorJugador: draft.contribution,
      });

      toast.success("Partido creado. Ahora puedes cargar stats.");
      resetDraft();
      setStep(1);
      navigate(`/admin/partidos/${match.id}/stats`);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo crear el partido.");
    }
  };

  const progress = (step / steps.length) * 100;
  const isCreating = createMatchMut.isPending || savePlayersMut.isPending;

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-primary/35 bg-gradient-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Wizard de partido</p>
            <h1 className="text-2xl md:text-3xl font-black">Nuevo partido</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Flujo guiado para seleccionar jugadores, armar equipos y confirmar fondo.
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate("/admin/partidos")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Volver
          </Button>
        </div>

        <div className="mt-4">
          <Progress value={progress} className="h-2" />
          <div className="grid grid-cols-3 gap-2 mt-2">
            {steps.map((s) => (
              <div
                key={s.id}
                className={`rounded-lg border px-2 py-1 text-center text-xs font-semibold ${
                  s.id === step
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : s.id < step
                    ? "border-mvp/35 bg-mvp/10 text-mvp"
                    : "border-border/50 text-muted-foreground"
                }`}
              >
                {s.id < step ? <CheckCircle2 className="inline h-3.5 w-3.5 mr-1" /> : null}
                Step {s.id}: {s.title}
              </div>
            ))}
          </div>
        </div>
      </header>

      {step === 1 && (
        <StepPlayers
          titulares={titulares}
          invitados={invitados}
          selectedIds={draft.players}
          loadingLast={loadingLastPlayers}
          lastMatchDate={matches[0]?.fecha ?? null}
          onTogglePlayer={togglePlayer}
          onSelectAll={selectAllPlayers}
          onClear={clearPlayers}
          onUseLastMatch={loadLastMatchPlayers}
          onAddGuest={() => setGuestDialogOpen(true)}
        />
      )}

      {step === 2 && (
        <StepTeams
          selectedPlayers={selectedPlayers}
          teamA={draft.teamA}
          teamB={draft.teamB}
          onMovePlayer={movePlayer}
          onAutoRandom={autoRandomTeams}
          onAutoBalance={autoBalancedTeams}
          onReuseLastTeams={reuseLastTeams}
          loadingReuse={loadingReuseTeams}
        />
      )}

      {step === 3 && (
        <StepConfirm
          selectedPlayers={selectedPlayers}
          teamAPlayers={teamAPlayers}
          teamBPlayers={teamBPlayers}
          contribution={draft.contribution}
          fecha={draft.fecha}
          venuePreset={draft.venuePreset}
          venueCustom={draft.venueCustom}
          onContributionChange={(value) => setDraft({ contribution: value })}
          onFechaChange={(value) => setDraft({ fecha: value })}
          onVenuePresetChange={(value) => setDraft({ venuePreset: value })}
          onVenueCustomChange={(value) => setDraft({ venueCustom: value })}
        />
      )}

      <GuestPlayerDialog
        open={guestDialogOpen}
        onOpenChange={setGuestDialogOpen}
        onCreated={(player) => {
          setGuestDialogOpen(false);
          togglePlayer(player.id, true);
        }}
      />

      <footer className="sticky bottom-2 z-20 rounded-2xl border border-border/60 bg-background/95 backdrop-blur px-3 py-3 flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={step === 1 || isCreating}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Atras
        </Button>

        {step < 3 ? (
          <Button type="button" onClick={onNext}>
            Siguiente
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        ) : (
          <Button type="button" onClick={onCreateMatch} disabled={isCreating} className="shadow-glow">
            <Sparkles className="h-4 w-4 mr-1.5" />
            {isCreating ? "Creando partido..." : "Crear partido"}
          </Button>
        )}
      </footer>
    </div>
  );
};

