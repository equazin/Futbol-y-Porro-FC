import { useState } from "react";
import { GripVertical, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS } from "@/lib/scoring";
import {
  useFinePresets,
  useCreateFinePreset,
  useUpdateFinePreset,
  useDeleteFinePreset,
  type FinePreset,
} from "@/hooks/useFinePresets";

interface FormState {
  motivo: string;
  monto_default: number;
}

const EMPTY_FORM: FormState = { motivo: "", monto_default: 500 };

const FinePresets = () => {
  const { data: presets = [], isLoading } = useFinePresets();
  const createMut = useCreateFinePreset();
  const updateMut = useUpdateFinePreset();
  const deleteMut = useDeleteFinePreset();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinePreset | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (preset: FinePreset) => {
    setEditing(preset);
    setForm({ motivo: preset.motivo, monto_default: preset.monto_default });
    setOpen(true);
  };

  const onSave = async () => {
    if (!form.motivo.trim()) {
      toast.error("Indicá un motivo");
      return;
    }
    if (form.monto_default < 0) {
      toast.error("El monto no puede ser negativo");
      return;
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          motivo: form.motivo.trim().slice(0, 100),
          monto_default: form.monto_default,
        });
        toast.success("Preset actualizado");
      } else {
        await createMut.mutateAsync({
          motivo: form.motivo.trim().slice(0, 100),
          monto_default: form.monto_default,
          orden: presets.length + 1,
        });
        toast.success("Preset creado");
      }
      setOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const onDelete = (preset: FinePreset) => {
    deleteMut.mutate(preset.id, {
      onSuccess: () => toast.success(`"${preset.motivo}" eliminado`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Error al eliminar"),
    });
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-primary/30 bg-gradient-card p-5 shadow-card">
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
          <Receipt className="h-6 w-6 text-destructive" />
          Presets de multas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Motivos y montos predeterminados que aparecen al registrar una multa.
        </p>
      </header>

      <div className="flex justify-end">
        <Button onClick={openCreate} className="shadow-glow">
          <Plus className="h-4 w-4 mr-1" /> Nuevo preset
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : presets.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin presets configurados"
          description="Creá los motivos y montos que van a aparecer al registrar una multa."
          action={{ label: "Crear primer preset", onClick: openCreate }}
        />
      ) : (
        <div className="rounded-2xl border border-border/60 bg-gradient-card overflow-hidden divide-y divide-border/30">
          {presets.map((preset, idx) => (
            <div key={preset.id} className="flex items-center gap-3 p-3 hover:bg-secondary/30 transition-smooth">
              <span className="text-muted-foreground/40 shrink-0">
                <GripVertical className="h-4 w-4" />
              </span>
              <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{preset.motivo}</p>
              </div>
              <span className="font-black text-sm text-destructive shrink-0">{formatARS(preset.monto_default)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => openEdit(preset)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0"
                onClick={() => onDelete(preset)}
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
              <Receipt className="h-5 w-5 text-destructive" />
              {editing ? "Editar preset" : "Nuevo preset"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Input
                placeholder="Ej: Ausencia sin avisar"
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Monto por defecto</Label>
              <Input
                type="number"
                min={0}
                value={form.monto_default}
                onChange={(e) =>
                  setForm({ ...form, monto_default: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onSave} disabled={isPending}>
              {editing ? "Guardar cambios" : "Crear preset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinePresets;
