import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RankingRow {
  player_id: string;
  nombre: string;
  apodo: string | null;
  foto_url: string | null;
  elo: number;
  partidos_jugados: number;
  partidos_ganados: number;
  efectividad: number;
  goles: number;
  asistencias: number;
  mvp_count: number;
  gol_fecha_count: number;
  promedio_calificacion: number | null;
  promedio_rendimiento: number | null;
  bonus_points: number;
  multas_pendientes: number;
  puntos: number;
}

const PANEL_BONUS: Record<string, number> = {
  Kippes: 40,
  Fran: 20,
  "Julio Metal": 20,
  Peter: 20,
};

const PANEL_WINS: Record<string, number> = {
  Kippes: 3,
  Turro: 0,
  Demencia: 3,
  Topa: 4,
  "Isleño": 0,
  "Faculo Airbag": 4,
  Fran: 7,
  Ponchi: 0,
  "Jony sucio": 1,
  "Julio Metal": 1,
  Valencia: 1,
  Bini: 2,
  Cinema: 0,
  Chinche: 7,
  Culebra: 2,
  Vegui: 4,
  Mosky: 3,
  Bylu: 2,
  "Pana Hija": 0,
  "DJ Manzon": 2,
  Nuno: 5,
  Peter: 5,
  Tincho: 2,
  "Nacho Suri IND": 0,
};

function calcularPromedioRendimiento(input: {
  partidos: number;
  ganados: number;
  goles: number;
  asistencias: number;
  mvp: number;
  golFecha: number;
}): number | null {
  if (input.partidos <= 0) return null;

  const winRate = input.ganados / input.partidos;
  const golesPorPartido = input.goles / input.partidos;
  const asistPorPartido = input.asistencias / input.partidos;
  const mvpPorPartido = input.mvp / input.partidos;
  const golFechaPorPartido = input.golFecha / input.partidos;

  const score10 =
    winRate * 4 +
    (Math.min(golesPorPartido, 2) / 2) * 1.5 +
    (Math.min(asistPorPartido, 2) / 2) * 1 +
    (Math.min(mvpPorPartido, 0.5) / 0.5) * 2 +
    (Math.min(golFechaPorPartido, 0.5) / 0.5) * 1.5;

  return Number(score10.toFixed(1));
}

