import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlayerBonus {
  id: string;
  player_id: string;
  motivo: string;
  puntos: number;
  fecha: string;
  player?: { nombre: string; apodo: string | null; foto_url: string | null };
}

export interface PlayerPanelWin {
  id: string;
  player_id: string;
  wins_historicas: number;
  motivo: string;
  player?: { nombre: string; apodo: string | null; foto_url: string | null };
}

export const usePlayerBonuses = () =>
  useQuery({
    queryKey: ["player_bonuses"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("player_bonuses")
        .select("*, player:players(nombre, apodo, foto_url)")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlayerBonus[];
    },
  });

export const usePlayerPanelWins = () =>
  useQuery({
    queryKey: ["player_panel_wins"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("player_panel_wins")
        .select("*, player:players(nombre, apodo, foto_url)");
      if (error) throw error;
      return (data ?? []) as PlayerPanelWin[];
    },
  });

export const useCreatePlayerBonus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { player_id: string; motivo: string; puntos: number }) => {
      const { error } = await (supabase as any).from("player_bonuses").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["player_bonuses"] });
      qc.invalidateQueries({ queryKey: ["rankings"] });
    },
  });
};

export const useDeletePlayerBonus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("player_bonuses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["player_bonuses"] });
      qc.invalidateQueries({ queryKey: ["rankings"] });
    },
  });
};

export const useUpsertPanelWins = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { player_id: string; wins_historicas: number; motivo: string }) => {
      const { error } = await (supabase as any)
        .from("player_panel_wins")
        .upsert(payload, { onConflict: "player_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["player_panel_wins"] });
      qc.invalidateQueries({ queryKey: ["rankings"] });
    },
  });
};

export const useDeletePanelWins = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("player_panel_wins").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["player_panel_wins"] });
      qc.invalidateQueries({ queryKey: ["rankings"] });
    },
  });
};
