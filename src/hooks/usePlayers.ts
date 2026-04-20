import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Player = Database["public"]["Tables"]["players"]["Row"];
export type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"];
export type PlayerUpdate = Database["public"]["Tables"]["players"]["Update"];

export const usePlayers = (onlyActive = true) =>
  useQuery({
    queryKey: ["players", { onlyActive }],
    queryFn: async () => {
      let q = supabase.from("players").select("*").order("nombre");
      if (onlyActive) q = q.eq("activo", true);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const useCreatePlayer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: PlayerInsert) => {
      const { data, error } = await supabase.from("players").insert(p).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players"] }),
  });
};

export const useUpdatePlayer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: PlayerUpdate & { id: string }) => {
      const { data, error } = await supabase.from("players").update(rest).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players"] }),
  });
};

export const useDeletePlayer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // soft delete
      const { error } = await supabase.from("players").update({ activo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players"] }),
  });
};