export const useRanking = () =>
  useQuery({
    queryKey: ["rankings"],
    queryFn: async () => {
      const [playersRes, matchesRes, matchPlayersRes, finesRes] = await Promise.all([
        (supabase as any).from("players").select("id, nombre, apodo, foto_url, elo, activo"),
        (supabase as any).from("matches").select("id, estado, equipo_a_score, equipo_b_score, mvp_player_id, gol_de_la_fecha_player_id"),
        (supabase as any).from("match_players").select("player_id, match_id, equipo, goles, asistencias, calificacion, presente"),
        (supabase as any).from("fines").select("player_id, monto, pagada"),
      ]);

      if (playersRes.error) throw playersRes.error;
      if (matchesRes.error) throw matchesRes.error;
      if (matchPlayersRes.error) throw matchPlayersRes.error;
      if (finesRes.error) throw finesRes.error;

      const players = (playersRes.data ?? []) as Array<{
        id: string;
        nombre: string;
        apodo: string | null;
        foto_url: string | null;
        elo: number;
        activo: boolean;
      }>;
      const matches = (matchesRes.data ?? []) as Array<{
        id: string;
        estado: string;
        equipo_a_score: number;
        equipo_b_score: number;
        mvp_player_id: string | null;
        gol_de_la_fecha_player_id: string | null;
      }>;
      const matchPlayers = (matchPlayersRes.data ?? []) as Array<{
        player_id: string;
        match_id: string;
        equipo: "A" | "B";
        goles: number;
        asistencias: number;
        calificacion: number | null;
        presente: boolean;
      }>;
      const fines = (finesRes.data ?? []) as Array<{
        player_id: string;
        monto: number;
        pagada: boolean;
      }>;

      const closedMatches = new Map(matches.filter((m) => m.estado === "cerrado").map((m) => [m.id, m]));
      const rows = new Map<
        string,
        RankingRow & {
          wins_dynamic: number;
          ratings_total: number;
          ratings_count: number;
        }
      >();

      for (const player of players) {
        if (!player.activo) continue;
        rows.set(player.id, {
          player_id: player.id,
          nombre: player.nombre,
          apodo: player.apodo,
          foto_url: player.foto_url,
          elo: Number(player.elo || 1000),
          partidos_jugados: 0,
          partidos_ganados: 0,
          efectividad: 0,
          goles: 0,
          asistencias: 0,
          mvp_count: 0,
          gol_fecha_count: 0,
          promedio_calificacion: null,
          promedio_rendimiento: null,
          bonus_points: 0,
          multas_pendientes: 0,
          puntos: 0,
          wins_dynamic: 0,
          ratings_total: 0,
          ratings_count: 0,
        });
      }

      for (const mp of matchPlayers) {
        if (!mp.presente) continue;
        const row = rows.get(mp.player_id);
        const match = closedMatches.get(mp.match_id);
        if (!row || !match) continue;

        row.partidos_jugados += 1;
        row.goles += Number(mp.goles || 0);
        row.asistencias += Number(mp.asistencias || 0);
        if (typeof mp.calificacion === "number") {
          row.ratings_total += Number(mp.calificacion);
          row.ratings_count += 1;
        }

        const winA = match.equipo_a_score > match.equipo_b_score;
        const winB = match.equipo_b_score > match.equipo_a_score;
        if ((mp.equipo === "A" && winA) || (mp.equipo === "B" && winB)) {
          row.wins_dynamic += 1;
        }
      }

      for (const match of closedMatches.values()) {
        if (match.mvp_player_id && rows.has(match.mvp_player_id)) {
          rows.get(match.mvp_player_id)!.mvp_count += 1;
        }
        if (match.gol_de_la_fecha_player_id && rows.has(match.gol_de_la_fecha_player_id)) {
          rows.get(match.gol_de_la_fecha_player_id)!.gol_fecha_count += 1;
        }
      }

      for (const fine of fines) {
        if (fine.pagada) continue;
        const row = rows.get(fine.player_id);
        if (!row) continue;
        row.multas_pendientes += Number(fine.monto || 0);
      }

      const output = [...rows.values()].map((row) => {
        row.promedio_calificacion =
          row.ratings_count > 0 ? Number((row.ratings_total / row.ratings_count).toFixed(2)) : null;

        const wins = PANEL_WINS[row.nombre] ?? row.wins_dynamic;
        const bonus = PANEL_BONUS[row.nombre] ?? 0;
        const efectividad = row.partidos_jugados > 0 ? Number(((wins / row.partidos_jugados) * 100).toFixed(1)) : 0;
        const promedioRendimiento = calcularPromedioRendimiento({
          partidos: row.partidos_jugados,
          ganados: wins,
          goles: row.goles,
          asistencias: row.asistencias,
          mvp: row.mvp_count,
          golFecha: row.gol_fecha_count,
        });

        row.partidos_ganados = wins;
        row.efectividad = efectividad;
        row.promedio_rendimiento = promedioRendimiento;
        row.bonus_points = bonus;
        row.puntos = row.partidos_jugados * 30 + wins * 20 + row.mvp_count * 50 + row.gol_fecha_count * 20 + bonus;

        return {
          player_id: row.player_id,
          nombre: row.nombre,
          apodo: row.apodo,
          foto_url: row.foto_url,
          elo: row.elo,
          partidos_jugados: row.partidos_jugados,
          partidos_ganados: row.partidos_ganados,
          efectividad: row.efectividad,
          goles: row.goles,
          asistencias: row.asistencias,
          mvp_count: row.mvp_count,
          gol_fecha_count: row.gol_fecha_count,
          promedio_calificacion: row.promedio_calificacion,
          promedio_rendimiento: row.promedio_rendimiento,
          bonus_points: row.bonus_points,
          multas_pendientes: row.multas_pendientes,
          puntos: row.puntos,
        } as RankingRow;
      });

      output.sort((a, b) => b.puntos - a.puntos || b.mvp_count - a.mvp_count || b.partidos_jugados - a.partidos_jugados);
      return output;
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
