import { useEffect, useMemo, useState } from "react";
import {
  Crown,
  Vote,
  UserCheck,
  Check,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import {
  useActiveElection,
  useCandidates,
  useElectionVoteCounts,
  useHasVotedElection,
  useRegisterCandidate,
  useCastElectionVote,
  type CandidateWithPlayer,
  type Election,
  type VoteCounts,
} from "@/hooks/useElections";

type Step = "overview" | "postular" | "identify" | "vote" | "done";

const PROPOSAL_TOPICS = [
  { key: "propuesta_organizacion", label: "⚽ Organización de los partidos" },
  { key: "propuesta_votacion_premios", label: "🏆 Sistema de votación / premios" },
  { key: "propuesta_economia", label: "💰 Economía del club" },
  { key: "propuesta_convivencia", label: "🌿 Código de convivencia (marihuana/alcohol)" },
  { key: "propuesta_tercer_tiempo", label: '🥩 El "tercer tiempo"' },
  { key: "propuesta_infraestructura", label: "🏟️ Infraestructura del grupo" },
  { key: "propuesta_constitucion", label: "📜 Constitución del club (reglas)" },
] as const;

const PROPOSAL_QUESTIONS = [
  { key: "propuesta_domingos", label: "¿Cómo mejorarías los domingos?" },
  { key: "propuesta_ausencias", label: "¿Qué harías con los que faltan mucho?" },
  { key: "propuesta_equipos", label: "¿Cómo evitarías equipos disparejos?" },
  { key: "propuesta_presupuesto", label: "¿Qué harías con el presupuesto del grupo?" },
  { key: "propuesta_convivencia2", label: "¿Cómo mejorarías la convivencia?" },
  { key: "propuesta_foules", label: "¿Cuál sería tu política frente a los foules?" },
] as const;

type ProposalKey =
  | (typeof PROPOSAL_TOPICS)[number]["key"]
  | (typeof PROPOSAL_QUESTIONS)[number]["key"];

type ProposalForm = Record<ProposalKey, string>;

const emptyProposals = (): ProposalForm =>
  Object.fromEntries(
    [...PROPOSAL_TOPICS, ...PROPOSAL_QUESTIONS].map((t) => [t.key, ""])
  ) as ProposalForm;

function useCountdown(target: string | null): string {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!target) return "";
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return "Cerrado";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m restantes`;
  return `${m} min restantes`;
}

function CandidateCard({
  candidate,
  votos,
  selected,
  onSelect,
  showVoteButton,
}: {
  candidate: CandidateWithPlayer;
  votos: number;
  selected: boolean;
  onSelect?: () => void;
  showVoteButton: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 transition-colors bg-card ${
        selected ? "border-primary ring-1 ring-primary" : "border-border"
      } ${candidate.eliminado ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-3">
        <PlayerAvatar
          nombre={candidate.players.nombre}
          foto_url={candidate.players.foto_url}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">
            {candidate.players.apodo ?? candidate.players.nombre}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {candidate.partido_politico}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-lg font-bold text-foreground">{votos}</span>
          <p className="text-xs text-muted-foreground">votos</p>
        </div>
      </div>

      {candidate.eliminado && (
        <p className="text-xs text-destructive font-medium">Eliminado (paso argentino)</p>
      )}

      <button
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? "Ocultar propuestas" : "Ver propuestas"}
      </button>

      {expanded && (
        <div className="space-y-2 text-sm text-muted-foreground border-t border-border pt-3">
          {[...PROPOSAL_TOPICS, ...PROPOSAL_QUESTIONS].map((t) => {
            const val = candidate[t.key as keyof CandidateWithPlayer] as string;
            if (!val) return null;
            return (
              <div key={t.key}>
                <p className="font-medium text-foreground">{t.label}</p>
                <p className="whitespace-pre-wrap">{val}</p>
              </div>
            );
          })}
        </div>
      )}

      {showVoteButton && !candidate.eliminado && (
        <Button
          variant={selected ? "default" : "outline"}
          size="sm"
          className="w-full"
          onClick={onSelect}
        >
          {selected ? <><Check size={14} className="mr-1" /> Seleccionado</> : "Votar a este candidato"}
        </Button>
      )}
    </div>
  );
}

function StatusBadge({ estado }: { estado: Election["estado"] }) {
  const map: Record<Election["estado"], { label: string; cls: string }> = {
    postulacion: { label: "📋 Postulaciones abiertas", cls: "bg-blue-500/15 text-blue-400" },
    votacion: { label: "🗳️ Votación en curso", cls: "bg-primary/15 text-primary" },
    segunda_vuelta: { label: "🔄 Segunda vuelta", cls: "bg-amber-500/15 text-amber-400" },
    cerrada: { label: "✅ Elección cerrada", cls: "bg-secondary text-secondary-foreground" },
  };
  const { label, cls } = map[estado];
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${cls}`}>
      {label}
    </span>
  );
}

