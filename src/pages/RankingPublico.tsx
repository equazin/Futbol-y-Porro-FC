import { Trophy, Goal, Star, Award, Share2 } from "lucide-react";
import { toast } from "sonner";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { useRanking } from "@/hooks/useRanking";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatARS, FONDO } from "@/lib/scoring";
import { getAchievements } from "@/lib/achievements";

const RankingPublico = () => {
  const { data: ranking = [], isLoading } = useRanking();

  const onShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Ranking Futbol y Porro FC", url });
      } catch { /* canceled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    }
  };

  if (isLoading) return <p className="p-6 text-muted-foreground">Cargando…</p>;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header público */}
        <header className="text-center pb-4 border-b border-border/40">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-lg bg-gradient-primary shadow-glow grid place-items-center">
              <span className="text-primary-foreground font-black text-lg">⚽</span>
            </div>
            <div className="text-left">
              <h1 className="font-black text-xl tracking-tight">Futbol y Porro FC</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Futbol y Porro de los domingos</p>
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-black mt-2 flex items-center justify-center gap-2">
            <Trophy className="h-7 w-7 text-mvp" />
            Tabla del torneo
          </h2>
          <Button variant="outline" size="sm" onClick={onShare} className="mt-3">
            <Share2 className="h-3.5 w-3.5 mr-1.5" /> Compartir ranking
          </Button>
        </header>

        {ranking.length === 0 ? (
          <EmptyState icon={Trophy} title="Todavía no hay datos" description="Cerrá partidos para ver el ranking actualizado." />
        ) : (
          <>
            {/* Podio */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 0, 2].map((idx) => {
                const p = ranking[idx];
                if (!p) return <div key={idx} className="rounded-xl border border-dashed border-border/50" />;
                const pos = idx + 1;
                const isFirst = pos === 1;
                const heightCls = isFirst ? "pt-4" : pos === 2 ? "pt-8" : "pt-10";
                const colorCls = isFirst
                  ? "border-mvp/50 shadow-mvp bg-gradient-card"
                  : pos === 2
                  ? "border-primary/40 bg-gradient-card"
                  : "border-stats/30 bg-gradient-card";
                const prizeLabel = pos === 1 ? formatARS(FONDO.PREMIO_1) : pos === 2 ? formatARS(FONDO.PREMIO_2) : "Remera";
                return (
                  <div key={p.player_id} className={`relative rounded-xl border ${colorCls} p-3 text-center ${heightCls}`}>
                    {isFirst && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-1 rounded-full bg-gradient-mvp text-mvp-foreground text-[10px] font-black shadow-mvp">
                        👑 #1
                      </div>
                    )}
                    <div className="flex justify-center mb-2">
                      <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size={isFirst ? "xl" : "lg"} />
                    </div>
                    <p className="font-black text-sm truncate">{p.apodo ?? p.nombre}</p>
                    <p className="text-3xl font-black mt-1">{p.puntos}</p>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">pts</p>
                    <p className="text-[10px] mt-2 font-bold text-mvp">{prizeLabel}</p>
                  </div>
                );
              })}
            </div>

            {/* Tabla simple */}
            <div className="rounded-2xl border border-border/60 bg-gradient-card overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-3 border-b border-border/40 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Jugador</div>
                <div className="col-span-1 text-center">PJ</div>
                <div className="col-span-1 text-center"><Goal className="inline h-3 w-3" /></div>
                <div className="col-span-1 text-center"><Star className="inline h-3 w-3" /></div>
                <div className="col-span-1 text-center">ELO</div>
                <div className="col-span-2 text-right">Pts</div>
              </div>

              {ranking.map((p, i) => {
                const a = getAchievements(p);
                return (
                  <div
                    key={p.player_id}
                    className="grid grid-cols-12 gap-2 px-3 py-3 border-b border-border/30 last:border-b-0 items-center text-sm"
                  >
                    <div className={`col-span-1 font-black ${i === 0 ? "text-mvp" : i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                      {i + 1}
                    </div>
                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="sm" />
                      <div className="min-w-0">
                        <p className="font-bold truncate">{p.apodo ?? p.nombre}</p>
                        {a.length > 0 && (
                          <div className="flex gap-1 mt-0.5">
                            {a.slice(0, 3).map((x) => {
                              const Icon = x.icon;
                              return (
                                <Icon key={x.id} className={`h-3 w-3 ${x.color}`} />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1 text-center text-muted-foreground">{p.partidos_jugados}</div>
                    <div className="col-span-1 text-center font-bold">{p.goles}</div>
                    <div className="col-span-1 text-center text-mvp font-bold">{p.mvp_count || "-"}</div>
                    <div className="col-span-1 text-center text-xs text-muted-foreground">{Math.round(Number(p.elo ?? 1000))}</div>
                    <div className="col-span-2 text-right font-black text-base">{p.puntos}</div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-border/60 bg-gradient-card p-4">
              <h3 className="font-black mb-3 flex items-center gap-2"><Award className="h-4 w-4 text-mvp" /> Premios</h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="p-2 rounded-lg bg-mvp/10 border border-mvp/30">
                  <p className="text-[10px] uppercase font-bold text-mvp">1° puesto</p>
                  <p className="font-black">{formatARS(FONDO.PREMIO_1)}</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                  <p className="text-[10px] uppercase font-bold text-primary">2° puesto</p>
                  <p className="font-black">{formatARS(FONDO.PREMIO_2)}</p>
                </div>
                <div className="p-2 rounded-lg bg-stats/10 border border-stats/30">
                  <p className="text-[10px] uppercase font-bold text-stats">3° a 5°</p>
                  <p className="font-black">Remera</p>
                </div>
              </div>
            </div>

            <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest">
              Ranking oficial · Fútbol y Porro FC
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default RankingPublico;

