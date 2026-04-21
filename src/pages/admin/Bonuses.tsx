import { useState } from "react";
import { Plus, Star, Trash2, Trophy } from "lucide-react";
import { fmtFechaCorta } from "@/lib/dates";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { usePlayers } from "@/hooks/usePlayers";
import {
  usePlayerBonuses,
  usePlayerPanelWins,
  useCreatePlayerBonus,
  useDeletePlayerBonus,
  useUpsertPanelWins,
  useDeletePanelWins,
} from "@/hooks/usePlayerBonuses";

const Bonuses = () => {
  const { data: players = [] } = usePlayers(false);
  const { data: bonuses = [], isLoading: loadingBonuses } = usePlayerBonuses();
  const { data: panelWins = [], isLoading: loadingWins } = usePlayerPanelWins();

  const createBonus = useCreatePlayerBonus();
  const deleteBonus = useDeletePlayerBonus();
  const upsertWins = useUpsertPanelWins();
  const deleteWins = useDeletePanelWins();

  const [bonusOpen, setBonusOpen] = useState(false);
  const [winsOpen, setWinsOpen] = useState(false);

  const [bonusForm, setBonusForm] = useState({ player_id: "", motivo: "", puntos: 0 });
  const [winsForm, setWinsForm] = useState({ player_id: "", wins_historicas: 0, motivo: "Victorias previas al sistema" });

  const onCreateBonus = async () => {
    if (!bonusForm.player_id) { toast.error("Elegí un jugador"); return; }
    if (!bonusForm.motivo.trim()) { toast.error("Indicá un motivo"); return; }
    if (bonusForm.puntos === 0) { toast.error("Los puntos no pueden ser 0"); return; }
    try {
      await createBonus.mutateAsync({
        player_id: bonusForm.player_id,
        motivo: bonusForm.motivo.trim(),
        puntos: bonusForm.puntos,
      });
      toast.success("Bonus registrado");
      setBonusOpen(false);
      setBonusForm({ player_id: "", motivo: "", puntos: 0 });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const onUpsertWins = async () => {
    if (!winsForm.player_id) { toast.error("Elegí un jugador"); return; }
    if (winsForm.wins_historicas < 0) { toast.error("Las victorias no pueden ser negativas"); return; }
    try {
      await upsertWins.mutateAsync({
        player_id: winsForm.player_id,
        wins_historicas: winsForm.wins_historicas,
        motivo: winsForm.motivo.trim() || "Victorias previas al sistema",
      });
      toast.success("Victorias históricas guardadas");
      setWinsOpen(false);
      setWinsForm({ player_id: "", wins_historicas: 0, motivo: "Victorias previas al sistema" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-primary/30 bg-gradient-card p-5 shadow-card">
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
          <Star className="h-6 w-6 text-mvp" />
          Bonuses y victorias históricas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Puntos extra y victorias previas al sistema que afectan el ranking.
        </p>
      </header>

      <Tabs defaultValue="bonuses">
        <TabsList className="w-full">
          <TabsTrigger value="bonuses" className="flex-1">Puntos bonus</TabsTrigger>
          <TabsTrigger value="wins" className="flex-1">Victorias históricas</TabsTrigger>
        </TabsList>

        <TabsContent value="bonuses" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setBonusOpen(true)} className="shadow-glow">
              <Plus className="h-4 w-4 mr-1" /> Agregar bonus
            </Button>
          </div>

          {loadingBonuses ? (
            <p className="text-muted-foreground text-sm">Cargando...</p>
          ) : bonuses.length === 0 ? (
            <EmptyState
              icon={Star}
              title="Sin bonuses registrados"
              description="Los bonuses son puntos extra que se suman al ranking por méritos especiales fuera del sistema."
              action={{ label: "Agregar primer bonus", onClick: () => setBonusOpen(true) }}
            />
          ) : (
            <div className="rounded-2xl border border-border/60 bg-gradient-card overflow-hidden divide-y divide-border/30">
              {bonuses.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-3 hover:bg-secondary/30 transition-smooth">
                  <PlayerAvatar nombre={b.player?.nombre ?? "?"} foto_url={b.player?.foto_url ?? null} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{b.player?.apodo ?? b.player?.nombre ?? "Jugador eliminado"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {b.motivo} · {fmtFechaCorta(b.fecha)}
                    </p>
                  </div>
                  <span className="font-black text-sm text-mvp">+{b.puntos} pts</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 h-8 w-8"
                    onClick={() => deleteBonus.mutate(b.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="wins" className="space-y-4 mt-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-muted-foreground max-w-sm">
              Victorias previas al sistema para jugadores con historial antes de que empezara el registro digital.
              Se suman a las victorias calculadas automáticamente.
            </p>
            <Button onClick={() => setWinsOpen(true)} className="shadow-glow shrink-0">
              <Plus className="h-4 w-4 mr-1" /> Asignar
            </Button>
          </div>

          {loadingWins ? (
            <p className="text-muted-foreground text-sm">Cargando...</p>
          ) : panelWins.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="Sin victorias históricas"
              description="Ningún jugador tiene victorias registradas fuera del sistema."
              action={{ label: "Asignar victorias históricas", onClick: () => setWinsOpen(true) }}
            />
          ) : (
            <div className="rounded-2xl border border-border/60 bg-gradient-card overflow-hidden divide-y divide-border/30">
              {panelWins.map((pw) => (
                <div key={pw.id} className="flex items-center gap-3 p-3 hover:bg-secondary/30 transition-smooth">
                  <PlayerAvatar nombre={pw.player?.nombre ?? "?"} foto_url={pw.player?.foto_url ?? null} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{pw.player?.apodo ?? pw.player?.nombre ?? "Jugador eliminado"}</p>
                    <p className="text-xs text-muted-foreground truncate">{pw.motivo}</p>
                  </div>
                  <span className="font-black text-sm text-primary">+{pw.wins_historicas} victorias</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 h-8 w-8"
                    onClick={() => deleteWins.mutate(pw.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: nuevo bonus */}
      <Dialog open={bonusOpen} onOpenChange={setBonusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-mvp" /> Nuevo bonus de puntos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Jugador *</Label>
              <Select value={bonusForm.player_id} onValueChange={(v) => setBonusForm({ ...bonusForm, player_id: v })}>
                <SelectTrigger><SelectValue placeholder="Elegí jugador" /></SelectTrigger>
                <SelectContent>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.apodo ?? p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Input
                placeholder="Ej: Premio temporada anterior"
                value={bonusForm.motivo}
                onChange={(e) => setBonusForm({ ...bonusForm, motivo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Puntos (puede ser negativo para penalizar)</Label>
              <Input
                type="number"
                value={bonusForm.puntos}
                onChange={(e) => setBonusForm({ ...bonusForm, puntos: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBonusOpen(false)}>Cancelar</Button>
            <Button onClick={onCreateBonus} disabled={createBonus.isPending}>Guardar bonus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: victorias históricas */}
      <Dialog open={winsOpen} onOpenChange={setWinsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" /> Victorias históricas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Jugador *</Label>
              <Select value={winsForm.player_id} onValueChange={(v) => setWinsForm({ ...winsForm, player_id: v })}>
                <SelectTrigger><SelectValue placeholder="Elegí jugador" /></SelectTrigger>
                <SelectContent>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.apodo ?? p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Victorias previas al sistema</Label>
              <Input
                type="number"
                min={0}
                value={winsForm.wins_historicas}
                onChange={(e) => setWinsForm({ ...winsForm, wins_historicas: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nota (opcional)</Label>
              <Input
                placeholder="Victorias previas al sistema"
                value={winsForm.motivo}
                onChange={(e) => setWinsForm({ ...winsForm, motivo: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWinsOpen(false)}>Cancelar</Button>
            <Button onClick={onUpsertWins} disabled={upsertWins.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Bonuses;
