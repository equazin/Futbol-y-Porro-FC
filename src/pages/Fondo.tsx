import { useMemo } from "react";
import { Wallet, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS, FONDO } from "@/lib/scoring";

const Fondo = () => {
  const qc = useQueryClient();

  const { data: contribs = [], isLoading } = useQuery({
    queryKey: ["contributions_full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contributions")
        .select("*, player:players(id, nombre, apodo, foto_url), match:matches(id, fecha)")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data;
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
    return {
      total,
      cobrado,
      pendiente: total - cobrado,
      saldoVsPremios: cobrado - premios,
    };
  }, [contribs]);

  // agrupar por partido
  const byMatch = useMemo(() => {
    const map = new Map<string, { fecha: string; rows: typeof contribs }>();
    contribs.forEach((c) => {
      const k = c.match_id;
      if (!map.has(k)) map.set(k, { fecha: (c as any).match?.fecha, rows: [] as any });
      map.get(k)!.rows.push(c);
    });
    return [...map.entries()];
  }, [contribs]);

  if (isLoading) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
          <Wallet className="h-6 w-6 text-mvp" />
          Fondo común
        </h1>
        <p className="text-sm text-muted-foreground">
          Aporte: {formatARS(FONDO.APORTE_POR_PARTIDO)} por jugador por partido
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total acumulado" value={formatARS(totals.total)} icon={Wallet} variant="primary" />
        <StatCard label="Cobrado" value={formatARS(totals.cobrado)} icon={CheckCircle2} variant="mvp" />
        <StatCard label="Pendiente" value={formatARS(totals.pendiente)} icon={AlertCircle} variant="stats" />
        <StatCard
          label="Saldo vs premios"
          value={formatARS(totals.saldoVsPremios)}
          icon={TrendingUp}
          hint={`Premios: ${formatARS(FONDO.PREMIO_1 + FONDO.PREMIO_2)}`}
        />
      </div>

      {byMatch.length === 0 ? (
        <EmptyState icon={Wallet} title="Sin aportes registrados" description="Los aportes se generan al cargar planteles en cada partido." />
      ) : (
        <div className="space-y-4">
          {byMatch.map(([matchId, group]) => (
            <div key={matchId} className="rounded-2xl border border-border/60 bg-gradient-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
                <div>
                  <p className="font-black capitalize">
                    {group.fecha ? format(new Date(group.fecha), "EEEE d 'de' MMMM yyyy", { locale: es }) : "Partido"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {group.rows.length} aportes · {formatARS(group.rows.reduce((s, r) => s + Number(r.monto), 0))}
                  </p>
                </div>
                <Button
                  variant="ghost" size="sm"
                  onClick={async () => {
                    const allPaid = group.rows.every((r) => r.pagado);
                    await Promise.all(group.rows.map((r) => togglePagado.mutateAsync({ id: r.id, pagado: !allPaid })));
                    toast.success(allPaid ? "Marcados como pendientes" : "Todos cobrados");
                  }}
                >
                  {group.rows.every((r) => r.pagado) ? "Desmarcar" : "Cobrar todos"}
                </Button>
              </div>
              <div className="divide-y divide-border/30">
                {group.rows.map((c: any) => (
                  <label key={c.id} className="flex items-center gap-3 p-3 hover:bg-secondary/30 cursor-pointer transition-smooth">
                    <Checkbox
                      checked={c.pagado}
                      onCheckedChange={(v) => togglePagado.mutate({ id: c.id, pagado: !!v })}
                    />
                    <PlayerAvatar nombre={c.player?.nombre ?? "?"} foto_url={c.player?.foto_url} size="sm" />
                    <span className="flex-1 font-bold text-sm">
                      {c.player?.apodo ?? c.player?.nombre ?? "Jugador eliminado"}
                    </span>
                    <span className={`font-black ${c.pagado ? "text-primary" : "text-muted-foreground line-through"}`}>
                      {formatARS(Number(c.monto))}
                    </span>
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
