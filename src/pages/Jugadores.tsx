import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { PhotoUploader } from "@/components/players/PhotoUploader";
import { EmptyState } from "@/components/ui/empty-state";
import {
  usePlayers, useCreatePlayer, useUpdatePlayer, useDeletePlayer, type Player,
} from "@/hooks/usePlayers";
import { useRanking } from "@/hooks/useRanking";
import { getAchievements } from "@/lib/achievements";

const playerSchema = z.object({
  nombre: z.string().trim().min(2, "Nombre muy corto").max(60),
  apodo: z.string().trim().max(30).optional().or(z.literal("")),
  posicion: z.enum(["arquero", "defensor", "mediocampista", "delantero"]).optional().nullable(),
});

const positionLabels: Record<string, string> = {
  arquero: "Arquero",
  defensor: "Defensor",
  mediocampista: "Mediocampista",
  delantero: "Delantero",
};

const positionColors: Record<string, string> = {
  arquero: "bg-mvp/15 text-mvp border-mvp/30",
  defensor: "bg-stats/15 text-stats border-stats/30",
  mediocampista: "bg-primary/15 text-primary border-primary/30",
  delantero: "bg-destructive/15 text-destructive border-destructive/30",
};

const Jugadores = () => {
  const { data: players = [], isLoading } = usePlayers();
  const { data: ranking = [] } = useRanking();
  const createMut = useCreatePlayer();
  const updateMut = useUpdatePlayer();
  const deleteMut = useDeletePlayer();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Player | null>(null);

  const [form, setForm] = useState({
    nombre: "",
    apodo: "",
    posicion: "" as string,
    foto_url: null as string | null,
  });

  const statsByPlayer = useMemo(() => {
    const m = new Map<string, typeof ranking[number]>();
    ranking.forEach((r) => m.set(r.player_id, r));
    return m;
  }, [ranking]);

  const openNew = () => {
    setEditing(null);
    setForm({ nombre: "", apodo: "", posicion: "", foto_url: null });
    setOpen(true);
  };

  const openEdit = (p: Player) => {
    setEditing(p);
    setForm({
      nombre: p.nombre,
      apodo: p.apodo ?? "",
      posicion: p.posicion ?? "",
      foto_url: p.foto_url ?? null,
    });
    setOpen(true);
  };

  const onSubmit = async () => {
    const parsed = playerSchema.safeParse({
      nombre: form.nombre,
      apodo: form.apodo,
      posicion: form.posicion ? form.posicion : null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const payload = {
      nombre: parsed.data.nombre,
      apodo: parsed.data.apodo || null,
      posicion: (parsed.data.posicion ?? null) as Player["posicion"],
      foto_url: form.foto_url,
    };
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...payload });
        toast.success("Jugador actualizado");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Jugador creado");
      }
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Error al guardar");
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMut.mutateAsync(confirmDelete.id);
      toast.success("Jugador dado de baja");
      setConfirmDelete(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black">Jugadores</h1>
          <p className="text-sm text-muted-foreground">{players.length} en plantel</p>
        </div>
        <Button onClick={openNew} className="shadow-glow">
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
      </header>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Cargando…</p>
      ) : players.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin jugadores todavía"
          description="Empezá agregando los integrantes del grupo."
          action={{ label: "Agregar primer jugador", onClick: openNew }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {players.map((p) => (
            <div
              key={p.id}
              className="group relative rounded-xl border border-border/60 bg-gradient-card p-4 transition-smooth hover:border-primary/40 hover:shadow-glow"
            >
              <div className="flex items-center gap-3">
                <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-black truncate">{p.apodo ?? p.nombre}</p>
                  {p.apodo && <p className="text-xs text-muted-foreground truncate">{p.nombre}</p>}
                  {p.posicion && (
                    <span className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${positionColors[p.posicion]}`}>
                      {positionLabels[p.posicion]}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 mt-3 pt-3 border-t border-border/40">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => openEdit(p)}>
                  <Pencil className="h-3 w-3 mr-1" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDelete(p)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar jugador" : "Nuevo jugador"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre completo *</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Juan Pérez"
                maxLength={60}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Apodo</Label>
              <Input
                value={form.apodo}
                onChange={(e) => setForm({ ...form, apodo: e.target.value })}
                placeholder="El Pibe"
                maxLength={30}
              />
            </div>
            <div className="space-y-2">
              <Label>Posición</Label>
              <Select value={form.posicion} onValueChange={(v) => setForm({ ...form, posicion: v })}>
                <SelectTrigger><SelectValue placeholder="Sin definir" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="arquero">Arquero</SelectItem>
                  <SelectItem value="defensor">Defensor</SelectItem>
                  <SelectItem value="mediocampista">Mediocampista</SelectItem>
                  <SelectItem value="delantero">Delantero</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={onSubmit} disabled={createMut.isPending || updateMut.isPending}>
              {editing ? "Guardar cambios" : "Crear jugador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Dar de baja a {confirmDelete?.apodo ?? confirmDelete?.nombre}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se ocultará del plantel pero se mantendrán sus estadísticas históricas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
              Dar de baja
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Jugadores;
