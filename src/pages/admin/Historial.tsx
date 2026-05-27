import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface AuditLog {
  id: string;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  detalle: Record<string, unknown> | null;
  admin_email: string;
  created_at: string;
}

const ACCION_LABELS: Record<string, string> = {
  partido_creado: "Partido creado",
  partido_editado: "Partido editado",
  partido_estado_cambiado: "Estado de partido",
  partido_eliminado: "Partido eliminado",
  jugador_creado: "Jugador creado",
  jugador_editado: "Jugador editado",
  jugador_desactivado: "Jugador dado de baja",
  voto_eliminado: "Voto anulado",
  votos_votante_eliminados: "Votos de votante anulados",
  votacion_reseteada: "Votación reseteada",
  votacion_cerrada: "Votación cerrada",
  multa_creada: "Multa creada",
  multa_eliminada: "Multa eliminada",
  multa_pago_actualizado: "Pago de multa",
  aporte_pago_actualizado: "Pago de aporte",
  bonus_creado: "Bonus creado",
  bonus_eliminado: "Bonus eliminado",
  victoria_historica_creada: "Victoria histórica",
  victoria_historica_eliminada: "Victoria histórica eliminada",
};

const ACCION_COLORS: Record<string, string> = {
  partido_creado: "bg-primary/15 text-primary border-primary/30",
  partido_editado: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  partido_estado_cambiado: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  partido_eliminado: "bg-destructive/15 text-destructive border-destructive/30",
  jugador_creado: "bg-primary/15 text-primary border-primary/30",
  jugador_editado: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  jugador_desactivado: "bg-destructive/15 text-destructive border-destructive/30",
  voto_eliminado: "bg-destructive/15 text-destructive border-destructive/30",
  votos_votante_eliminados: "bg-destructive/15 text-destructive border-destructive/30",
  votacion_reseteada: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  votacion_cerrada: "bg-mvp/15 text-mvp border-mvp/30",
  multa_creada: "bg-destructive/15 text-destructive border-destructive/30",
  multa_eliminada: "bg-muted/30 text-muted-foreground border-border/30",
  multa_pago_actualizado: "bg-mvp/15 text-mvp border-mvp/30",
  aporte_pago_actualizado: "bg-mvp/15 text-mvp border-mvp/30",
  bonus_creado: "bg-mvp/15 text-mvp border-mvp/30",
  bonus_eliminado: "bg-destructive/15 text-destructive border-destructive/30",
  victoria_historica_creada: "bg-primary/15 text-primary border-primary/30",
  victoria_historica_eliminada: "bg-destructive/15 text-destructive border-destructive/30",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const DetalleView = ({ detalle }: { detalle: Record<string, unknown> | null }) => {
  if (!detalle || Object.keys(detalle).length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {Object.entries(detalle).map(([k, v]) => {
        if (v === null || v === undefined) return null;
        const label = String(v);
        if (!label) return null;
        return (
          <span key={k} className="text-[10px] text-muted-foreground bg-secondary/40 rounded px-1.5 py-0.5">
            {k}: <span className="text-foreground/70">{label}</span>
          </span>
        );
      })}
    </div>
  );
};

const Historial = () => {
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit_logs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as AuditLog[];
    },
  });

  const filtered = search.trim()
    ? logs.filter((l) => {
        const q = search.toLowerCase();
        return (
          l.accion.includes(q) ||
          l.entidad.includes(q) ||
          l.admin_email.toLowerCase().includes(q) ||
          (ACCION_LABELS[l.accion] ?? "").toLowerCase().includes(q) ||
          JSON.stringify(l.detalle ?? {}).toLowerCase().includes(q)
        );
      })
    : logs;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      <header className="rounded-2xl border border-primary/30 bg-gradient-to-br from-card/80 to-secondary/20 p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h1 className="text-2xl md:text-3xl font-black">Historial de admin</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Registro de todas las acciones realizadas por administradores.
        </p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por acción, entidad, admin..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Cargando historial...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={search ? "Sin resultados" : "Sin movimientos registrados"}
          description={search ? "Probá con otro término de búsqueda." : "Las acciones de admin aparecerán acá."}
        />
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card/20 overflow-hidden divide-y divide-border/30">
          {filtered.map((log) => (
            <div key={log.id} className="flex gap-3 p-3 hover:bg-secondary/20 transition-colors">
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ACCION_COLORS[log.accion] ?? "bg-secondary/40 text-foreground/70 border-border/30"}`}
                  >
                    {ACCION_LABELS[log.accion] ?? log.accion}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{log.entidad}</span>
                  {log.entidad_id && (
                    <span className="text-[10px] text-muted-foreground/60 font-mono truncate max-w-[120px]">
                      {log.entidad_id}
                    </span>
                  )}
                </div>
                <DetalleView detalle={log.detalle} />
              </div>
              <div className="shrink-0 text-right space-y-0.5">
                <p className="text-[11px] text-muted-foreground">{fmtDate(log.created_at)}</p>
                <p className="text-[10px] text-muted-foreground/60 truncate max-w-[140px]">{log.admin_email}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <p className="text-center text-xs text-muted-foreground/50">
          {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
          {search ? " encontrados" : ""}
        </p>
      )}
    </div>
  );
};

export default Historial;
