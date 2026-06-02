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
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { FlyerUploader } from "@/components/election/FlyerUploader";
import {
  useActiveElection,
  useCandidates,
  useElectionVoteCounts,
  useHasVotedElection,
  useRegisterCandidate,
  useCastElectionVote,
  useUpdateCandidate,
  type CandidateWithPlayer,
  type Election,
  type VoteCounts,
} from "@/hooks/useElections";

type Step = "overview" | "postular" | "identify" | "vote" | "done" | "editIdentify" | "edit";

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
  onEdit,
}: {
  candidate: CandidateWithPlayer;
  votos: number;
  selected: boolean;
  onSelect?: () => void;
  showVoteButton: boolean;
  onEdit?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const presName = candidate.players.apodo ?? candidate.players.nombre;
  const members = candidate.members && candidate.members.length > 0
    ? candidate.members
    : (candidate.vice ? [candidate.vice] : []);
  const summaryNames = [presName, ...members.map((m) => m.apodo ?? m.nombre)].join(" · ");

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all bg-card ${
        selected ? "border-primary ring-2 ring-primary" : "border-border"
      } ${candidate.eliminado ? "opacity-50" : ""}`}
    >
      {/* Flyer a ancho completo */}
      {candidate.flyer_url ? (
        <div className="w-full relative">
          <img
            src={candidate.flyer_url}
            alt={`Flyer de ${candidate.partido_politico}`}
            className="w-full block"
            style={{ display: "block" }}
          />
          {/* Overlay con votos si hay alguno */}
          {votos > 0 && (
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-white font-bold text-sm">
              {votos} {votos === 1 ? "voto" : "votos"}
            </div>
          )}
        </div>
      ) : (
        /* Sin flyer: header visual con avatares */
        <div className="bg-gradient-card border-b border-border p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex flex-col items-center gap-1">
              <PlayerAvatar nombre={candidate.players.nombre} foto_url={candidate.players.foto_url} size="lg" />
              <span className="text-xs text-muted-foreground">Pdte.</span>
            </div>
            {members.map((m) => (
              <div key={m.id} className="flex flex-col items-center gap-1">
                <PlayerAvatar nombre={m.nombre} foto_url={m.foto_url} size="md" />
                <span className="text-[10px] text-muted-foreground truncate max-w-[64px]">
                  {m.apodo ?? m.nombre}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-black text-lg leading-tight">{candidate.partido_politico}</p>
              <p className="text-muted-foreground text-xs truncate">{summaryNames}</p>
            </div>
            {votos > 0 && (
              <div className="text-right shrink-0">
                <span className="text-2xl font-black text-foreground">{votos}</span>
                <p className="text-xs text-muted-foreground">votos</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Info del partido siempre visible debajo del flyer */}
        {candidate.flyer_url && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <PlayerAvatar nombre={candidate.players.nombre} foto_url={candidate.players.foto_url} size="sm" />
              {members.map((m) => (
                <PlayerAvatar key={m.id} nombre={m.nombre} foto_url={m.foto_url} size="sm" />
              ))}
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{candidate.partido_politico}</p>
                <p className="text-xs text-muted-foreground truncate">{summaryNames}</p>
              </div>
            </div>
            {votos > 0 && (
              <div className="text-right shrink-0">
                <span className="text-lg font-black text-foreground">{votos}</span>
                <p className="text-xs text-muted-foreground">votos</p>
              </div>
            )}
          </div>
        )}

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
            {selected ? <><Check size={14} className="mr-1" /> Seleccionado</> : "Votar a este partido"}
          </Button>
        )}

        {onEdit && !candidate.eliminado && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={onEdit}
          >
            ✏️ Editar candidatura (con DNI)
          </Button>
        )}
      </div>
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
  const [memberDnis, setMemberDnis] = useState<string[]>([""]);
  const [replaceMembers, setReplaceMembers] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposalForm>(emptyProposals);
  const [partido, setPartido] = useState("");
  const [flyerUrl, setFlyerUrl] = useState("");
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);

  const updateMemberDni = (idx: number, value: string) =>
    setMemberDnis((arr) => arr.map((v, i) => (i === idx ? value : v)));
  const addMember = () => setMemberDnis((arr) => [...arr, ""]);
  const removeMember = (idx: number) =>
    setMemberDnis((arr) => (arr.length === 1 ? [""] : arr.filter((_, i) => i !== idx)));

  const { data: alreadyVoted } = useHasVotedElection(election?.id ?? null, dni, currentRound);

  const registerMut = useRegisterCandidate();
  const voteMut = useCastElectionVote();
  const updateMut = useUpdateCandidate();

  const editingCandidate = useMemo(
    () => candidates.find((c) => c.id === editingCandidateId) ?? null,
    [candidates, editingCandidateId],
  );

  function startEdit(candidateId: string) {
    const c = candidates.find((x) => x.id === candidateId);
    if (!c) return;
    setEditingCandidateId(candidateId);
    setDni("");
    setPartido(c.partido_politico ?? "");
    const filled = emptyProposals();
    [...PROPOSAL_TOPICS, ...PROPOSAL_QUESTIONS].forEach((t) => {
      const v = c[t.key as keyof CandidateWithPlayer] as string | null | undefined;
      filled[t.key as ProposalKey] = v ?? "";
    });
    setProposals(filled);
    setMemberDnis([""]);
    setReplaceMembers(false);
    setStep("editIdentify");
  }

  async function handleUpdate() {
    if (!election || !editingCandidate) return;
    if (dni.length < 7) { toast.error("Ingresá el DNI"); return; }
    if (!partido.trim()) { toast.error("Ingresá el nombre del partido"); return; }
    const cleanMembers = memberDnis.map((m) => m.trim()).filter((m) => m.length > 0);
    const result = await updateMut.mutateAsync({
      candidate_id: editingCandidate.id,
      election_id: election.id,
      dni,
      partido,
      member_dnis: replaceMembers ? cleanMembers : undefined,
      ...proposals,
    });
    const messages: Record<string, string> = {
      ok: "Candidatura actualizada",
      invalid_dni: "DNI inválido",
      dni_not_found: "Tu DNI no está registrado",
      not_found: "Candidatura no encontrada",
      unauthorized: "Ese DNI no es del presidente de esta candidatura",
      election_not_found: "Elección no encontrada",
      postulacion_closed: "Ya no se puede editar (postulaciones cerradas)",
      missing_partido: "Ingresá el nombre del partido",
      invalid_member_dni: "Hay un DNI de integrante inválido",
      member_dni_not_found: "Hay un DNI de integrante que no está registrado",
      member_same_as_president: "Un integrante no puede ser el presidente",
      duplicate_member: "Hay integrantes duplicados",
      member_already_candidate: "Un integrante ya está postulado en otra candidatura",
    };
    if (result.status === "ok") {
      toast.success(messages.ok);
      setStep("overview");
      setEditingCandidateId(null);
      setDni("");
      setMemberDnis([""]);
      setReplaceMembers(false);
      setPartido("");
      setProposals(emptyProposals());
    } else {
      toast.error(messages[result.status] ?? result.status);
    }
  }

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
    const cleanMembers = memberDnis.map((m) => m.trim()).filter((m) => m.length > 0);
    const result = await registerMut.mutateAsync({
      election_id: election.id,
      dni,
      partido,
      member_dnis: cleanMembers.length > 0 ? cleanMembers : undefined,
      flyer_url: flyerUrl.trim() || undefined,
      ...proposals,
    });
    const messages: Record<string, string> = {
      ok: "¡Te postulaste exitosamente!",
      invalid_dni: "DNI inválido",
      dni_not_found: "Tu DNI no está registrado en el sistema",
      invalid_member_dni: "Hay un DNI de integrante inválido",
      member_dni_not_found: "Hay un DNI de integrante que no está registrado",
      member_same_as_president: "Un integrante no puede ser el mismo presidente",
      duplicate_member: "Hay integrantes duplicados",
      member_already_candidate: "Un integrante ya está postulado en otra candidatura",
      postulacion_closed: "Las postulaciones ya cerraron",
      window_closed: "La ventana de postulación no está abierta",
      already_registered: "Ya estás postulado en esta elección",
      missing_partido: "Ingresá el nombre de tu partido",
    };
    if (result.status === "ok") {
      toast.success(messages.ok);
      setStep("overview");
      setDni("");
      setMemberDnis([""]);
      setPartido("");
      setFlyerUrl("");
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
              <p className="font-bold text-amber-400 text-lg">🏆 Partido ganador</p>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <PlayerAvatar nombre={winner.players.nombre} foto_url={winner.players.foto_url} size="lg" />
                  <span className="text-xs text-muted-foreground">Pdte.</span>
                </div>
                {winner.vice && (
                  <div className="flex flex-col items-center gap-1">
                    <PlayerAvatar nombre={winner.vice.nombre} foto_url={winner.vice.foto_url} size="md" />
                    <span className="text-xs text-muted-foreground">Vice</span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-lg">
                    {winner.players.apodo ?? winner.players.nombre}
                    {winner.vice && (
                      <span className="text-muted-foreground font-normal text-base">
                        {" & "}{winner.vice.apodo ?? winner.vice.nombre}
                      </span>
                    )}
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
                onEdit={isPostulacionOpen ? () => startEdit(c.id) : undefined}
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

        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Fórmula</h2>

          <div className="space-y-2">
            <Label htmlFor="dni">Tu DNI (presidente)</Label>
            <Input id="dni" type="password" placeholder="Ingresá tu DNI" value={dni} onChange={(e) => setDni(e.target.value)} autoComplete="off" />
          </div>

          <div className="space-y-2">
            <Label>
              Integrantes del partido <span className="text-muted-foreground font-normal">(opcional, DNIs)</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Agregá los DNIs de los demás integrantes. Cada uno tiene que estar registrado como jugador.
            </p>
            <div className="space-y-2">
              {memberDnis.map((value, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    type="password"
                    placeholder={`DNI integrante ${idx + 1}`}
                    value={value}
                    onChange={(e) => updateMemberDni(idx, e.target.value)}
                    autoComplete="off"
                  />
                  {memberDnis.length > 1 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => removeMember(idx)}>
                      Quitar
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addMember}>
                + Agregar integrante
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="partido">Nombre del partido político</Label>
            <Input id="partido" placeholder="Ej: Frente Goleador" value={partido} onChange={(e) => setPartido(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>
              Flyer / afiche <span className="text-muted-foreground font-normal">(opcional, formato 3:4 vertical)</span>
            </Label>
            <FlyerUploader currentUrl={flyerUrl || null} onChange={(url) => setFlyerUrl(url ?? "")} />
          </div>
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

  // ── Edit: identificación ─────────────────────────────────────────────────────

  if (step === "editIdentify" && editingCandidate) {
    const presName = editingCandidate.players.apodo ?? editingCandidate.players.nombre;
    const editMembers = editingCandidate.members && editingCandidate.members.length > 0
      ? editingCandidate.members
      : (editingCandidate.vice ? [editingCandidate.vice] : []);
    const summary = [presName, ...editMembers.map((m) => m.apodo ?? m.nombre)].join(" · ");
    return (
      <div className="max-w-md mx-auto px-4 py-10 space-y-6">
        <button
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => {
            setStep("overview");
            setEditingCandidateId(null);
            setDni("");
          }}
        >
          <ArrowLeft size={14} /> Volver
        </button>
        <h1 className="text-xl font-black">Editar candidatura</h1>
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Partido</p>
          <p className="font-semibold text-primary">{editingCandidate.partido_politico}</p>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Ingresá tu DNI de presidente para confirmar tu identidad.
        </p>
        <div className="space-y-2">
          <Label htmlFor="edit-dni">DNI</Label>
          <Input
            id="edit-dni"
            type="password"
            placeholder="Ingresá el DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            autoComplete="off"
          />
        </div>
        <Button className="w-full" disabled={dni.length < 7} onClick={() => setStep("edit")}>
          Continuar
        </Button>
      </div>
    );
  }

  // ── Edit: formulario ─────────────────────────────────────────────────────────

  if (step === "edit" && editingCandidate) {
    const currentMembers = editingCandidate.members && editingCandidate.members.length > 0
      ? editingCandidate.members
      : (editingCandidate.vice ? [editingCandidate.vice] : []);
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <button
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setStep("editIdentify")}
        >
          <ArrowLeft size={14} /> Volver
        </button>
        <h1 className="text-xl font-black">Editar candidatura</h1>
        <p className="text-xs text-muted-foreground">
          No se pueden cambiar el presidente ni el flyer desde acá. Para eso reabrí la postulación con el admin.
        </p>

        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-partido">Nombre del partido político</Label>
            <Input
              id="edit-partido"
              placeholder="Ej: Frente Goleador"
              value={partido}
              onChange={(e) => setPartido(e.target.value)}
            />
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <Label>Integrantes actuales</Label>
            {currentMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay otros integrantes cargados.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {currentMembers.map((m) => (
                  <li key={m.id} className="text-muted-foreground">• {m.apodo ?? m.nombre}</li>
                ))}
              </ul>
            )}

            {!replaceMembers ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setReplaceMembers(true);
                  setMemberDnis([""]);
                }}
              >
                Cambiar integrantes
              </Button>
            ) : (
              <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                <p className="text-xs text-amber-400">
                  Al guardar se reemplaza la lista entera. Volvé a cargar los DNIs de todos los integrantes que quieras dejar (o dejala vacía para no tener ninguno).
                </p>
                {memberDnis.map((value, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      type="password"
                      placeholder={`DNI integrante ${idx + 1}`}
                      value={value}
                      onChange={(e) => updateMemberDni(idx, e.target.value)}
                      autoComplete="off"
                    />
                    {memberDnis.length > 1 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => removeMember(idx)}>
                        Quitar
                      </Button>
                    )}
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={addMember}>
                    + Agregar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplaceMembers(false);
                      setMemberDnis([""]);
                    }}
                  >
                    Cancelar cambio
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 border-t border-border pt-4">
          <h2 className="font-semibold">Propuestas temáticas</h2>
          {PROPOSAL_TOPICS.map((t) => (
            <div key={t.key} className="space-y-1">
              <Label htmlFor={`edit-${t.key}`}>{t.label}</Label>
              <Textarea
                id={`edit-${t.key}`}
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
              <Label htmlFor={`edit-${t.key}`}>{t.label}</Label>
              <Textarea
                id={`edit-${t.key}`}
                placeholder="Tu respuesta..."
                rows={2}
                value={proposals[t.key]}
                onChange={(e) => setProposals((prev) => ({ ...prev, [t.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <Button className="w-full" onClick={handleUpdate} disabled={updateMut.isPending}>
          {updateMut.isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    );
  }

  return null;
};

export default Eleccion;
