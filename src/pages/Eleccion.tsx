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

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Countdown helper ─────────────────────────────────────────────────────────

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

// ─── Candidate card ───────────────────────────────────────────────────────────

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
      className={`rounded-xl border p-4 space-y-3 transition-colors ${
        selected ? "border-green-500 bg-green-50" : "border-zinc-200 bg-white"
      } ${candidate.eliminado ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-3">
        <PlayerAvatar
          nombre={candidate.players.nombre}
          apodo={candidate.players.apodo}
          foto_url={candidate.players.foto_url}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-zinc-900 truncate">
            {candidate.players.apodo ?? candidate.players.nombre}
          </p>
          <p className="text-sm text-zinc-500 truncate">
            {candidate.partido_politico}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-lg font-bold text-zinc-700">{votos}</span>
          <p className="text-xs text-zinc-400">votos</p>
        </div>
      </div>

      {candidate.eliminado && (
        <p className="text-xs text-red-500 font-medium">Eliminado (paso argentino)</p>
      )}

      <button
        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700"
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? "Ocultar propuestas" : "Ver propuestas"}
      </button>

      {expanded && (
        <div className="space-y-2 text-sm text-zinc-600 border-t pt-3">
          {[...PROPOSAL_TOPICS, ...PROPOSAL_QUESTIONS].map((t) => {
            const val = candidate[t.key as keyof CandidateWithPlayer] as string;
            if (!val) return null;
            return (
              <div key={t.key}>
                <p className="font-medium text-zinc-700">{t.label}</p>
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
          {selected ? <><Check size={14} className="mr-1" /> Seleccionado</> : "Votar"}
        </Button>
      )}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ estado }: { estado: Election["estado"] }) {
  const map: Record<Election["estado"], { label: string; cls: string }> = {
    postulacion: { label: "📋 Postulaciones abiertas", cls: "bg-blue-100 text-blue-700" },
    votacion: { label: "🗳️ Votación en curso", cls: "bg-green-100 text-green-700" },
    segunda_vuelta: { label: "🔄 Segunda vuelta", cls: "bg-amber-100 text-amber-700" },
    cerrada: { label: "✅ Elección cerrada", cls: "bg-zinc-100 text-zinc-600" },
  };
  const { label, cls } = map[estado];
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const Eleccion = () => {
  const { data: election, isLoading } = useActiveElection();
  const { data: candidates = [] } = useCandidates(election?.id ?? null);

  const currentRound = election?.estado === "segunda_vuelta" ? 2 : 1;
  const { data: voteCounts = {} } = useElectionVoteCounts(
    election?.id ?? null,
    currentRound
  );

  const [step, setStep] = useState<Step>("overview");
  const [dni, setDni] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposalForm>(emptyProposals);
  const [partido, setPartido] = useState("");

  const { data: alreadyVoted } = useHasVotedElection(
    election?.id ?? null,
    dni,
    currentRound
  );

  const registerMut = useRegisterCandidate();
  const voteMut = useCastElectionVote();

  const countdown = useCountdown(
    election?.estado === "postulacion"
      ? election.postulacion_cierra
      : election?.votacion_cierra ?? null
  );

  const activeCandidates = useMemo(
    () => candidates.filter((c) => !c.eliminado),
    [candidates]
  );

  const isVotingOpen =
    election?.estado === "votacion" || election?.estado === "segunda_vuelta";
  const isPostulacionOpen = election?.estado === "postulacion";

  // ── Postulación submit ──────────────────────────────────────────────────────

  async function handleRegister() {
    if (!election) return;
    if (!partido.trim()) {
      toast.error("Ingresá el nombre de tu partido político");
      return;
    }
    if (dni.length < 7) {
      toast.error("Ingresá tu DNI");
      return;
    }
    const result = await registerMut.mutateAsync({
      election_id: election.id,
      dni,
      partido,
      ...proposals,
    });
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

  // ── Vote submit ─────────────────────────────────────────────────────────────

  async function handleVote() {
    if (!election || !selectedCandidate) return;
    const result = await voteMut.mutateAsync({
      election_id: election.id,
      dni,
      candidate_id: selectedCandidate,
      round: currentRound,
    });
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

  // ── Loading / empty ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!election) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <EmptyState
          icon={<Crown className="w-12 h-12 text-zinc-300" />}
          title="No hay elección activa"
          description="Cuando se abra una nueva elección presidencial aparecerá aquí."
        />
      </div>
    );
  }

  // ── Overview ────────────────────────────────────────────────────────────────

  if (step === "overview" || step === "done") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Crown className="text-amber-500 w-6 h-6" />
            <h1 className="text-xl font-bold text-zinc-900">{election.titulo}</h1>
          </div>
          <StatusBadge estado={election.estado} />
          {countdown && (
            <p className="flex items-center gap-1 text-sm text-zinc-500">
              <Clock size={14} />
              {countdown}
            </p>
          )}
        </div>

        {step === "done" && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
            <Check className="text-green-600 w-5 h-5 shrink-0" />
            <p className="text-green-700 font-medium">
              Tu voto fue registrado de forma anónima.
            </p>
          </div>
        )}

        {/* Ganador */}
        {election.estado === "cerrada" && election.ganador_id && (() => {
          const winner = candidates.find((c) => c.id === election.ganador_id);
          if (!winner) return null;
          return (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 space-y-2">
              <p className="font-bold text-amber-800 text-lg">
                🏆 Presidente electo
              </p>
              <div className="flex items-center gap-3">
                <PlayerAvatar
                  nombre={winner.players.nombre}
                  apodo={winner.players.apodo}
                  foto_url={winner.players.foto_url}
                  size="lg"
                />
                <div>
                  <p className="font-semibold text-zinc-900 text-lg">
                    {winner.players.apodo ?? winner.players.nombre}
                  </p>
                  <p className="text-zinc-500">{winner.partido_politico}</p>
                  <p className="text-sm font-medium text-amber-700">
                    {(voteCounts as VoteCounts)[winner.id] ?? 0} votos
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Candidates list */}
        {candidates.length === 0 ? (
          <EmptyState
            icon={<UserCheck className="w-10 h-10 text-zinc-300" />}
            title="Todavía no hay postulados"
            description="Sé el primero en postularte."
          />
        ) : (
          <div className="space-y-3">
            <h2 className="font-semibold text-zinc-700">
              Candidatos ({candidates.length})
            </h2>
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

        {/* Actions */}
        <div className="flex gap-3">
          {isPostulacionOpen && (
            <Button
              className="flex-1"
              onClick={() => setStep("postular")}
            >
              <UserCheck size={16} className="mr-2" />
              Postularme
            </Button>
          )}
          {isVotingOpen && step !== "done" && (
            <Button
              className="flex-1"
              onClick={() => setStep("identify")}
            >
              <Vote size={16} className="mr-2" />
              Votar
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Postulación form ────────────────────────────────────────────────────────

  if (step === "postular") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <button
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
          onClick={() => setStep("overview")}
        >
          <ArrowLeft size={14} /> Volver
        </button>
        <h1 className="text-xl font-bold text-zinc-900">Postularme como presidente</h1>

        <div className="space-y-2">
          <Label htmlFor="dni">Tu DNI</Label>
          <Input
            id="dni"
            type="password"
            placeholder="Ingresá tu DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="partido">Nombre de tu partido político</Label>
          <Input
            id="partido"
            placeholder="Ej: Frente Goleador"
            value={partido}
            onChange={(e) => setPartido(e.target.value)}
          />
        </div>

        <div className="space-y-4 border-t pt-4">
          <h2 className="font-semibold text-zinc-700">Propuestas temáticas</h2>
          {PROPOSAL_TOPICS.map((t) => (
            <div key={t.key} className="space-y-1">
              <Label htmlFor={t.key}>{t.label}</Label>
              <Textarea
                id={t.key}
                placeholder="Tu propuesta..."
                rows={2}
                value={proposals[t.key]}
                onChange={(e) =>
                  setProposals((prev) => ({ ...prev, [t.key]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>

        <div className="space-y-4 border-t pt-4">
          <h2 className="font-semibold text-zinc-700">Preguntas específicas</h2>
          {PROPOSAL_QUESTIONS.map((t) => (
            <div key={t.key} className="space-y-1">
              <Label htmlFor={t.key}>{t.label}</Label>
              <Textarea
                id={t.key}
                placeholder="Tu respuesta..."
                rows={2}
                value={proposals[t.key]}
                onChange={(e) =>
                  setProposals((prev) => ({ ...prev, [t.key]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>

        <Button
          className="w-full"
          onClick={handleRegister}
          disabled={registerMut.isPending}
        >
          {registerMut.isPending ? "Registrando..." : "Confirmar postulación"}
        </Button>
      </div>
    );
  }

  // ── Identify to vote ────────────────────────────────────────────────────────

  if (step === "identify") {
    return (
      <div className="max-w-md mx-auto px-4 py-10 space-y-6">
        <button
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
          onClick={() => setStep("overview")}
        >
          <ArrowLeft size={14} /> Volver
        </button>
        <h1 className="text-xl font-bold text-zinc-900">Identificate para votar</h1>
        <p className="text-sm text-zinc-500">
          Tu voto es anónimo. Solo verificamos que tengas DNI registrado.
        </p>

        <div className="space-y-2">
          <Label htmlFor="vote-dni">Tu DNI</Label>
          <Input
            id="vote-dni"
            type="password"
            placeholder="Ingresá tu DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            autoComplete="off"
          />
        </div>

        {alreadyVoted === true && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Ya votaste en esta ronda. Podés ver los resultados parciales arriba.
          </div>
        )}

        <Button
          className="w-full"
          disabled={dni.length < 7 || alreadyVoted === true}
          onClick={() => setStep("vote")}
        >
          Continuar
        </Button>
      </div>
    );
  }

  // ── Vote ────────────────────────────────────────────────────────────────────

  if (step === "vote") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <button
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
          onClick={() => setStep("identify")}
        >
          <ArrowLeft size={14} /> Volver
        </button>
        <h1 className="text-xl font-bold text-zinc-900">
          Votá al presidente
          {election.estado === "segunda_vuelta" && (
            <span className="ml-2 text-sm font-normal text-amber-600">Segunda vuelta</span>
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

        <Button
          className="w-full"
          disabled={!selectedCandidate || voteMut.isPending}
          onClick={handleVote}
        >
          {voteMut.isPending ? "Registrando..." : "Confirmar voto"}
        </Button>
      </div>
    );
  }

  return null;
};

export default Eleccion;
