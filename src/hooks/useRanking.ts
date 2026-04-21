import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RankingRow {
  player_id: string;
  nombre: string;
  apodo: string | null;
  foto_url: string | null;
  elo: number;
  partidos_jugados: number;
  goles: number;
  asistencias: number;
  mvp_count: number;
  gol_fecha_count: number;
  promedio_calificacion: number | null;
  multas_pendientes: number;
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
      const [contribsRes, finesRes] = await Promise.all([
        supabase.from("contributions").select("monto, pagado"),
        (supabase as any).from("fines").select("monto, pagada"),
      ]);
      if (contribsRes.error) throw contribsRes.error;
      if (finesRes.error) throw finesRes.error;
      const contribs = contribsRes.data ?? [];
      const fines = (finesRes.data ?? []) as { monto: number; pagada: boolean }[];

      const total = contribs.reduce((s, r) => s + Number(r.monto), 0);
      const cobrado = contribs.filter((r) => r.pagado).reduce((s, r) => s + Number(r.monto), 0);
      const multasTotal = fines.reduce((s, r) => s + Number(r.monto), 0);
      const multasCobradas = fines.filter((r) => r.pagada).reduce((s, r) => s + Number(r.monto), 0);

      return {
        total,
        cobrado,
        pendiente: total - cobrado,
        count: contribs.length,
        multasTotal,
        multasCobradas,
        multasPendientes: multasTotal - multasCobradas,
        // Caja efectiva: aportes cobrados + multas cobradas
        caja: cobrado + multasCobradas,
      };
    },
  });
