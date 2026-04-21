import { useMemo, useState } from "react";
import { Wallet, TrendingUp, AlertCircle, CheckCircle2, Users, CalendarClock, Banknote } from "lucide-react";
import { fmtPartidoConAño } from "@/lib/dates";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { formatARS, FONDO } from "@/lib/scoring";
import { useFondo } from "@/hooks/useRanking";

type ContributionRow = {
  id: string;
  match_id: string;
  monto: number;
  pagado: boolean;
  player: {
    id: string;
    nombre: string;
    apodo: string | null;
    foto_url: string | null;
  } | null;
  match: {
    id: string;
    fecha: string;
  } | null;
};

type MatchGroup = {
  matchId: string;
  fecha: string | null;
  rows: ContributionRow[];
  total: number;
  cobrado: number;
  pendiente: number;
  paidCount: number;
  pendingCount: number;
  progreso: number;
};

const Fondo = ({ readOnly = false }: { readOnly?: boolean }) => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const { data: fondoGlobal } = useFondo();

  const { data: contribs = [], isLoading } = useQuery({
    queryKey: ["contributions_full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contributions")
        .select("id, match_id, monto, pagado, player:players(id, nombre, apodo, foto_url), match:matches(id, fecha)")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContributionRow[];
    },
  });

  const togglePagado = useMutation({
    mutationFn: async ({ id, pagado }: { id: string; pagado: boolean }) => {
      const { error } = await supabase.from("contributions").update({ pagado }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contributions_full"] });
      qc.invalidateQueries({ queryKey: ["fondo"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totals = useMemo(() => {
    const total = contribs.reduce((s, c) => s + Number(c.monto), 0);
    const cobrado = contribs.filter((c) => c.pagado).reduce((s, c) => s + Number(c.monto), 0);
    const premios = FONDO.PREMIO_1 + FONDO.PREMIO_2;
    const pendiente = total - cobrado;
    return {
      total,
      cobrado,
      pendiente,
      saldoVsPremios: cobrado - premios,
      progreso: total > 0 ? Math.round((cobrado / total) * 100) : 0,
    };
  }, [contribs]);

  const groups = useMemo<MatchGroup[]>(() => {
    const map = new Map<string, { fecha: string | null; rows: ContributionRow[] }>();
    contribs.forEach((c) => {
      if (!map.has(c.match_id)) map.set(c.match_id, { fecha: c.match?.fecha ?? null, rows: [] });
      map.get(c.match_id)!.rows.push(c);
    });

    const result = [...map.entries()].map(([matchId, group]) => {
      const total = group.rows.reduce((s, r) => s + Number(r.monto), 0);
      const cobrado = group.rows.filter((r) => r.pagado).reduce((s, r) => s + Number(r.monto), 0);
      const pendiente = total - cobrado;
      const paidCount = group.rows.filter((r) => r.pagado).length;
      const pendingCount = group.rows.length - paidCount;
      const progreso = total > 0 ? Math.round((cobrado / total) * 100) : 0;
      return {
        matchId,
        fecha: group.fecha,
        rows: group.rows,
        total,
        cobrado,
        pendiente,
        paidCount,
        pendingCount,
        progreso,
      };
    });

    return result.sort((a, b) => {
      const ad = a.fecha ? new Date(a.fecha).getTime() : 0;
      const bd = b.fecha ? new Date(b.fecha).getTime() : 0;
      return bd - ad;
    });
  }, [contribs]);

  const filteredGroups = useMemo(() => {
    if (filter === "all") return groups;
    if (filter === "pending") return groups.filter((g) => g.pendingCount > 0);
    return groups.filter((g) => g.pendingCount === 0);
  }, [filter, groups]);

  if (isLoading) return <p className="text-muted-foreground">Cargando...</p>;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-primary/30 bg-gradient-card p-5 shadow-card space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-5 w-5 text-primary" />
              <h1 className="text-2xl md:text-3xl font-black">Fondo comun</h1>
            </div>
            <p className="text-sm text-muted-foreground">Aporte default: {formatARS(FONDO.APORTE_POR_PARTIDO)} por jugador</p>
          </div>
          {fondoGlobal !== undefined && (
            <div className="rounded-xl border border-mvp/40 bg-mvp/10 px-4 py-3 text-right shrink-0">
              <p className="text-[10px] uppercase font-bold text-mvp tracking-wider flex items-center justify-end gap-1">
                <Banknote className="h-3.5 w-3.5" /> Caja disponible
              </p>
              <p className="text-2xl font-black text-mvp">{formatARS(fondoGlobal.caja)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Aportes + multas cobradas
              </p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span>Progreso de cobranza de aportes</span>
            <span>{totals.progreso}%</span>
          </div>
          <Progress value={totals.progreso} />
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total acumulado" value={formatARS(totals.total)} icon={Wallet} variant="primary" />
        <StatCard label="Cobrado" value={formatARS(totals.cobrado)} icon={CheckCircle2} variant="mvp" />
        <StatCard label="Pendiente" value={formatARS(totals.pendiente)} icon={AlertCircle} variant="stats" />
        <StatCard label="Saldo vs premios" value={formatARS(totals.saldoVsPremios)} icon={TrendingUp} hint={`Premios: ${formatARS(FONDO.PREMIO_1 + FONDO.PREMIO_2)}`} />
        <StatCard label="Fechas con aportes" value={groups.length} icon={CalendarClock} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
          Todas ({groups.length})
        </Button>
        <Button variant={filter === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilter("pending")}>
          Con pendiente ({groups.filter((g) => g.pendingCount > 0).length})
        </Button>
        <Button variant={filter === "paid" ? "default" : "outline"} size="sm" onClick={() => setFilter("paid")}>
          Cerradas ({groups.filter((g) => g.pendingCount === 0).length})
        </Button>
      </div>

      {filteredGroups.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Sin resultados para este filtro"
          description={groups.length === 0 ? "Los aportes se generan al cargar planteles en cada partido." : "No hay fechas que coincidan con el filtro seleccionado."}
        />
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <div key={group.matchId} className="rounded-2xl border border-border/60 bg-gradient-card overflow-hidden shadow-card">
              <div className="px-4 py-3 border-b border-border/40 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-black capitalize">
                    {group.fecha ? fmtPartidoConAño(group.fecha) : "Partido"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {group.rows.length} jugadores · {formatARS(group.total)} total · {formatARS(group.pendiente)} pendiente
                  </p>
                </div>

                <div className="w-full md:w-[240px] space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{group.paidCount} pagados</span>
                    <span>{group.pendingCount} pendientes</span>
                  </div>
                  <Progress value={group.progreso} />
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={readOnly}
                  onClick={async () => {
                    if (readOnly) return;
                    const setPaid = group.pendingCount > 0;
                    const targets = group.rows.filter((r) => r.pagado !== setPaid);
                    await Promise.all(targets.map((r) => togglePagado.mutateAsync({ id: r.id, pagado: setPaid })));
                    toast.success(setPaid ? "Fecha marcada como cobrada" : "Fecha marcada como pendiente");
                  }}
                >
                  {group.pendingCount > 0 ? "Cobrar pendientes" : "Marcar pendientes"}
                </Button>
              </div>

              <div className="divide-y divide-border/30">
                {group.rows.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 p-3 hover:bg-secondary/30 cursor-pointer transition-smooth">
                    <Checkbox checked={c.pagado} disabled={readOnly} onCheckedChange={(v) => !readOnly && togglePagado.mutate({ id: c.id, pagado: !!v })} />
                    <PlayerAvatar nombre={c.player?.nombre ?? "?"} foto_url={c.player?.foto_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{c.player?.apodo ?? c.player?.nombre ?? "Jugador eliminado"}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span
                        className={`font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                          c.pagado ? "text-primary border-primary/30 bg-primary/10" : "text-muted-foreground border-border bg-card/60"
                        }`}
                      >
                        {c.pagado ? "Pagado" : "Pendiente"}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Fondo;
