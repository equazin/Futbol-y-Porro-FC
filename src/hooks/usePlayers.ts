import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Player = Database["public"]["Tables"]["players"]["Row"];
export type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"];
export type PlayerUpdate = Database["public"]["Tables"]["players"]["Update"];

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
      if (tipo !== "all") q = (q as any).eq("tipo", tipo);
      const { data, error } = await q;
      if (error) throw error;
      return data as Player[];
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
