import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Calendar, ChevronRight, Trash2, Trophy, MapPin } from "lucide-react";
import { fmtMes, fmtDia, fmtHora, fmtDiaSemana } from "@/lib/dates";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { useMatches, useDeleteMatch, type Match } from "@/hooks/useMatches";

const estadoStyles: Record<string, string> = {
  pendiente: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  jugado: "bg-primary/15 text-primary border-primary/30",
  cerrado: "bg-mvp/15 text-mvp border-mvp/30",
};

const estadoLabels: Record<string, string> = {
  pendiente: "Por jugarse",
  jugado: "Jugado",
  cerrado: "Cerrado",
};

const Partidos = ({
  basePath = "/admin/partidos",
  detailSuffix = "",
  readOnly = false,
}: {
  basePath?: string;
  detailSuffix?: string;
  readOnly?: boolean;
}) => {
  const navigate = useNavigate();
  const { data: matches = [], isLoading } = useMatches();
  const deleteMut = useDeleteMatch();
  const [confirmDelete, setConfirmDelete] = useState<Match | null>(null);

  const createPath = basePath.startsWith("/admin") ? "/admin/partidos/nuevo" : `${basePath}/nuevo`;

  const onDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMut.mutateAsync(confirmDelete.id);
      toast.success("Partido eliminado");
      setConfirmDelete(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black">Partidos</h1>
          <p className="text-sm text-muted-foreground">{matches.length} en historia</p>
        </div>
        {!readOnly && (
          <Button asChild className="shadow-glow">
            <Link to={createPath}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo
            </Link>
          </Button>
        )}
      </header>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : matches.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Sin partidos cargados"
          description={readOnly ? "Todavía no hay partidos cargados." : "Creá el primer partido y armá los equipos."}
          action={readOnly ? undefined : { label: "Crear partido", onClick: () => navigate(createPath) }}
        />
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const mvp = (m as any).mvp as { nombre: string; apodo: string | null; foto_url: string | null } | null;
            const notas = (m.notas ?? "").trim();
            // Para partidos históricos el MVP está en notas como "Fecha N · MVP: Nombre"
            const mvpNotasMatch = notas.match(/MVP:\s*(.+)$/i);
            const mvpNombre = mvp ? (mvp.apodo ?? mvp.nombre) : (mvpNotasMatch ? mvpNotasMatch[1].trim() : null);
            const sede = mvpNotasMatch ? notas.replace(/·?\s*MVP:.*$/i, "").trim() : notas;

            return (
              <Link
                key={m.id}
                to={`${basePath}/${m.id}${detailSuffix}`}
                className="group block rounded-2xl border border-border/60 bg-gradient-card p-4 transition-smooth hover:border-primary/40 hover:shadow-glow"
              >
                <div className="flex items-center gap-4">
                  <div className="text-center px-3 py-2 rounded-xl bg-secondary/60 min-w-[68px]">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">{fmtMes(m.fecha)}</p>
                    <p className="text-2xl font-black leading-none">{fmtDia(m.fecha)}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">{fmtHora(m.fecha)}</p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${estadoStyles[m.estado]}`}>{estadoLabels[m.estado] ?? m.estado}</span>
                      <span className="text-xs text-muted-foreground">{fmtDiaSemana(m.fecha)}</span>
                    </div>

                    {sede && (
                      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {sede}
                      </p>
                    )}

                    {m.estado !== "pendiente" ? (
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-2xl">{m.equipo_a_score}</span>
                          <span className="text-muted-foreground text-sm">vs</span>
                          <span className="font-black text-2xl">{m.equipo_b_score}</span>
                        </div>
                        {mvpNombre && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-mvp/10 border border-mvp/30">
                            <Trophy className="h-3.5 w-3.5 text-mvp shrink-0" />
                            {mvp && (
                              <PlayerAvatar nombre={mvp.nombre} foto_url={mvp.foto_url} size="sm" />
                            )}
                            <span className="text-sm font-black text-mvp">{mvpNombre}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {readOnly ? "Por jugarse" : "Por jugarse - carga stats al terminar"}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-smooth text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setConfirmDelete(m);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!readOnly && (
        <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar este partido?</AlertDialogTitle>
              <AlertDialogDescription>
                Se borraran tambien los planteles, votos y aportes asociados. Esta accion no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default Partidos;
