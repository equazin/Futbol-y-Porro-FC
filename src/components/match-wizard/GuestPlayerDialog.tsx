import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateGuestPlayer } from "@/hooks/usePlayers";
import type { Player } from "@/hooks/usePlayers";

interface GuestPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (player: Player) => void;
}

const EMPTY = { nombre: "", apodo: "", posicion: "" };

export const GuestPlayerDialog = ({ open, onOpenChange, onCreated }: GuestPlayerDialogProps) => {
  const createGuest = useCreateGuestPlayer();
  const [form, setForm] = useState(EMPTY);

  const onSave = async () => {
    const nombre = form.nombre.trim();
    if (nombre.length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres");
      return;
    }
    try {
      const player = await createGuest.mutateAsync({
        nombre,
        apodo: form.apodo.trim() || null,
        posicion: (form.posicion || null) as Player["posicion"],
      });
      toast.success(`${player.apodo ?? player.nombre} agregado como invitado`);
      setForm(EMPTY);
      onCreated(player);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al crear invitado");
    }
  };

  const onClose = () => {
    setForm(EMPTY);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Agregar jugador invitado
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-1">
          El invitado puede jugar el partido pero no aporta al fondo ni afecta el ranking.
        </p>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              placeholder="Ej: Amigo de Facu"
              value={form.nombre}
              maxLength={60}
              autoFocus
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Apodo (opcional)</Label>
            <Input
              placeholder="Ej: El Flaco"
              value={form.apodo}
              maxLength={30}
              onChange={(e) => setForm({ ...form, apodo: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Posicion (opcional)</Label>
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
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSave} disabled={createGuest.isPending}>
            Agregar invitado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
