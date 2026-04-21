import { useEffect, useMemo, useState } from "react";
import { Vote, Star, Goal, Check, ArrowLeft, Sparkles, Trophy } from "lucide-react";
import { fmtPartidoSinHora, fmtHora } from "@/lib/dates";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { useMatches, useMatchPlayers } from "@/hooks/useMatches";
import { usePlayers } from "@/hooks/usePlayers";
import { useVotes, useHasVoted, useCastVotes, tallyVotes } from "@/hooks/useVotes";

type Step = "match" | "identify" | "vote" | "done";

const Votacion = () => {
  const { data: matches = [] } = useMatches();
  const { data: players = [] } = usePlayers();

  // Solo partidos votables: no cerrados (pendiente o jugado)
  const votables = useMemo(
    () => matches.filter((m) => m.estado !== "cerrado"),
    [matches]
  );

  const [step, setStep] = useState<Step>("match");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [mvpVote, setMvpVote] = useState<string | null>(null);
  const [goalVote, setGoalVote] = useState<string | null>(null);

  const { data: mp = [] } = useMatchPlayers(matchId ?? undefined);
  const { data: votes = [] } = useVotes(matchId ?? undefined);
  const { data: voted } = useHasVoted(matchId ?? undefined, voterId ?? undefined);
  const castMut = useCastVotes();

  const presentes = useMemo(
    () => mp.filter((r: any) => r.presente).map((r: any) => r.player),
    [mp]
  );
  const goleadores = useMemo(
    () => mp.filter((r: any) => r.presente && r.goles > 0),
    [mp]
  );

  // Si ya votó este jugador, saltar a "done" para mostrar resultados
  useEffect(() => {
    if (voted?.mvp && voted?.goal) setStep("done");
  }, [voted]);

  const reset = () => {
    setStep("match");
    setMatchId(null);
    setVoterId(null);
    setMvpVote(null);
    setGoalVote(null);
  };

  const onSubmit = async () => {
    if (!matchId || !voterId || !mvpVote || !goalVote) return;
    try {
      await castMut.mutateAsync({ matchId, voterId, mvpVotedId: mvpVote, goalVotedId: goalVote });
      toast.success("¡Votos registrados!");
      setStep("done");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo registrar la votación");
    }
  };

  const selectedMatch = matches.find((m) => m.id === matchId);

  // Resultados en vivo
  const mvpTally = useMemo(() => tallyVotes(votes, "mvp"), [votes]);
  const goalTally = useMemo(() => tallyVotes(votes, "goal"), [votes]);
  const totalVoters = useMemo(
    () => new Set(votes.map((v) => v.voter_player_id)).size,
    [votes]
  );

  const playerById = (id: string) => players.find((p) => p.id === id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
          <Vote className="h-6 w-6 text-mvp" />
          Votación
        </h1>
        <p className="text-sm text-muted-foreground">MVP y Gol de la fecha</p>
      </header>

      {/* PASO 1: ELEGIR PARTIDO */}
      {step === "match" && (
        <>
          {votables.length === 0 ? (
            <EmptyState
              icon={Vote}
              title="No hay partidos para votar"
              description="Cuando haya un partido pendiente o jugado, aparecerá acá."
            />
          ) : (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                Elegí el partido
              </p>
              {votables.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMatchId(m.id);
                    setStep("identify");
                  }}
                  className="w-full text-left rounded-2xl border border-border/60 bg-gradient-card p-4 transition-smooth hover:border-mvp/40 hover:shadow-glow"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black capitalize">
                        {fmtPartidoSinHora(m.fecha)}
                      </p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                        {m.estado} · {fmtHora(m.fecha)} hs
                      </p>
                    </div>
                    {m.estado === "jugado" && (
                      <div className="text-right">
                        <p className="font-black text-xl">
                          {m.equipo_a_score} - {m.equipo_b_score}
                        </p>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* PASO 2: IDENTIFICARSE */}
      {step === "identify" && selectedMatch && (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setStep("match")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Cambiar partido
          </Button>
          <div className="rounded-xl border border-border/60 bg-gradient-card p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">
              Partido seleccionado
            </p>
            <p className="font-black capitalize">
              {fmtPartidoSinHora(selectedMatch.fecha)}
            </p>
          </div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
            ¿Quién sos?
          </p>
          {presentes.length === 0 ? (
            <EmptyState
              icon={Vote}
              title="Aún no hay planteles cargados"
              description="Pedile al admin que cargue quiénes jugaron antes de votar."
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {presentes.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setVoterId(p.id);
                    setStep("vote");
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/40 bg-card/50 hover:border-mvp/40 hover:bg-card transition-smooth"
                >
                  <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="lg" />
                  <p className="font-bold text-sm text-center truncate w-full">
                    {p.apodo ?? p.nombre}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PASO 3: VOTAR */}
      {step === "vote" && voterId && (
        <div className="space-y-5">
          <Button variant="ghost" size="sm" onClick={() => setStep("identify")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> No soy yo
          </Button>

          {voted?.mvp && voted?.goal ? (
            <div className="rounded-xl border border-mvp/30 bg-mvp/10 p-4 text-center">
              <Check className="h-8 w-8 text-mvp mx-auto mb-2" />
              <p className="font-black">Ya votaste en este partido</p>
              <Button variant="link" onClick={() => setStep("done")} className="mt-2">
                Ver resultados →
              </Button>
            </div>
          ) : (
            <>
              {/* MVP */}
              <div className="rounded-xl border border-mvp/30 bg-gradient-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-5 w-5 text-mvp" />
                  <h3 className="font-black">MVP del partido</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Elegí al mejor jugador (no podés votarte a vos mismo).
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {presentes
                    .filter((p: any) => p.id !== voterId)
                    .map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => setMvpVote(p.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-smooth ${
                          mvpVote === p.id
                            ? "border-mvp bg-mvp/15 shadow-glow"
                            : "border-border/40 bg-card/50 hover:border-mvp/40"
                        }`}
                      >
                        <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="md" />
                        <p className="font-bold text-xs text-center truncate w-full">
                          {p.apodo ?? p.nombre}
                        </p>
                        {mvpVote === p.id && <Check className="h-3 w-3 text-mvp" />}
                      </button>
                    ))}
                </div>
              </div>

              {/* GOL */}
              <div className="rounded-xl border border-stats/30 bg-gradient-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Goal className="h-5 w-5 text-stats" />
                  <h3 className="font-black">Gol de la fecha</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Solo entre quienes metieron al menos un gol.
                </p>
                {goleadores.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    Aún no se cargaron goles en este partido.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {goleadores.map((r: any) => (
                      <button
                        key={r.player.id}
                        onClick={() => setGoalVote(r.player.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-smooth ${
                          goalVote === r.player.id
                            ? "border-stats bg-stats/15 shadow-glow"
                            : "border-border/40 bg-card/50 hover:border-stats/40"
                        }`}
                      >
                        <PlayerAvatar nombre={r.player.nombre} foto_url={r.player.foto_url} size="md" />
                        <p className="font-bold text-xs text-center truncate w-full">
                          {r.player.apodo ?? r.player.nombre}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{r.goles} ⚽</p>
                        {goalVote === r.player.id && <Check className="h-3 w-3 text-stats" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={onSubmit}
                disabled={!mvpVote || !goalVote || castMut.isPending}
                className="w-full shadow-glow"
                size="lg"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Confirmar votos
              </Button>
            </>
          )}
        </div>
      )}

      {/* PASO 4: RESULTADOS */}
      {step === "done" && selectedMatch && (
        <div className="space-y-4">
          <div className="rounded-xl border border-mvp/30 bg-mvp/10 p-4 text-center">
            <Check className="h-8 w-8 text-mvp mx-auto mb-2" />
            <p className="font-black">¡Gracias por votar!</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalVoters} {totalVoters === 1 ? "jugador votó" : "jugadores votaron"} hasta ahora
            </p>
          </div>

          {/* Tally MVP */}
          <div className="rounded-xl border border-border/60 bg-gradient-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-mvp" />
              <h3 className="font-black">Conteo MVP en vivo</h3>
            </div>
            {mvpTally.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">Sin votos todavía</p>
            ) : (
              <div className="space-y-2">
                {mvpTally.map((t, i) => {
                  const p = playerById(t.player_id);
                  if (!p) return null;
                  const pct = totalVoters ? (t.count / totalVoters) * 100 : 0;
                  return (
                    <div key={t.player_id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-muted-foreground w-4">{i + 1}</span>
                        <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="sm" />
                        <p className="font-bold text-sm flex-1 truncate">{p.apodo ?? p.nombre}</p>
                        <span className="text-sm font-black text-mvp">{t.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-mvp transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tally Gol */}
          <div className="rounded-xl border border-border/60 bg-gradient-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Goal className="h-4 w-4 text-stats" />
              <h3 className="font-black">Conteo Gol de la fecha</h3>
            </div>
            {goalTally.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">Sin votos todavía</p>
            ) : (
              <div className="space-y-2">
                {goalTally.map((t, i) => {
                  const p = playerById(t.player_id);
                  if (!p) return null;
                  const pct = totalVoters ? (t.count / totalVoters) * 100 : 0;
                  return (
                    <div key={t.player_id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-muted-foreground w-4">{i + 1}</span>
                        <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="sm" />
                        <p className="font-bold text-sm flex-1 truncate">{p.apodo ?? p.nombre}</p>
                        <span className="text-sm font-black text-stats">{t.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-stats transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Los ganadores se asignan al cerrar el partido desde su detalle.
          </p>
          <Button variant="outline" onClick={reset} className="w-full">
            Votar en otro partido
          </Button>
        </div>
      )}
    </div>
  );
};

export default Votacion;
