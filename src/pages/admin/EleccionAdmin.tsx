import { useState } from "react";
import { Crown, Plus, Vote, ChevronDown, ChevronUp, Check, AlertTriangle, Trash2, BarChart2, Users, UserX, RotateCcw, List, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import {
  useElections,
  useCandidates,
  useElectionVoteCounts,
  useElectionVotesAdmin,
  useElectionVotesDetail,
  useElectionPendingVoters,
  useNullifyElectionVote,
  useCreateElection,
  useOpenElectionVoting,
  useCloseElectionVoting,
  useRevertElectionToPostulacion,
  useDeleteElection,
  useDeleteCandidate,
  type Election,
  type CandidateWithPlayer,
  type VoteCounts,
  type VoteDetailRow,
  type PendingVoterRow,
} from "@/hooks/useElections";

const PROPOSAL_TOPICS = [
  { key: "propuesta_organizacion", label: "⚽ Organización de los partidos" },
  { key: "propuesta_votacion_premios", label: "🏆 Sistema de votación / premios" },
  { key: "propuesta_economia", label: "💰 Economía del club" },
  { key: "propuesta_convivencia", label: "🌿 Código de convivencia" },
  { key: "propuesta_tercer_tiempo", label: '🥩 El "tercer tiempo"' },
  { key: "propuesta_infraestructura", label: "🏟️ Infraestructura del grupo" },
  { key: "propuesta_constitucion", label: "📜 Constitución del club" },
  { key: "propuesta_domingos", label: "¿Cómo mejorarías los domingos?" },
  { key: "propuesta_ausencias", label: "¿Qué harías con los que faltan mucho?" },
  { key: "propuesta_equipos", label: "¿Cómo evitarías equipos disparejos?" },
  { key: "propuesta_presupuesto", label: "¿Qué harías con el presupuesto?" },
  { key: "propuesta_convivencia2", label: "¿Cómo mejorarías la convivencia?" },
  { key: "propuesta_foules", label: "¿Política frente a los foules?" },
] as const;

const STATUS_LABEL: Record<Election["estado"], string> = {
  postulacion: "📋 Postulaciones abiertas",
  votacion: "🗳️ Votación en curso",
  segunda_vuelta: "🔄 Segunda vuelta",
  cerrada: "✅ Cerrada",
};

function CandidateRow({ candidate, votos, electionId }: { candidate: CandidateWithPlayer; votos: number; electionId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMut = useDeleteCandidate();

  async function handleDelete() {
    const result = await deleteMut.mutateAsync({ candidate_id: candidate.id, election_id: electionId });
    if (result.status === "ok") toast.success("Candidato eliminado");
    else toast.error(result.status);
  }

  return (
    <div className={`border border-border rounded-lg p-3 space-y-2 bg-card ${candidate.eliminado ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3">
        {candidate.flyer_url && (
          <div className="rounded overflow-hidden border border-border shrink-0" style={{ width: 48, aspectRatio: "3/4" }}>
            <img src={candidate.flyer_url} alt="flyer" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-center gap-0.5">
            <PlayerAvatar nombre={candidate.players.nombre} foto_url={candidate.players.foto_url} size="sm" />
            {candidate.vice && (
              <PlayerAvatar nombre={candidate.vice.nombre} foto_url={candidate.vice.foto_url} size="sm" />
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {candidate.players.apodo ?? candidate.players.nombre}
          </p>
          {candidate.vice && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Users size={10} className="shrink-0" />
              {candidate.vice.apodo ?? candidate.vice.nombre}
            </p>
          )}
          <p className="text-xs text-muted-foreground truncate">{candidate.partido_politico}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="font-bold text-foreground">{votos}</span>
          <span className="text-xs text-muted-foreground ml-1">votos</span>
        </div>
        {candidate.eliminado && (
          <span className="text-xs text-destructive font-medium">Eliminado</span>
        )}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Eliminar candidato"
          >
            <UserX size={15} />
          </button>
        ) : (
          <div className="shrink-0 flex items-center gap-1">
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending} className="h-6 text-xs px-2">
              Sí
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} className="h-6 text-xs px-2">
              No
            </Button>
          </div>
        )}
      </div>

      <button
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? "Ocultar propuestas" : "Ver propuestas"}
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-border pt-2 text-xs text-muted-foreground">
          {PROPOSAL_TOPICS.map((t) => {
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
    </div>
  );
}

function PendingVotersList({ voters, totalVoted }: { voters: PendingVoterRow[]; totalVoted: number }) {
  if (voters.length === 0) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary font-medium">
        ✅ Todos los jugadores activos ya votaron.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {voters.length} jugador{voters.length !== 1 ? "es" : ""} aún no votaron · {totalVoted} voto{totalVoted !== 1 ? "s" : ""} registrado{totalVoted !== 1 ? "s" : ""}
      </p>
      <div className="rounded-lg border border-border overflow-hidden">
        {voters.map((p, i) => (
          <div
            key={p.player_id}
            className={`flex items-center gap-3 px-3 py-2 ${i % 2 === 0 ? "bg-card" : "bg-secondary/30"}`}
          >
            <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="sm" />
            <span className="text-sm font-medium text-foreground">
              {p.apodo ?? p.nombre}
            </span>
            {p.apodo && (
              <span className="text-xs text-muted-foreground">({p.nombre})</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function VoteDetailTable({
  votes,
  electionId,
  nullifyMut,
}: {
  votes: VoteDetailRow[];
  electionId: string;
  nullifyMut: ReturnType<typeof useNullifyElectionVote>;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (votes.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay votos registrados.</p>;
  }

  const rounds = [...new Set(votes.map((v) => v.round))].sort();

  async function handleNullify(voteId: string) {
    const result = await nullifyMut.mutateAsync({ vote_id: voteId, election_id: electionId });
    if (result.status === "ok") { toast.success("Voto anulado"); setConfirmId(null); }
    else toast.error(result.status);
  }

  return (
    <div className="space-y-4">
      {rounds.map((round) => {
        const roundVotes = votes.filter((v) => v.round === round);
        return (
          <div key={round} className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Ronda {round} — {roundVotes.length} votos
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              {roundVotes.map((v, i) => (
                <div
                  key={v.vote_id}
                  className={`flex items-center gap-3 px-3 py-2 text-sm ${i % 2 === 0 ? "bg-card" : "bg-secondary/30"}`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground">
                      {v.voter_apodo ?? v.voter_nombre ?? <span className="text-muted-foreground italic">Anónimo</span>}
                    </span>
                    <span className="text-muted-foreground mx-1.5">→</span>
                    <span className="text-primary">{v.candidate_partido}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(v.voted_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {confirmId === v.vote_id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="destructive" onClick={() => handleNullify(v.vote_id)} disabled={nullifyMut.isPending} className="h-6 text-xs px-2">
                        Anular
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)} className="h-6 text-xs px-2">
                        No
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(v.vote_id)}
                      className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Anular este voto"
                    >
                      <XCircle size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ElectionPanel({ election }: { election: Election }) {
  const { data: candidates = [] } = useCandidates(election.id);
  const currentRound = election.estado === "segunda_vuelta" ? 2 : 1;
  const { data: voteCounts = {} } = useElectionVoteCounts(election.id, currentRound);
  const { data: adminVotes = [] } = useElectionVotesAdmin(election.id);

  const [showVotes, setShowVotes] = useState(false);
  const [voteView, setVoteView] = useState<"summary" | "detail" | "pending">("summary");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);

  const { data: voteDetails = [] } = useElectionVotesDetail(showVotes && voteView === "detail" ? election.id : null);
  const { data: pendingVoters = [] } = useElectionPendingVoters(showVotes && voteView === "pending" ? election.id : null, currentRound);
  const nullifyMut = useNullifyElectionVote();

  const openVotingMut = useOpenElectionVoting();
  const closeMut = useCloseElectionVoting();
  const revertMut = useRevertElectionToPostulacion();
  const deleteMut = useDeleteElection();

  async function handleOpenVoting() {
    const result = await openVotingMut.mutateAsync({ election_id: election.id });
    if (result.status === "ok") toast.success("Votación abierta");
    else toast.error(result.status);
  }

  async function handleClose() {
    const result = await closeMut.mutateAsync(election.id);
    const messages: Record<string, string> = {
      closed: "Elección cerrada. ¡Hay presidente!",
      segunda_vuelta: "Paso argentino aplicado. Segunda vuelta abierta.",
      unauthorized: "Sin permisos",
      not_in_voting_state: "La elección no está en estado de votación",
      election_not_found: "Elección no encontrada",
    };
    if (result.status === "closed" || result.status === "segunda_vuelta")
      toast.success(messages[result.status]);
    else toast.error(messages[result.status] ?? result.status);
  }

  async function handleDelete() {
    const result = await deleteMut.mutateAsync(election.id);
    if (result.status === "ok") toast.success("Elección borrada");
    else toast.error(result.status);
  }

  async function handleRevert() {
    const result = await revertMut.mutateAsync(election.id);
    if (result.status === "ok") {
      const n = result.deleted_votes ?? 0;
      toast.success(
        n > 0
          ? `Volviste a postulación. Se borraron ${n} ${n === 1 ? "voto" : "votos"}.`
          : "Volviste a postulación. No había votos.",
      );
      setConfirmRevert(false);
    } else {
      const messages: Record<string, string> = {
        unauthorized: "Sin permisos",
        election_not_found: "Elección no encontrada",
        not_in_voting_state: "Solo se puede volver desde 'votación'",
      };
      toast.error(messages[result.status] ?? result.status);
    }
  }

  const totalVotes = Object.values(voteCounts as VoteCounts).reduce((a, b) => a + b, 0);
  const sorted = [...candidates].sort(
    (a, b) => ((voteCounts as VoteCounts)[b.id] ?? 0) - ((voteCounts as VoteCounts)[a.id] ?? 0)
  );

  // Group admin votes by round for display
  const rounds = [...new Set(adminVotes.map((v) => v.round))].sort();

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-card p-5 shadow-card space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h2 className="font-bold text-lg">{election.titulo}</h2>
          <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
            {STATUS_LABEL[election.estado]}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {election.estado === "postulacion" && (
            <Button size="sm" onClick={handleOpenVoting} disabled={openVotingMut.isPending}>
              <Vote size={14} className="mr-1" />
              Abrir votación
            </Button>
          )}
          {(election.estado === "votacion" || election.estado === "segunda_vuelta") && (
            <Button size="sm" variant="destructive" onClick={handleClose} disabled={closeMut.isPending}>
              <Check size={14} className="mr-1" />
              Cerrar y calcular ganador
            </Button>
          )}
          {election.estado === "votacion" && (
            !confirmRevert ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmRevert(true)}
                disabled={revertMut.isPending}
              >
                <RotateCcw size={14} className="mr-1" />
                Volver a postulación
              </Button>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5">
                <span className="text-xs text-amber-400 font-medium">
                  ¿Volver? Se borran los votos de esta ronda.
                </span>
                <Button size="sm" variant="default" onClick={handleRevert} disabled={revertMut.isPending} className="h-6 text-xs px-2">
                  Sí, volver
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmRevert(false)} className="h-6 text-xs px-2">
                  Cancelar
                </Button>
              </div>
            )
          )}
          {/* Delete button */}
          {!confirmDelete ? (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} className="mr-1" />
              Borrar
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5">
              <span className="text-xs text-destructive font-medium">¿Confirmar borrado?</span>
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending} className="h-6 text-xs px-2">
                Sí, borrar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} className="h-6 text-xs px-2">
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Reglas */}
      {(election.estado === "votacion" || election.estado === "segunda_vuelta") && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400 flex gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Reglas de cierre</p>
            <ul className="mt-1 space-y-0.5 text-xs opacity-90">
              <li>• Si el 1er candidato tiene 3+ votos de ventaja → gana directamente.</li>
              <li>• Si no → quedan los 3 más votados (paso argentino) y se abre segunda vuelta.</li>
              <li>• En segunda vuelta → gana el más votado sin importar diferencia.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Candidatos */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Candidatos ({candidates.length})</p>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay postulados.</p>
        ) : (
          sorted.map((c) => (
            <CandidateRow key={c.id} candidate={c} votos={(voteCounts as VoteCounts)[c.id] ?? 0} electionId={election.id} />
          ))
        )}
      </div>

      {/* Votos — toggle */}
      <div className="border-t border-border pt-3 space-y-3">
        <button
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowVotes((s) => !s)}
        >
          <BarChart2 size={15} />
          {showVotes ? "Ocultar votos" : `Ver votos (${totalVotes} total)`}
          {showVotes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showVotes && (
          <div className="space-y-3">
            {/* Toggle resumen / detalle / pendientes */}
            <div className="flex gap-1 p-0.5 bg-secondary rounded-lg w-fit">
              <button
                onClick={() => setVoteView("summary")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${voteView === "summary" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <BarChart2 size={12} /> Resumen
              </button>
              <button
                onClick={() => setVoteView("detail")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${voteView === "detail" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List size={12} /> Quién votó
              </button>
              <button
                onClick={() => setVoteView("pending")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${voteView === "pending" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Clock size={12} /> Falta votar
              </button>
            </div>

            {voteView === "summary" && (
              <div className="space-y-4">
                {adminVotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay votos registrados.</p>
                ) : (
                  rounds.map((round) => {
                    const roundVotes = adminVotes.filter((v) => v.round === round);
                    const roundTotal = roundVotes.reduce((a, v) => a + v.votos, 0);
                    return (
                      <div key={round} className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Ronda {round} — {roundTotal} votos
                        </p>
                        {roundVotes.sort((a, b) => b.votos - a.votos).map((v) => {
                          const cand = candidates.find((c) => c.id === v.candidate_id);
                          const pct = roundTotal > 0 ? Math.round((v.votos / roundTotal) * 100) : 0;
                          return (
                            <div key={v.candidate_id} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  {cand && <PlayerAvatar nombre={cand.players.nombre} foto_url={cand.players.foto_url} size="sm" />}
                                  <span className="truncate font-medium">
                                    {cand ? (cand.players.apodo ?? cand.players.nombre) : v.candidate_id.slice(0, 8)}
                                  </span>
                                  {cand?.eliminado && <span className="text-xs text-destructive shrink-0">eliminado</span>}
                                </div>
                                <span className="shrink-0 font-bold ml-2">{v.votos} <span className="text-muted-foreground font-normal text-xs">({pct}%)</span></span>
                              </div>
                              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {voteView === "detail" && (
              <VoteDetailTable
                votes={voteDetails}
                electionId={election.id}
                nullifyMut={nullifyMut}
              />
            )}

            {voteView === "pending" && (
              <PendingVotersList voters={pendingVoters} totalVoted={totalVotes} />
            )}
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="text-xs text-muted-foreground space-y-0.5 border-t border-border pt-3">
        <p>Postulaciones: {new Date(election.postulacion_abre).toLocaleString("es-AR")} → {new Date(election.postulacion_cierra).toLocaleString("es-AR")}</p>
        {election.votacion_abre && (
          <p>Votación: {new Date(election.votacion_abre).toLocaleString("es-AR")} → {election.votacion_cierra ? new Date(election.votacion_cierra).toLocaleString("es-AR") : "—"}</p>
        )}
      </div>
    </div>
  );
}

const EleccionAdmin = () => {
  const { data: elections = [], isLoading } = useElections();
  const createMut = useCreateElection();

  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [postulacionAbre, setPostulacionAbre] = useState(
    () => new Date().toISOString().slice(0, 16)
  );

  async function handleCreate() {
    if (!titulo.trim()) {
      toast.error("Ingresá un título para la elección");
      return;
    }
    const result = await createMut.mutateAsync({
      titulo,
      postulacion_abre: new Date(postulacionAbre).toISOString(),
    });
    if (result.status === "ok") {
      toast.success("Elección creada");
      setTitulo("");
      setShowForm(false);
    } else {
      toast.error(result.status);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="text-amber-500 w-6 h-6" />
          <h1 className="text-xl font-bold text-foreground">Elecciones</h1>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          <Plus size={14} className="mr-1" />
          Nueva elección
        </Button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-primary/30 bg-gradient-card p-5 shadow-card space-y-4">
          <h2 className="font-semibold text-foreground">Nueva elección</h2>
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              placeholder="Ej: Elección Presidencial 2026"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fecha-abre">Inicio de postulaciones</Label>
            <Input
              id="fecha-abre"
              type="datetime-local"
              value={postulacionAbre}
              onChange={(e) => setPostulacionAbre(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Las postulaciones cierran automáticamente 24hs después.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={createMut.isPending} className="flex-1">
              {createMut.isPending ? "Creando..." : "Crear elección"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {elections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay elecciones todavía.</p>
      ) : (
        <div className="space-y-4">
          {elections.map((e) => (
            <ElectionPanel key={e.id} election={e} />
          ))}
        </div>
      )}
    </div>
  );
};

export default EleccionAdmin;
