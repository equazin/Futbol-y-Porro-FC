import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FONDO } from "@/lib/scoring";

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

const QUERY_TIMEOUT_MS = 10000;

const withTimeout = async <T>(promise: Promise<T>, label: string): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout al cargar ${label}`)), QUERY_TIMEOUT_MS);
  });
  return Promise.race([promise, timeoutPromise]);
};

export const useRanking = () =>
  useQuery({
    queryKey: ["rankings"],
    networkMode: "always",
    retry: 1,
    queryFn: async () => {
      const [playersRes, matchesRes, matchPlayersRes, bonusesRes, panelWinsRes, historicalRes] = await Promise.all([
        withTimeout((supabase as any).from("players").select("id, nombre, apodo, foto_url, elo, activo"), "jugadores"),
        withTimeout(
          (supabase as any).from("matches").select("id, estado, equipo_a_score, equipo_b_score, mvp_player_id, gol_de_la_fecha_player_id"),
          "partidos",
        ),
        withTimeout(
          (supabase as any).from("match_players").select("player_id, match_id, equipo, goles, asistencias, calificacion, presente"),
          "participaciones",
        ),
        withTimeout((supabase as any).from("player_bonuses").select("player_id, puntos"), "bonuses").catch(
          () => ({ data: [], error: null }) as { data: []; error: null },
        ),
        withTimeout((supabase as any).from("player_panel_wins").select("player_id, wins_historicas"), "panel_wins").catch(
          () => ({ data: [], error: null }) as { data: []; error: null },
        ),
        withTimeout((supabase as any).from("player_historical_stats").select("player_id, pj, pg, mvp, gf"), "historial").catch(
          () => ({ data: [], error: null }) as { data: []; error: null },
        ),
      ]);

      const finesRes = await withTimeout((supabase as any).from("fines").select("player_id, monto, pagada"), "multas").catch(
        () =>
          ({
            data: [],
            error: null,
          }) as { data: []; error: null },
      );

      if (playersRes.error) throw playersRes.error;
      if (matchesRes.error) throw matchesRes.error;
      if (matchPlayersRes.error) throw matchPlayersRes.error;

      const players = (playersRes.data ?? []) as Array<{
        id: string;
        nombre: string;
        apodo: string | null;
        foto_url: string | null;
        elo: number;
        activo: boolean;
        tipo?: string;
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
      const fines = ((finesRes as any).data ?? []) as Array<{
        player_id: string;
        monto: number;
        pagada: boolean;
      }>;

      const bonuses = ((bonusesRes as any).data ?? []) as Array<{
        player_id: string;
        puntos: number;
      }>;
      const panelWins = ((panelWinsRes as any).data ?? []) as Array<{
        player_id: string;
        wins_historicas: number;
      }>;
      const historicalStats = ((historicalRes as any).data ?? []) as Array<{
        player_id: string;
        pj: number;
        pg: number;
        mvp: number;
        gf: number;
      }>;

      const bonusByPlayer = new Map<string, number>();
      for (const b of bonuses) {
        bonusByPlayer.set(b.player_id, (bonusByPlayer.get(b.player_id) ?? 0) + Number(b.puntos));
      }

      const panelWinsByPlayer = new Map<string, number>();
      for (const pw of panelWins) {
        panelWinsByPlayer.set(pw.player_id, Number(pw.wins_historicas));
      }

      const historicalByPlayer = new Map<string, { pj: number; pg: number; mvp: number; gf: number }>();
      for (const h of historicalStats) {
        historicalByPlayer.set(h.player_id, {
          pj: Number(h.pj),
          pg: Number(h.pg),
          mvp: Number(h.mvp),
          gf: Number(h.gf),
        });
      }

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
        if (player.tipo === "invitado") continue;
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

        const hist = historicalByPlayer.get(row.player_id);
        const panelWinsCount = panelWinsByPlayer.get(row.player_id);
        const bonus = bonusByPlayer.get(row.player_id) ?? 0;

        // Totales = histórico + digital
        const totalPJ = row.partidos_jugados + (hist?.pj ?? 0);
        const totalMVP = row.mvp_count + (hist?.mvp ?? 0);
        const totalGF = row.gol_fecha_count + (hist?.gf ?? 0);

        // Victorias: player_panel_wins (históricas) + wins_dynamic (digitales)
        // Si hay historical_stats.pg pero no panel_wins, usamos hist.pg
        const histWins = panelWinsCount ?? hist?.pg ?? 0;
        const totalWins = histWins + row.wins_dynamic;

        const efectividad = totalPJ > 0 ? Number(((totalWins / totalPJ) * 100).toFixed(1)) : 0;
        const promedioRendimiento = calcularPromedioRendimiento({
          partidos: totalPJ,
          ganados: totalWins,
          goles: row.goles,
          asistencias: row.asistencias,
          mvp: totalMVP,
          golFecha: totalGF,
        });

        row.partidos_jugados = totalPJ;
        row.partidos_ganados = totalWins;
        row.mvp_count = totalMVP;
        row.gol_fecha_count = totalGF;
        row.efectividad = efectividad;
        row.promedio_rendimiento = promedioRendimiento;
        row.bonus_points = bonus;
        row.puntos = totalPJ * 30 + totalWins * 20 + totalMVP * 50 + totalGF * 20 + bonus;

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
        supabase
          .from("contributions")
          .select("monto, pagado, match:matches(fecha)"),
        (supabase as any).from("fines").select("monto, pagada"),
      ]);
      if (contribsRes.error) throw contribsRes.error;
      if (finesRes.error) throw finesRes.error;

      const allContribs = (contribsRes.data ?? []) as Array<{
        monto: number;
        pagado: boolean;
        match: { fecha: string } | null;
      }>;
      const fines = (finesRes.data ?? []) as { monto: number; pagada: boolean }[];

      // Solo contar contribuciones desde FONDO.FECHA_INICIO
      const contribs = allContribs.filter((c) => {
        const fecha = c.match?.fecha;
        return fecha != null && fecha >= FONDO.FECHA_INICIO;
      });

      const aportesTotal = contribs.reduce((s, r) => s + Number(r.monto), 0);
      const aporteCobrado = contribs.filter((r) => r.pagado).reduce((s, r) => s + Number(r.monto), 0);
      const multasTotal = fines.reduce((s, r) => s + Number(r.monto), 0);
      const multasCobradas = fines.filter((r) => r.pagada).reduce((s, r) => s + Number(r.monto), 0);

      // Total real = base histórica + aportes digitales
      const total = FONDO.BASE + aportesTotal;
      const cobrado = FONDO.BASE + aporteCobrado;

      return {
        total,
        cobrado,
        pendiente: aportesTotal - aporteCobrado,
        count: contribs.length,
        multasTotal,
        multasCobradas,
        multasPendientes: multasTotal - multasCobradas,
        // Caja efectiva: base + aportes cobrados + multas cobradas
        caja: FONDO.BASE + aporteCobrado + multasCobradas,
        // Desglose para mostrar en la UI
        base: FONDO.BASE,
        aportesDigitales: aporteCobrado,
      };
    },
  });
