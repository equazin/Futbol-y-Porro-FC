import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Player = Database["public"]["Tables"]["players"]["Row"];
export type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"];
export type PlayerUpdate = Database["public"]["Tables"]["players"]["Update"];

export interface VerifiedVoter {
  id: string;
  nombre: string;
  apodo: string | null;
  foto_url: string | null;
}

export interface UsePlayersOptions {
  onlyActive?: boolean;
  tipo?: "titular" | "invitado" | "all";
}

export const usePlayers = (onlyActiveOrOpts: boolean | UsePlayersOptions = true) => {
  const opts: UsePlayersOptions =
    typeof onlyActiveOrOpts === "boolean"
      ? { onlyActive: onlyActiveOrOpts, tipo: "all" }
      : onlyActiveOrOpts;
  const { onlyActive = true, tipo = "all" } = opts;

  return useQuery({
    queryKey: ["players", { onlyActive, tipo }],
    queryFn: async () => {
      let q = supabase.from("players").select("*").order("nombre");
      if (onlyActive) q = q.eq("activo", true);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as Player[];
      // Filter by tipo in JS so query doesn't fail if column doesn't exist yet
      if (tipo === "all") return rows;
      return rows.filter((p) => (p.tipo ?? "titular") === tipo);
    },
  });
};

export const useCreatePlayer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: PlayerInsert) => {
      const { data, error } = await supabase.from("players").insert(p).select().single();
      if (error) throw error;
      return data as Player;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players"] }),
  });
};

export const useSetPlayerDni = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ playerId, dni }: { playerId: string; dni: string }) => {
      const { error } = await (supabase as any).rpc("set_player_dni", {
        p_player_id: playerId,
        p_dni: dni,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players"] }),
  });
};

export const useVerifyMatchVoter = () =>
  useMutation({
    mutationFn: async ({ matchId, dni }: { matchId: string; dni: string }) => {
      const { data, error } = await (supabase as any).rpc("verify_match_voter", {
        p_match_id: matchId,
        p_dni: dni,
      });
      if (error) throw error;
      const voter = (data ?? [])[0] as VerifiedVoter | undefined;
      if (!voter) throw new Error("No encontramos un jugador habilitado para votar con ese DNI.");
      return voter;
    },
  });

export const useCreateGuestPlayer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Omit<PlayerInsert, "tipo">) => {
      const { data, error } = await supabase
        .from("players")
        .insert({ ...p, tipo: "invitado" } as any)
        .select()
        .single();
      if (error) throw error;
      return data as Player;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players"] }),
  });
};

export const useUpdatePlayer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: PlayerUpdate & { id: string }) => {
      const { data, error } = await supabase.from("players").update(rest as any).eq("id", id).select().single();
      if (error) throw error;
      return data as Player;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players"] }),
  });
};

export const useDeletePlayer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("players").update({ activo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players"] }),
  });
};
