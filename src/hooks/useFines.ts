import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Fine {
  id: string;
  player_id: string;
  match_id: string | null;
  motivo: string;
  monto: number;
  pagada: boolean;
  fecha: string;
  created_at: string;
  player?: { id: string; nombre: string; apodo: string | null; foto_url: string | null };
}

export interface FineInput {
  player_id: string;
  match_id?: string | null;
  motivo: string;
  monto: number;
}

export const useFines = () =>
  useQuery({
    queryKey: ["fines"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fines")
        .select("*, player:players(id, nombre, apodo, foto_url)")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Fine[];
    },
  });

export const useCreateFine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (f: FineInput) => {
      const { data, error } = await (supabase as any).from("fines").insert(f).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fines"] });
      qc.invalidateQueries({ queryKey: ["rankings"] });
      qc.invalidateQueries({ queryKey: ["fondo"] });
    },
  });
};

export const useToggleFinePaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pagada }: { id: string; pagada: boolean }) => {
      const { error } = await (supabase as any).from("fines").update({ pagada }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fines"] });
      qc.invalidateQueries({ queryKey: ["rankings"] });
      qc.invalidateQueries({ queryKey: ["fondo"] });
    },
  });
};

export const useDeleteFine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("fines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fines"] });
      qc.invalidateQueries({ queryKey: ["rankings"] });
      qc.invalidateQueries({ queryKey: ["fondo"] });
    },
  });
};