const Eleccion = () => {
  const { data: election, isLoading } = useActiveElection();
  const { data: candidates = [] } = useCandidates(election?.id ?? null);

  const currentRound = election?.estado === "segunda_vuelta" ? 2 : 1;
  const { data: voteCounts = {} } = useElectionVoteCounts(election?.id ?? null, currentRound);

  const [step, setStep] = useState<Step>("overview");
  const [dni, setDni] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposalForm>(emptyProposals);
  const [partido, setPartido] = useState("");

  const { data: alreadyVoted } = useHasVotedElection(election?.id ?? null, dni, currentRound);

  const registerMut = useRegisterCandidate();
  const voteMut = useCastElectionVote();

  const countdown = useCountdown(
    election?.estado === "postulacion"
      ? election.postulacion_cierra
      : election?.votacion_cierra ?? null
  );

  const activeCandidates = useMemo(() => candidates.filter((c) => !c.eliminado), [candidates]);

  const isVotingOpen = election?.estado === "votacion" || election?.estado === "segunda_vuelta";
  const isPostulacionOpen = election?.estado === "postulacion";

  async function handleRegister() {
    if (!election) return;
    if (!partido.trim()) { toast.error("Ingresá el nombre de tu partido político"); return; }
    if (dni.length < 7) { toast.error("Ingresá tu DNI"); return; }
    const result = await registerMut.mutateAsync({ election_id: election.id, dni, partido, ...proposals });
    const messages: Record<string, string> = {
      ok: "¡Te postulaste exitosamente!",
      invalid_dni: "DNI inválido",
      dni_not_found: "Tu DNI no está registrado en el sistema",
      postulacion_closed: "Las postulaciones ya cerraron",
      window_closed: "La ventana de postulación no está abierta",
      already_registered: "Ya estás postulado en esta elección",
      missing_partido: "Ingresá el nombre de tu partido",
    };
    if (result.status === "ok") {
      toast.success(messages.ok);
      setStep("overview");
      setDni("");
      setPartido("");
      setProposals(emptyProposals());
    } else {
      toast.error(messages[result.status] ?? result.status);
    }
  }

  async function handleVote() {
    if (!election || !selectedCandidate) return;
    const result = await voteMut.mutateAsync({ election_id: election.id, dni, candidate_id: selectedCandidate, round: currentRound });
    const messages: Record<string, string> = {
      ok: "¡Voto registrado!",
      invalid_dni: "DNI inválido",
      dni_not_found: "Tu DNI no está registrado",
      election_not_found: "Elección no encontrada",
      voting_not_open: "La votación no está abierta",
      window_closed: "La ventana de votación cerró",
      candidate_not_found: "Candidato no encontrado",
      candidate_eliminated: "Ese candidato fue eliminado",
      already_voted: "Ya votaste en esta ronda",
    };
    if (result.status === "ok") {
      toast.success(messages.ok);
      setStep("done");
    } else {
      toast.error(messages[result.status] ?? result.status);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!election) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <EmptyState
          icon={Crown}
          title="No hay elección activa"
          description="Cuando se abra una nueva elección presidencial aparecerá aquí."
        />
      </div>
    );
  }

  // ── Overview / Done ──────────────────────────────────────────────────────────

  if (step === "overview" || step === "done") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <header className="rounded-2xl border border-primary/30 bg-gradient-card p-5 shadow-card space-y-3">
          <div className="flex items-center gap-2">
            <Crown className="text-amber-500 w-6 h-6 shrink-0" />
            <h1 className="text-xl font-black">{election.titulo}</h1>
          </div>
          <StatusBadge estado={election.estado} />
          {countdown && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock size={14} />
              {countdown}
            </p>
          )}
        </header>

        {step === "done" && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 flex items-center gap-3">
            <Check className="text-primary w-5 h-5 shrink-0" />
            <p className="text-foreground font-medium">Tu voto fue registrado de forma anónima.</p>
          </div>
        )}

        {election.estado === "cerrada" && election.ganador_id && (() => {
          const winner = candidates.find((c) => c.id === election.ganador_id);
          if (!winner) return null;
          return (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
              <p className="font-bold text-amber-400 text-lg">🏆 Presidente electo</p>
              <div className="flex items-center gap-3">
                <PlayerAvatar nombre={winner.players.nombre} foto_url={winner.players.foto_url} size="lg" />
                <div>
                  <p className="font-semibold text-lg">
                    {winner.players.apodo ?? winner.players.nombre}
                  </p>
                  <p className="text-muted-foreground">{winner.partido_politico}</p>
                  <p className="text-sm font-medium text-amber-400">
                    {(voteCounts as VoteCounts)[winner.id] ?? 0} votos
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {candidates.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="Todavía no hay postulados"
            description="Sé el primero en postularte."
          />
        ) : (
          <div className="space-y-3">
            <h2 className="font-semibold">Candidatos ({candidates.length})</h2>
            {candidates.map((c) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                votos={(voteCounts as VoteCounts)[c.id] ?? 0}
                selected={false}
                showVoteButton={false}
              />
            ))}
          </div>
        )}

        <div className="flex gap-3">
          {isPostulacionOpen && (
            <Button className="flex-1" onClick={() => setStep("postular")}>
              <UserCheck size={16} className="mr-2" />
              Postularme
            </Button>
          )}
          {isVotingOpen && step !== "done" && (
            <Button className="flex-1" onClick={() => setStep("identify")}>
              <Vote size={16} className="mr-2" />
              Votar
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Postulación ──────────────────────────────────────────────────────────────

  if (step === "postular") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <button
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setStep("overview")}
        >
          <ArrowLeft size={14} /> Volver
        </button>
        <h1 className="text-xl font-black">Postularme como presidente</h1>

        <div className="space-y-2">
          <Label htmlFor="dni">Tu DNI</Label>
          <Input id="dni" type="password" placeholder="Ingresá tu DNI" value={dni} onChange={(e) => setDni(e.target.value)} autoComplete="off" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="partido">Nombre de tu partido político</Label>
          <Input id="partido" placeholder="Ej: Frente Goleador" value={partido} onChange={(e) => setPartido(e.target.value)} />
        </div>

        <div className="space-y-4 border-t border-border pt-4">
          <h2 className="font-semibold">Propuestas temáticas</h2>
          {PROPOSAL_TOPICS.map((t) => (
            <div key={t.key} className="space-y-1">
              <Label htmlFor={t.key}>{t.label}</Label>
              <Textarea
                id={t.key}
                placeholder="Tu propuesta..."
                rows={2}
                value={proposals[t.key]}
                onChange={(e) => setProposals((prev) => ({ ...prev, [t.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="space-y-4 border-t border-border pt-4">
          <h2 className="font-semibold">Preguntas específicas</h2>
          {PROPOSAL_QUESTIONS.map((t) => (
            <div key={t.key} className="space-y-1">
              <Label htmlFor={t.key}>{t.label}</Label>
              <Textarea
                id={t.key}
                placeholder="Tu respuesta..."
                rows={2}
                value={proposals[t.key]}
                onChange={(e) => setProposals((prev) => ({ ...prev, [t.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <Button className="w-full" onClick={handleRegister} disabled={registerMut.isPending}>
          {registerMut.isPending ? "Registrando..." : "Confirmar postulación"}
        </Button>
      </div>
    );
  }

  // ── Identificación ───────────────────────────────────────────────────────────

  if (step === "identify") {
    return (
      <div className="max-w-md mx-auto px-4 py-10 space-y-6">
        <button
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setStep("overview")}
        >
          <ArrowLeft size={14} /> Volver
        </button>
        <h1 className="text-xl font-black">Identificate para votar</h1>
        <p className="text-sm text-muted-foreground">
          Tu voto es anónimo. Solo verificamos que tengas DNI registrado.
        </p>

        <div className="space-y-2">
          <Label htmlFor="vote-dni">Tu DNI</Label>
          <Input id="vote-dni" type="password" placeholder="Ingresá tu DNI" value={dni} onChange={(e) => setDni(e.target.value)} autoComplete="off" />
        </div>

        {alreadyVoted === true && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
            Ya votaste en esta ronda.
          </div>
        )}

        <Button className="w-full" disabled={dni.length < 7 || alreadyVoted === true} onClick={() => setStep("vote")}>
          Continuar
        </Button>
      </div>
    );
  }

  // ── Votación ─────────────────────────────────────────────────────────────────

  if (step === "vote") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <button
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setStep("identify")}
        >
          <ArrowLeft size={14} /> Volver
        </button>
        <h1 className="text-xl font-black">
          Votá al presidente
          {election.estado === "segunda_vuelta" && (
            <span className="ml-2 text-sm font-normal text-amber-400">Segunda vuelta</span>
          )}
        </h1>

        <div className="space-y-3">
          {activeCandidates.map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              votos={(voteCounts as VoteCounts)[c.id] ?? 0}
              selected={selectedCandidate === c.id}
              onSelect={() => setSelectedCandidate(c.id)}
              showVoteButton
            />
          ))}
        </div>

        <Button className="w-full" disabled={!selectedCandidate || voteMut.isPending} onClick={handleVote}>
          {voteMut.isPending ? "Registrando..." : "Confirmar voto"}
        </Button>
      </div>
    );
  }

  return null;
};

export default Eleccion;
