import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Calendar, ChevronRight, Trash2, Trophy, MapPin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useMatches, useCreateMatch, useDeleteMatch, type Match } from "@/hooks/useMatches";

const estadoStyles: Record<string, string> = {
  pendiente: "bg-stats/15 text-stats border-stats/30",
  jugado: "bg-primary/15 text-primary border-primary/30",
  cerrado: "bg-mvp/15 text-mvp border-mvp/30",
};

const SEDES = ["Cancha Norte", "Cancha Sur", "Polideportivo", "Club Barrio", "Otra"] as const;

const Partidos = ({ basePath = "/admin/partidos", readOnly = false }: { basePath?: string; readOnly?: boolean }) => {
  const { data: matches = [], isLoading } = useMatches();
  const createMut = useCreateMatch();
  const deleteMut = useDeleteMatch();

  const [open, setOpen] = useState(false);
  const [fecha, setFecha] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    d.setHours(11, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [sedePreset, setSedePreset] = useState<(typeof SEDES)[number]>("Cancha Norte");
  const [sedeCustom, setSedeCustom] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Match | null>(null);

  const onCreate = async () => {
    const sede = sedePreset === "Otra" ? sedeCustom.trim() : sedePreset;
    if (!sede) {
      toast.error("Selecciona una sede");
      return;
    }

    try {
      await createMut.mutateAsync({
        fecha: new Date(fecha).toISOString(),
        notas: sede,
      });
      toast.success("Partido creado");
      setOpen(false);
      setSedePreset("Cancha Norte");
      setSedeCustom("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

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
          <Button onClick={() => setOpen(true)} className="shadow-glow">
            <Plus className="h-4 w-4 mr-1" /> Nuevo
          </Button>
        )}
      </header>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : matches.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Sin partidos cargados"
          description={readOnly ? "Aun no hay historial cargado." : "Crea el primer partido del domingo."}
          action={readOnly ? undefined : { label: "Crear partido", onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const mvp = (m as any).mvp;
            const sede = (m.notas ?? "").trim();
            return (
              <Link
                key={m.id}
                to={`${basePath}/${m.id}`}
                className="group block rounded-2xl border border-border/60 bg-gradient-card p-4 transition-smooth hover:border-primary/40 hover:shadow-glow"
              >
                <div className="flex items-center gap-4">
                  <div className="text-center px-3 py-2 rounded-xl bg-secondary/60 min-w-[68px]">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">{format(new Date(m.fecha), "MMM", { locale: es })}</p>
                    <p className="text-2xl font-black leading-none">{format(new Date(m.fecha), "d")}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">{format(new Date(m.fecha), "HH:mm")}</p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${estadoStyles[m.estado]}`}>{m.estado}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(m.fecha), "EEEE", { locale: es })}</span>
                    </div>

                    {sede && (
                      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {sede}
                      </p>
                    )}

                    {m.estado !== "pendiente" ? (
                      <div className="flex items-center gap-3">
                        <span className="font-black text-2xl">{m.equipo_a_score}</span>
                        <span className="text-muted-foreground text-sm">vs</span>
                        <span className="font-black text-2xl">{m.equipo_b_score}</span>
                        {mvp && (
                          <div className="flex items-center gap-1 ml-auto pl-3 border-l border-border">
                            <Trophy className="h-3 w-3 text-mvp" />
                            <PlayerAvatar nombre={mvp.nombre} foto_url={mvp.foto_url} size="sm" />
                            <span className="text-xs font-bold truncate max-w-[80px]">{mvp.apodo ?? mvp.nombre}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{readOnly ? "Por jugarse" : "Por jugarse - carga los planteles"}</p>
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo partido</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Fecha y hora</Label>
                <Input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Sede</Label>
                <Select value={sedePreset} onValueChange={(v) => setSedePreset(v as (typeof SEDES)[number])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEDES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {sedePreset === "Otra" && (
                <div className="space-y-2">
                  <Label>Nombre de la sede</Label>
                  <Input value={sedeCustom} onChange={(e) => setSedeCustom(e.target.value)} placeholder="Ej: Complejo Don Bosco" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={onCreate} disabled={createMut.isPending}>
                Crear partido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {!readOnly && (
        <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar este partido?</AlertDialogTitle>
              <AlertDialogDescription>Se borraran tambien los planteles, votos y aportes asociados. Esta accion no se puede deshacer.</AlertDialogDescription>
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
