import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Goal, Megaphone, Share2, Star, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { fmtPartidoLargo } from "@/lib/dates";
import { useMatch } from "@/hooks/useMatches";
import { usePlayers, type Player } from "@/hooks/usePlayers";
import { tallyVotes, useVotes, type VoteTally } from "@/hooks/useVotes";

const getCurrentUrl = () => {
  if (typeof window === "undefined") return "";
  return window.location.href;
};

const getPlayerLabel = (player?: Player | null) => player?.apodo ?? player?.nombre ?? "-";

interface WinnerCardProps {
  title: string;
  player?: Player | null;
  votes?: number;
  tone: "mvp" | "stats";
  icon: "star" | "goal";
}

const WinnerCard = ({ title, player, votes, tone, icon }: WinnerCardProps) => {
  const Icon = icon === "star" ? Star : Goal;
  const toneClass = tone === "mvp" ? "border-mvp/40 bg-mvp/10 text-mvp" : "border-stats/40 bg-stats/10 text-stats";

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.2em] font-black">{title}</p>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-5 flex items-center gap-4 min-w-0">
        <PlayerAvatar nombre={player?.nombre ?? "?"} foto_url={player?.foto_url} size="xl" />
        <div className="min-w-0">
          <p className="text-3xl font-black text-foreground truncate">{getPlayerLabel(player)}</p>
          <p className="text-xs text-muted-foreground">
            {votes !== undefined ? `${votes} ${votes === 1 ? "voto" : "votos"}` : "Ganador guardado"}
          </p>
        </div>
      </div>
    </div>
  );
};

interface PodiumListProps {
  title: string;
  tally: VoteTally[];
  players: Player[];
  tone: "mvp" | "stats";
}

const PodiumList = ({ title, tally, players, tone }: PodiumListProps) => {
  const textClass = tone === "mvp" ? "text-mvp" : "text-stats";

  if (tally.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
      <p className={`text-[10px] uppercase tracking-[0.2em] font-black ${textClass}`}>{title}</p>
      {tally.slice(0, 3).map((row, index) => {
        const player = players.find((p) => p.id === row.player_id);
        if (!player) return null;
        return (
          <div key={row.player_id} className="flex items-center gap-2 text-sm">
            <span className="w-5 font-black text-muted-foreground">{index + 1}</span>
            <PlayerAvatar nombre={player.nombre} foto_url={player.foto_url} size="sm" />
            <span className="font-bold flex-1 truncate">{getPlayerLabel(player)}</span>
            <span className={`font-black ${textClass}`}>{row.count}</span>
          </div>
        );
      })}
    </div>
  );
};

