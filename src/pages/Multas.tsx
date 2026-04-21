import { useMemo, useState } from "react";
import { Plus, Receipt, Trash2, AlertTriangle } from "lucide-react";
import { fmtFechaCorta } from "@/lib/dates";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { usePlayers } from "@/hooks/usePlayers";
import { useFines, useCreateFine, useToggleFinePaid, useDeleteFine } from "@/hooks/useFines";
import { useFinePresets } from "@/hooks/useFinePresets";
import { formatARS } from "@/lib/scoring";

const Multas = ({ readOnly = false }: { readOnly?: boolean }) => {
  const { data: players = [] } = usePlayers();
  const { data: fines = [], isLoading } = useFines();
  const { data: presets = [] } = useFinePresets();
  const createMut = useCreateFine();
  const toggleMut = useToggleFinePaid();
  const deleteMut = useDeleteFine();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    player_id: "",
    motivo: "",
    monto: 500,
  });

  const totals = useMemo(() => {
    const total = fines.reduce((s, f) => s + Number(f.monto), 0);
    const cobradas = fines.filter((f) => f.pagada).reduce((s, f) => s + Number(f.monto), 0);
    return { total, cobradas, pendientes: total - cobradas, count: fines.length };
  }, [fines]);

  const onCreate = async () => {
    if (!form.player_id) {
      toast.error("Elegi un jugador");
      return;
    }
    if (!form.motivo.trim()) {
      toast.error("Indica un motivo");
      return;
    }
    try {
      await createMut.mutateAsync({
        player_id: form.player_id,
        motivo: form.motivo.trim().slice(0, 200),
        monto: Math.max(0, form.monto),
      });
      toast.success("Multa registrada");
      setOpen(false);
      setForm({ player_id: "", motivo: "", monto: presets[0]?.monto_default ?? 500 });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
            <Receipt className="h-6 w-6 text-destructive" />
            Multas
          </h1>
          <p className="text-sm text-muted-foreground">
            Faltas, tardanzas y otras sanciones que suman al fondo
          </p>
        </div>
        {!readOnly && (
          <Button
            onClick={() => {
              setForm({ player_id: "", motivo: presets[0]?.motivo ?? "", monto: presets[0]?.monto_default ?? 500 });
              setOpen(true);
            }}
            className="shadow-glow"
          >
            <Plus className="h-4 w-4 mr-1" /> Nueva
          </Button>
        )}
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/60 bg-gradient-card p-3">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Total emitido</p>
          <p className="font-black text-lg mt-1">{formatARS(totals.total)}</p>
        </div>
        <div className="rounded-xl border border-mvp/30 bg-gradient-card p-3">
          <p className="text-[10px] uppercase font-bold text-mvp">Cobradas</p>
          <p className="font-black text-lg mt-1">{formatARS(totals.cobradas)}</p>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-gradient-card p-3">
          <p className="text-[10px] uppercase font-bold text-destructive">Pendientes</p>
          <p className="font-black text-lg mt-1">{formatARS(totals.pendientes)}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : fines.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin multas registradas"
          description={readOnly ? "No hay multas registradas." : "Cuando alguien falte sin avisar, llegue tarde o se olvide algo, registrá la multa acá."}
          action={readOnly ? undefined : { label: "Registrar primera multa", onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="rounded-2xl border border-border/60 bg-gradient-card overflow-hidden divide-y divide-border/30">
          {fines.map((f) => (
            <div key={f.id} className="flex items-center gap-3 p-3 hover:bg-secondary/30 transition-smooth">
              <Checkbox
                checked={f.pagada}
                disabled={readOnly}
                onCheckedChange={(v) => !readOnly && toggleMut.mutate({ id: f.id, pagada: !!v })}
              />
              <PlayerAvatar nombre={f.player?.nombre ?? "?"} foto_url={f.player?.foto_url ?? null} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">
                  {f.player?.apodo ?? f.player?.nombre ?? "Jugador eliminado"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {f.motivo} · {fmtFechaCorta(f.fecha)}
                </p>
              </div>
              <span className={`font-black text-sm ${f.pagada ? "text-mvp" : "text-destructive"}`}>
                {formatARS(Number(f.monto))}
              </span>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 h-8 w-8"
                  onClick={() => deleteMut.mutate(f.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" /> Nueva multa
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Jugador *</Label>
                <Select value={form.player_id} onValueChange={(v) => setForm({ ...form, player_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Elegi jugador" /></SelectTrigger>
                  <SelectContent>
                    {players.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.apodo ?? p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select
                  value={form.motivo}
                  onValueChange={(v) => {
                    const preset = presets.find((p) => p.motivo === v);
                    setForm({ ...form, motivo: v, monto: preset?.monto_default ?? form.monto });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccioná un motivo" /></SelectTrigger>
                  <SelectContent>
                    {presets.map((p) => (
                      <SelectItem key={p.id} value={p.motivo}>
                        {p.motivo} ({formatARS(p.monto_default)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monto</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: Math.max(0, Number(e.target.value) || 0) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={onCreate} disabled={createMut.isPending}>Registrar multa</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Multas;
