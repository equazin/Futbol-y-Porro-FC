import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { FONDO } from "@/lib/scoring";

export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type MatchInsert = Database["public"]["Tables"]["matches"]["Insert"];
export type MatchPlayer = Database["public"]["Tables"]["match_players"]["Row"];

export const useMatches = () =>
  useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*, mvp:players!matches_mvp_player_id_fkey(id, nombre, apodo, foto_url), gol_fecha:players!matches_gol_de_la_fecha_player_id_fkey(id, nombre, apodo, foto_url)")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useMatch = (id?: string) =>
  useQuery({
    queryKey: ["match", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*, mvp:players!matches_mvp_player_id_fkey(id, nombre, apodo, foto_url), gol_fecha:players!matches_gol_de_la_fecha_player_id_fkey(id, nombre, apodo, foto_url)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

export const useMatchPlayers = (matchId?: string) =>
  useQuery({
    queryKey: ["match_players", matchId],
    enabled: !!matchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_players")
        .select("*, player:players(id, nombre, apodo, foto_url, posicion)")
        .eq("match_id", matchId!);
      if (error) throw error;
      return data;
    },
  });

export const useCreateMatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MatchInsert) => {
      const { data, error } = await supabase.from("matches").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matches"] }),
  });
};

export const useDeleteMatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("matches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["fondo"] });
    },
  });
};

export interface MatchPlayerInput {
  player_id: string;
  equipo: "A" | "B";
  goles?: number;
  asistencias?: number;
  calificacion?: number | null;
  presente?: boolean;
}

export const useSaveMatchPlayers = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, players }: { matchId: string; players: MatchPlayerInput[] }) => {
      // Borrar planteles previos y reinsertar (más simple para edición)
      const { error: delErr } = await supabase.from("match_players").delete().eq("match_id", matchId);
      if (delErr) throw delErr;

      if (players.length > 0) {
        const rows = players.map((p) => ({ match_id: matchId, ...p }));
        const { error: insErr } = await supabase.from("match_players").insert(rows);
        if (insErr) throw insErr;

        // Crear contributions automáticas para cada jugador presente
        await supabase.from("contributions").delete().eq("match_id", matchId);
        const contribs = players
          .filter((p) => p.presente !== false)
          .map((p) => ({
            match_id: matchId,
            player_id: p.player_id,
            monto: FONDO.APORTE_POR_PARTIDO,
          }));
        if (contribs.length > 0) {
          const { error: cErr } = await supabase.from("contributions").insert(contribs);
          if (cErr) throw cErr;
        }
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["match_players", vars.matchId] });
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["rankings"] });
      qc.invalidateQueries({ queryKey: ["fondo"] });
    },
  });
};

export const useUpdateMatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: Partial<Match> & { id: string }) => {
      const { data, error } = await supabase.from("matches").update(rest).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["match", vars.id] });
      qc.invalidateQueries({ queryKey: ["rankings"] });
    },
  });
};
