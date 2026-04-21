import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FinePreset {
  id: string;
  motivo: string;
  monto_default: number;
  activo: boolean;
  orden: number;
}

const FALLBACK_PRESETS: FinePreset[] = [
  { id: "fallback-1", motivo: "Ausencia sin avisar", monto_default: 1000, activo: true, orden: 1 },
  { id: "fallback-2", motivo: "Llegada tarde", monto_default: 300, activo: true, orden: 2 },
  { id: "fallback-3", motivo: "Olvido elementos", monto_default: 200, activo: true, orden: 3 },
  { id: "fallback-4", motivo: "Roja directa", monto_default: 500, activo: true, orden: 4 },
  { id: "fallback-5", motivo: "Otro", monto_default: 500, activo: true, orden: 5 },
];

export const useFinePresets = () =>
  useQuery({
    queryKey: ["fine_presets"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fine_presets")
        .select("*")
        .eq("activo", true)
        .order("orden");
      if (error) return FALLBACK_PRESETS;
      return ((data ?? []) as FinePreset[]).length > 0 ? (data as FinePreset[]) : FALLBACK_PRESETS;
    },
  });

export const useCreateFinePreset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { motivo: string; monto_default: number; orden: number }) => {
      const { error } = await (supabase as any).from("fine_presets").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fine_presets"] }),
  });
};

export const useUpdateFinePreset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: Partial<FinePreset> & { id: string }) => {
      const { error } = await (supabase as any).from("fine_presets").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fine_presets"] }),
  });
};

export const useDeleteFinePreset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("fine_presets")
        .update({ activo: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fine_presets"] }),
  });
};
