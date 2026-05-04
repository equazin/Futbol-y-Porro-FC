import { useMemo, useState } from "react";
import { Wallet, TrendingUp, AlertCircle, CheckCircle2, Users, CalendarClock, Banknote, Plus, Trash2, ArrowDownCircle, ArrowUpCircle, Pencil } from "lucide-react";
import { fmtPartidoConAño } from "@/lib/dates";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type FundMovement = {
  id: string;
  fecha: string;
  tipo: "ingreso" | "egreso";
  monto: number;
  motivo: string;
  created_at: string;
};

const Fondo = ({ readOnly = false }: { readOnly?: boolean }) => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementTipo, setMovementTipo] = useState<"ingreso" | "egreso">("egreso");
  const [movementMonto, setMovementMonto] = useState("");
  const [movementMotivo, setMovementMotivo] = useState("");
  const [movementFecha, setMovementFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState("");
  const [adjustMotivo, setAdjustMotivo] = useState("Ajuste manual de caja");
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

  const { data: movements = [] } = useQuery({
    queryKey: ["fund_movements"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fund_movements")
        .select("id, fecha, tipo, monto, motivo, created_at")
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") return [];
        throw error;
      }
      return (data ?? []) as FundMovement[];
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

  const createMovement = useMutation({
    mutationFn: async () => {
      const monto = Math.round(Number(movementMonto));
      const motivo = movementMotivo.trim();
      if (!monto || monto <= 0) throw new Error("Ingresa un monto valido");
      if (!motivo) throw new Error("Ingresa un motivo");

      const { error } = await (supabase as any).from("fund_movements").insert({
        tipo: movementTipo,
        monto,
        motivo,
        fecha: new Date(`${movementFecha}T12:00:00`).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fund_movements"] });
      qc.invalidateQueries({ queryKey: ["fondo"] });
      toast.success("Movimiento registrado");
      setMovementOpen(false);
      setMovementTipo("egreso");
      setMovementMonto("");
      setMovementMotivo("");
      setMovementFecha(new Date().toISOString().slice(0, 10));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openAdjustDialog = () => {
    setAdjustTarget(String(Math.round(fondoGlobal?.caja ?? 0)));
    setAdjustMotivo("Ajuste manual de caja");
    setAdjustOpen(true);
  };

  const adjustCash = useMutation({
    mutationFn: async () => {
      const current = Math.round(Number(fondoGlobal?.caja ?? 0));
      const target = Math.round(Number(adjustTarget));
      if (!Number.isFinite(target) || target < 0) throw new Error("Ingresa un monto valido");

      const delta = target - current;
      if (delta === 0) throw new Error("La caja ya tiene ese monto");

      const motivo = adjustMotivo.trim() || `Ajuste manual de caja a ${formatARS(target)}`;
      const { error } = await (supabase as any).from("fund_movements").insert({
        tipo: delta > 0 ? "ingreso" : "egreso",
        monto: Math.abs(delta),
        motivo,
        fecha: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fund_movements"] });
      qc.invalidateQueries({ queryKey: ["fondo"] });
      toast.success("Caja ajustada");
      setAdjustOpen(false);
      setAdjustTarget("");
      setAdjustMotivo("Ajuste manual de caja");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMovement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("fund_movements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fund_movements"] });
      qc.invalidateQueries({ queryKey: ["fondo"] });
      toast.success("Movimiento eliminado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totals = useMemo(() => {
    // Solo contar aportes desde la fecha de inicio del sistema digital
    const digitalContribs = contribs.filter((c) => {
      const fecha = c.match?.fecha;
      return fecha != null && fecha >= FONDO.FECHA_INICIO;
    });
    const total = digitalContribs.reduce((s, c) => s + Number(c.monto), 0);
    const cobrado = digitalContribs.filter((c) => c.pagado).reduce((s, c) => s + Number(c.monto), 0);
    const premios = FONDO.PREMIO_1 + FONDO.PREMIO_2;
    const pendiente = total - cobrado;
    // La caja real incluye la base histórica
    const cajaReal = (fondoGlobal?.caja ?? FONDO.BASE + cobrado);
    return {
      total,
      cobrado,
      pendiente,
      saldoVsPremios: cajaReal - premios,
      progreso: total > 0 ? Math.round((cobrado / total) * 100) : 0,
    };
  }, [contribs, fondoGlobal]);

  const groups = useMemo<MatchGroup[]>(() => {
    const map = new Map<string, { fecha: string | null; rows: ContributionRow[] }>();
    // Solo mostrar partidos desde la fecha de inicio del sistema digital
    const digitalContribs = contribs.filter((c) => {
      const fecha = c.match?.fecha;
      return fecha != null && fecha >= FONDO.FECHA_INICIO;
    });
    digitalContribs.forEach((c) => {
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
            <div className="rounded-xl border border-mvp/40 bg-mvp/10 px-4 py-3 text-right shrink-0 space-y-1">
              <p className="text-[10px] uppercase font-bold text-mvp tracking-wider flex items-center justify-end gap-1">
                <Banknote className="h-3.5 w-3.5" /> Caja disponible
              </p>
              <p className="text-2xl font-black text-mvp">{formatARS(fondoGlobal.caja)}</p>
              <div className="flex flex-col items-end gap-0.5 text-[10px] text-muted-foreground">
                <span>Base histórica: <span className="font-bold text-foreground">{formatARS(fondoGlobal.base)}</span></span>
                <span>Aportes digitales: <span className="font-bold text-foreground">{formatARS(fondoGlobal.aportesDigitales)}</span></span>
                {fondoGlobal.multasCobradas > 0 && (
                  <span>Multas cobradas: <span className="font-bold text-foreground">{formatARS(fondoGlobal.multasCobradas)}</span></span>
                )}
                {(fondoGlobal.manualSaldo ?? 0) !== 0 && (
                  <span>Ajustes manuales: <span className="font-bold text-foreground">{formatARS(fondoGlobal.manualSaldo)}</span></span>
                )}
              </div>
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
        <StatCard label="Cobrado (digital)" value={formatARS(totals.cobrado)} icon={CheckCircle2} variant="mvp" />
        <StatCard label="Pendiente (digital)" value={formatARS(totals.pendiente)} icon={AlertCircle} variant="stats" />
        <StatCard label="Saldo vs premios" value={formatARS(totals.saldoVsPremios)} icon={TrendingUp} hint={`Premios: ${formatARS(FONDO.PREMIO_1 + FONDO.PREMIO_2)}`} />
        <StatCard label="Ajustes manuales" value={formatARS(fondoGlobal?.manualSaldo ?? 0)} icon={TrendingUp} hint={`Ingresos: ${formatARS(fondoGlobal?.manualIngresos ?? 0)} · Egresos: ${formatARS(fondoGlobal?.manualEgresos ?? 0)}`} />
        <StatCard label="Fechas con aportes" value={groups.length} icon={CalendarClock} />
      </div>

      <section className="rounded-2xl border border-border/60 bg-gradient-card overflow-hidden shadow-card">
        <div className="px-4 py-3 border-b border-border/40 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-black flex items-center gap-2">
              <Banknote className="h-4 w-4 text-mvp" />
              Movimientos manuales
            </p>
            <p className="text-xs text-muted-foreground">
              Registra ingresos o egresos del fondo para eventos, compras o ajustes de caja.
            </p>
          </div>
          {!readOnly && (
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button onClick={openAdjustDialog} size="sm" variant="outline" disabled={fondoGlobal === undefined}>
                <Pencil className="h-4 w-4 mr-1.5" />
                Ajustar caja visible
              </Button>
              <Button onClick={() => setMovementOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Nuevo movimiento
              </Button>
            </div>
          )}
        </div>

        {movements.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No hay movimientos manuales registrados.
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {movements.map((m) => {
              const isIncome = m.tipo === "ingreso";
              return (
                <div key={m.id} className="p-3 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl grid place-items-center ${isIncome ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
                    {isIncome ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{m.motivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.fecha).toLocaleDateString("es-AR")} · {isIncome ? "Ingreso" : "Egreso"}
                    </p>
                  </div>
                  <p className={`font-black ${isIncome ? "text-primary" : "text-destructive"}`}>
                    {isIncome ? "+" : "-"}{formatARS(Number(m.monto))}
                  </p>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => deleteMovement.mutate(m.id)}
                      disabled={deleteMovement.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

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
          description={groups.length === 0 ? `Los aportes se registran desde el ${new Date(FONDO.FECHA_INICIO).toLocaleDateString("es-AR")} al cargar planteles en cada partido.` : "No hay fechas que coincidan con el filtro seleccionado."}
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

      {!readOnly && (
        <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo movimiento del fondo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={movementTipo} onValueChange={(v) => setMovementTipo(v as "ingreso" | "egreso")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="egreso">Egreso (sale plata)</SelectItem>
                    <SelectItem value="ingreso">Ingreso (entra plata)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    min={1}
                    step={100}
                    value={movementMonto}
                    onChange={(e) => setMovementMonto(e.target.value)}
                    placeholder="Ej: 15000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input type="date" value={movementFecha} onChange={(e) => setMovementFecha(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Motivo</Label>
                <Input
                  value={movementMotivo}
                  onChange={(e) => setMovementMotivo(e.target.value)}
                  placeholder="Ej: Compra comida evento del equipo"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setMovementOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => createMovement.mutate()} disabled={createMovement.isPending}>
                Registrar movimiento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {!readOnly && (
        <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajustar caja visible</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-mvp/30 bg-mvp/10 px-3 py-2">
                <p className="text-[10px] uppercase font-bold text-mvp">Caja actual</p>
                <p className="text-xl font-black">{formatARS(fondoGlobal?.caja ?? 0)}</p>
                <p className="text-xs text-muted-foreground">
                  Se guardara un ingreso o egreso por la diferencia para que el fondo quede en el monto elegido.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Monto que debe aparecer</Label>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={adjustTarget}
                  onChange={(e) => setAdjustTarget(e.target.value)}
                  placeholder="Ej: 24800"
                />
              </div>

              <div className="space-y-2">
                <Label>Motivo</Label>
                <Input
                  value={adjustMotivo}
                  onChange={(e) => setAdjustMotivo(e.target.value)}
                  placeholder="Ej: Ajuste por error de caja"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setAdjustOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => adjustCash.mutate()} disabled={adjustCash.isPending}>
                Guardar ajuste
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Fondo;
