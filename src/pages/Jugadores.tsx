import { useState, useMemo } from "react";
import { ArrowUpCircle, Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { PhotoUploader } from "@/components/players/PhotoUploader";
import { EmptyState } from "@/components/ui/empty-state";
import { usePlayers, useCreatePlayer, useUpdatePlayer, useDeletePlayer, type Player } from "@/hooks/usePlayers";
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

type TipoFilter = "titulares" | "invitados" | "todos";

const Jugadores = ({ readOnly = false }: { readOnly?: boolean }) => {
  const { data: players = [], isLoading } = usePlayers({ onlyActive: true, tipo: "all" });
  const { data: ranking = [] } = useRanking();
  const createMut = useCreatePlayer();
  const updateMut = useUpdatePlayer();
  const deleteMut = useDeletePlayer();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Player | null>(null);
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("titulares");

  const [form, setForm] = useState({
    nombre: "",
    apodo: "",
    posicion: "" as string,
    foto_url: null as string | null,
  });

  const statsByPlayer = useMemo(() => {
    const m = new Map<string, (typeof ranking)[number]>();
    ranking.forEach((r) => m.set(r.player_id, r));
    return m;
  }, [ranking]);

  const filteredPlayers = useMemo(() => {
    if (tipoFilter === "titulares") return players.filter((p) => p.tipo !== "invitado");
    if (tipoFilter === "invitados") return players.filter((p) => p.tipo === "invitado");
    return players;
  }, [players, tipoFilter]);

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

  const onPromote = async (p: Player) => {
    try {
      await updateMut.mutateAsync({ id: p.id, tipo: "titular" });
      toast.success(`${p.apodo ?? p.nombre} promovido al plantel`);
    } catch (e: any) {
      toast.error(e.message ?? "Error al promover");
    }
  };

  const titularesCount = players.filter((p) => p.tipo !== "invitado").length;
  const invitadosCount = players.filter((p) => p.tipo === "invitado").length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black">Jugadores</h1>
          <p className="text-sm text-muted-foreground">{titularesCount} en plantel · {invitadosCount} invitados</p>
        </div>
        {!readOnly && (
          <Button onClick={openNew} className="shadow-glow">
            <Plus className="h-4 w-4 mr-1" /> Nuevo
          </Button>
        )}
      </header>

      <Tabs value={tipoFilter} onValueChange={(v) => setTipoFilter(v as TipoFilter)}>
        <TabsList className="w-full">
          <TabsTrigger value="titulares" className="flex-1">Titulares ({titularesCount})</TabsTrigger>
          <TabsTrigger value="invitados" className="flex-1">Invitados ({invitadosCount})</TabsTrigger>
          <TabsTrigger value="todos" className="flex-1">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : filteredPlayers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={tipoFilter === "invitados" ? "Sin invitados" : "Sin jugadores todavia"}
          description={
            tipoFilter === "invitados"
              ? "Los invitados se agregan desde el wizard al crear un partido."
              : readOnly
              ? "Todavía no hay jugadores en el plantel."
              : "Agregá los integrantes del grupo para empezar."
          }
          action={readOnly || tipoFilter === "invitados" ? undefined : { label: "Agregar primer jugador", onClick: openNew }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredPlayers.map((p) => {
            const isGuest = p.tipo === "invitado";
            const stats = !isGuest ? statsByPlayer.get(p.id) : undefined;
            const achievements = stats ? getAchievements(stats) : [];
            return (
              <div
                key={p.id}
                className={`group relative rounded-xl border bg-gradient-card p-4 transition-smooth hover:shadow-glow ${
                  isGuest
                    ? "border-amber-500/30 hover:border-amber-500/50"
                    : "border-border/60 hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <PlayerAvatar nombre={p.nombre} foto_url={p.foto_url} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-black truncate">{p.apodo ?? p.nombre}</p>
                      {isGuest && (
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-500">
                          Invitado
                        </span>
                      )}
                    </div>
                    {p.apodo && <p className="text-xs text-muted-foreground truncate">{p.nombre}</p>}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {p.posicion && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${positionColors[p.posicion]}`}>
                          {positionLabels[p.posicion]}
                        </span>
                      )}
                      {!isGuest && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-border bg-secondary text-muted-foreground">
                          ELO {Math.round(Number((p as any).elo ?? 1000))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!isGuest && achievements.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {achievements.slice(0, 4).map((a) => {
                      const Icon = a.icon;
                      return (
                        <div
                          key={a.id}
                          title={a.description}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${a.bg} ${a.color}`}
                        >
                          <Icon className="h-3 w-3" />
                          {a.label}
                        </div>
                      );
                    })}
                    {achievements.length > 4 && (
                      <span className="text-[10px] text-muted-foreground self-center">
                        +{achievements.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {!readOnly && (
                  <div className="flex gap-1 mt-3 pt-3 border-t border-border/40">
                    {isGuest && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-amber-500 hover:text-amber-500 hover:bg-amber-500/10"
                        onClick={() => onPromote(p)}
                        disabled={updateMut.isPending}
                      >
                        <ArrowUpCircle className="h-3 w-3 mr-1" /> Promover
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className={isGuest ? "" : "flex-1"} onClick={() => openEdit(p)}>
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {!readOnly && (
        <>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar jugador" : "Nuevo jugador"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <PhotoUploader
                  nombre={form.apodo || form.nombre}
                  currentUrl={form.foto_url}
                  onChange={(url) => setForm({ ...form, foto_url: url })}
                />
                <div className="space-y-2">
                  <Label>Nombre completo *</Label>
                  <Input
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Juan Perez"
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
                  <Label>Posicion</Label>
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

          <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Dar de baja a {confirmDelete?.apodo ?? confirmDelete?.nombre}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se ocultara del plantel pero se mantendran sus estadisticas historicas.
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
        </>
      )}
    </div>
  );
};

export default Jugadores;
