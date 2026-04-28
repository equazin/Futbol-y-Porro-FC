import { useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useCreateVenue,
  useDeleteVenue,
  useUpdateVenue,
  useVenues,
  type Venue,
} from "@/hooks/useVenues";

interface FormState {
  nombre: string;
  direccion: string;
  activo: boolean;
  orden: number;
}

const EMPTY_FORM: FormState = {
  nombre: "",
  direccion: "",
  activo: true,
  orden: 1,
};

const Venues = () => {
  const { data: venues = [], isLoading } = useVenues(false);
  const createMut = useCreateVenue();
  const updateMut = useUpdateVenue();
  const deleteMut = useDeleteVenue();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Venue | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, orden: venues.length + 1 });
    setOpen(true);
  };

  const openEdit = (venue: Venue) => {
    setEditing(venue);
    setForm({
      nombre: venue.nombre,
      direccion: venue.direccion ?? "",
      activo: venue.activo,
      orden: venue.orden,
    });
    setOpen(true);
  };

  const onSave = async () => {
    const nombre = form.nombre.trim();
    if (!nombre) {
      toast.error("Indicá el nombre de la cancha");
      return;
    }

    const payload = {
      nombre: nombre.slice(0, 80),
      direccion: form.direccion.trim() ? form.direccion.trim().slice(0, 160) : null,
      activo: form.activo,
      orden: Math.max(1, Number(form.orden) || 1),
    };

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...payload });
        toast.success("Cancha actualizada");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Cancha creada");
      }
      setOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const onDelete = (venue: Venue) => {
    deleteMut.mutate(venue.id, {
      onSuccess: () => toast.success(`"${venue.nombre}" eliminada`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Error al eliminar"),
    });
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-primary/30 bg-gradient-card p-5 shadow-card">
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />
          Canchas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estas sedes aparecen en el wizard al crear un partido.
        </p>
      </header>

      <div className="flex justify-end">
        <Button onClick={openCreate} className="shadow-glow">
          <Plus className="h-4 w-4 mr-1" /> Nueva cancha
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : venues.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Sin canchas configuradas"
          description="Cargá las sedes donde juegan para usarlas al crear partidos."
          action={{ label: "Crear primera cancha", onClick: openCreate }}
        />
      ) : (
        <div className="rounded-2xl border border-border/60 bg-gradient-card overflow-hidden divide-y divide-border/30">
          {venues.map((venue) => (
            <div key={venue.id} className="flex items-center gap-3 p-3 hover:bg-secondary/30 transition-smooth">
              <div className={`h-10 w-10 rounded-xl grid place-items-center ${venue.activo ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                <MapPin className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{venue.nombre}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {venue.direccion || "Sin dirección"} · Orden {venue.orden} · {venue.activo ? "Activa" : "Inactiva"}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openEdit(venue)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0"
                onClick={() => onDelete(venue)}
                disabled={deleteMut.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {editing ? "Editar cancha" : "Nueva cancha"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                placeholder="Ej: Complejo Don Bosco"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input
                placeholder="Opcional"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Orden</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.orden}
                  onChange={(e) => setForm({ ...form, orden: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Activa</Label>
                <div className="h-10 flex items-center">
                  <Switch checked={form.activo} onCheckedChange={(checked) => setForm({ ...form, activo: checked })} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onSave} disabled={isPending}>
              {editing ? "Guardar cambios" : "Crear cancha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Venues;

