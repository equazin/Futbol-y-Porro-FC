import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Venue {
  id: string;
  nombre: string;
  direccion: string | null;
  activo: boolean;
  orden: number;
  created_at: string;
}

export interface VenueInput {
  nombre: string;
  direccion?: string | null;
  activo?: boolean;
  orden?: number;
}

export const DEFAULT_VENUES = ["Cancha Norte", "Cancha Sur", "Polideportivo", "Club Barrio"];

export const useVenues = (onlyActive = true) =>
  useQuery({
    queryKey: ["venues", { onlyActive }],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("venues")
        .select("id, nombre, direccion, activo, orden, created_at")
        .order("orden", { ascending: true })
        .order("nombre", { ascending: true });

      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") {
          return DEFAULT_VENUES.map((nombre, index) => ({
            id: `fallback-${index}`,
            nombre,
            direccion: null,
            activo: true,
            orden: index + 1,
            created_at: new Date(0).toISOString(),
          })) as Venue[];
        }
        throw error;
      }

      const venues = (data ?? []) as Venue[];
      const filtered = onlyActive ? venues.filter((v) => v.activo) : venues;
      if (filtered.length === 0 && onlyActive) {
        return DEFAULT_VENUES.map((nombre, index) => ({
          id: `fallback-${index}`,
          nombre,
          direccion: null,
          activo: true,
          orden: index + 1,
          created_at: new Date(0).toISOString(),
        })) as Venue[];
      }
      return filtered;
    },
  });

export const useCreateVenue = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: VenueInput) => {
      const { data, error } = await (supabase as any).from("venues").insert(input).select().single();
      if (error) throw error;
      return data as Venue;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["venues"] }),
  });
};

export const useUpdateVenue = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<VenueInput> & { id: string }) => {
      const { data, error } = await (supabase as any).from("venues").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as Venue;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["venues"] }),
  });
};

export const useDeleteVenue = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("venues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["venues"] }),
  });
};

