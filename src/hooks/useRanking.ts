import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RankingRow {
  player_id: string;
  nombre: string;
  apodo: string | null;
  foto_url: string | null;
  partidos_jugados: number;
  goles: number;
  asistencias: number;
  mvp_count: number;
  gol_fecha_count: number;
  promedio_calificacion: number | null;
  puntos: number;
}

export const useRanking = () =>
  useQuery({
    queryKey: ["rankings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("rankings")
        .select("*")
        .order("puntos", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RankingRow[];
    },
  });

export const useFondo = () =>
  useQuery({
    queryKey: ["fondo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contributions").select("monto, pagado");
      if (error) throw error;
      const total = (data ?? []).reduce((sum, r) => sum + Number(r.monto), 0);
      const cobrado = (data ?? []).filter((r) => r.pagado).reduce((s, r) => s + Number(r.monto), 0);
      return { total, cobrado, pendiente: total - cobrado, count: data?.length ?? 0 };
    },
  });