const AnuncioGanadores = () => {
  const { id } = useParams<{ id: string }>();
  const { data: match, isLoading: loadingMatch } = useMatch(id);
  const { data: players = [] } = usePlayers(false);
  const { data: votes = [] } = useVotes(id);

  const mvpTally = useMemo(() => tallyVotes(votes, "mvp"), [votes]);
  const goalTally = useMemo(() => tallyVotes(votes, "goal"), [votes]);
  const totalVoters = useMemo(() => new Set(votes.map((vote) => vote.voter_player_id)).size, [votes]);

  const mvpWinnerId = match?.mvp_player_id ?? mvpTally[0]?.player_id;
  const goalWinnerId = match?.gol_de_la_fecha_player_id ?? goalTally[0]?.player_id;
  const mvpWinner = players.find((player) => player.id === mvpWinnerId) ?? null;
  const goalWinner = players.find((player) => player.id === goalWinnerId) ?? null;
  const mvpVotes = mvpTally.find((row) => row.player_id === mvpWinnerId)?.count;
  const goalVotes = goalTally.find((row) => row.player_id === goalWinnerId)?.count;
  const isOfficial = match?.estado === "cerrado" && Boolean(match.mvp_player_id || match.gol_de_la_fecha_player_id);
  const canAnnounce = Boolean(mvpWinner || goalWinner);

  const announcementText = useMemo(() => {
    if (!match) return "";
    const status = isOfficial ? "Ganadores oficiales" : "Ganadores provisorios";
    return [
      `${status} - Futbol y Porro FC`,
      fmtPartidoLargo(match.fecha),
      `Resultado: Equipo A ${match.equipo_a_score} - ${match.equipo_b_score} Equipo B`,
      `MVP: ${getPlayerLabel(mvpWinner)}`,
      `Gol de la fecha: ${getPlayerLabel(goalWinner)}`,
      getCurrentUrl(),
    ].join("\n");
  }, [goalWinner, isOfficial, match, mvpWinner]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getCurrentUrl());
      toast.success("Link copiado");
    } catch {
      toast.error("No se pudo copiar el link.");
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(announcementText);
      toast.success("Texto copiado");
    } catch {
      toast.error("No se pudo copiar el texto.");
    }
  };

  const shareAnnouncement = async () => {
    if (!navigator.share) {
      await copyText();
      return;
    }
    try {
      await navigator.share({
        title: "Ganadores Futbol y Porro FC",
        text: announcementText,
        url: getCurrentUrl(),
      });
    } catch (error) {
      if ((error as Error).name !== "AbortError") toast.error("No se pudo compartir.");
    }
  };

  if (loadingMatch) {
    return <p className="text-muted-foreground">Cargando anuncio...</p>;
  }

  if (!match) {
    return (
      <div className="rounded-2xl border border-border/60 bg-gradient-card p-6 text-center space-y-4">
        <p className="font-black text-xl">No se encontro el partido</p>
        <Button asChild variant="outline">
          <Link to="/partidos">Volver a partidos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-primary/30 bg-gradient-card p-5 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary mb-3">
              <Megaphone className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-black">
                {isOfficial ? "Ganadores oficiales" : "Conteo actual"}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">Ganadores de la fecha</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-2">{fmtPartidoLargo(match.fecha)}</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/50 p-4 min-w-[220px] text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black">Resultado</p>
            <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <div>
                <p className="text-[10px] uppercase text-primary font-black">Equipo A</p>
                <p className="text-4xl font-black">{match.equipo_a_score}</p>
              </div>
              <p className="pb-2 text-muted-foreground font-black">vs</p>
              <div>
                <p className="text-[10px] uppercase text-stats font-black">Equipo B</p>
                <p className="text-4xl font-black">{match.equipo_b_score}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {canAnnounce ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <WinnerCard title="MVP" player={mvpWinner} votes={mvpVotes} tone="mvp" icon="star" />
          <WinnerCard title="Gol de la fecha" player={goalWinner} votes={goalVotes} tone="stats" icon="goal" />
        </div>
      ) : (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-yellow-600">
          <p className="font-black">Todavia no hay ganadores para anunciar.</p>
          <p className="text-sm mt-1">Cuando haya votos o cierres la votacion, este link va a mostrar MVP y Gol de la fecha.</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <PodiumList title="Top MVP" tally={mvpTally} players={players} tone="mvp" />
        <PodiumList title="Top Gol de la fecha" tally={goalTally} players={players} tone="stats" />
      </div>

      <section className="rounded-2xl border border-border/60 bg-card/30 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="font-black flex items-center gap-2">
            <Trophy className="h-4 w-4 text-mvp" />
            Listo para compartir
          </p>
          <p className="text-xs text-muted-foreground">
            {totalVoters} {totalVoters === 1 ? "jugador voto" : "jugadores votaron"} en esta fecha.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={copyLink}>
            <Copy className="h-4 w-4 mr-1.5" />
            Copiar link
          </Button>
          <Button type="button" variant="outline" onClick={copyText} disabled={!canAnnounce}>
            <Megaphone className="h-4 w-4 mr-1.5" />
            Copiar texto
          </Button>
          <Button type="button" onClick={shareAnnouncement} disabled={!canAnnounce}>
            <Share2 className="h-4 w-4 mr-1.5" />
            Compartir
          </Button>
        </div>
      </section>

      <Button asChild variant="ghost">
        <Link to="/partidos">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Volver a partidos
        </Link>
      </Button>
    </div>
  );
};

export default AnuncioGanadores;
