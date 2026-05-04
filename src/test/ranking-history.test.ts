import { describe, expect, it } from "vitest";
import { buildRankingDataset } from "@/hooks/useRanking";

describe("buildRankingDataset", () => {
  it("builds player totals and an accumulated history from historical base, matches, and bonuses", () => {
    const dataset = buildRankingDataset({
      players: [
        {
          id: "p1",
          nombre: "Fran",
          apodo: "Fran",
          foto_url: null,
          elo: 1000,
          activo: true,
          tipo: "titular",
        },
        {
          id: "p2",
          nombre: "Chinche",
          apodo: "Chinche",
          foto_url: null,
          elo: 1000,
          activo: true,
          tipo: "titular",
        },
      ],
      matches: [
        {
          id: "m1",
          fecha: "2026-05-03T20:00:00.000Z",
          estado: "cerrado",
          equipo_a_score: 2,
          equipo_b_score: 1,
          mvp_player_id: "p1",
          gol_de_la_fecha_player_id: "p2",
          is_friendly: false,
        },
      ],
      matchPlayers: [
        {
          player_id: "p1",
          match_id: "m1",
          equipo: "A",
          goles: 2,
          asistencias: 1,
          calificacion: 8,
          presente: true,
        },
        {
          player_id: "p2",
          match_id: "m1",
          equipo: "B",
          goles: 1,
          asistencias: 0,
          calificacion: 6,
          presente: true,
        },
      ],
      fines: [],
      bonuses: [
        {
          id: "b1",
          player_id: "p1",
          puntos: 15,
          fecha: "2026-05-04T12:00:00.000Z",
          motivo: "Bonus asistencia perfecta",
        },
      ],
      panelWins: [],
      historicalStats: [
        {
          player_id: "p1",
          pj: 1,
          pg: 1,
          mvp: 0,
          gf: 0,
        },
      ],
    });

    const fran = dataset.rows.find((row) => row.player_id === "p1");
    expect(fran).toMatchObject({
      partidos_jugados: 2,
      partidos_ganados: 2,
      goles: 2,
      asistencias: 1,
      mvp_count: 1,
      gol_fecha_count: 0,
      bonus_points: 15,
      puntos: 165,
    });

    const franHistory = dataset.histories.find((history) => history.player_id === "p1");
    expect(franHistory?.timeline.map((point) => point.puntos)).toEqual([50, 150, 165]);
    expect(franHistory?.timeline.map((point) => point.puntos_delta)).toEqual([0, 100, 15]);

    const chinche = dataset.rows.find((row) => row.player_id === "p2");
    expect(chinche).toMatchObject({
      partidos_jugados: 1,
      partidos_ganados: 0,
      goles: 1,
      gol_fecha_count: 1,
      puntos: 50,
    });
  });
});
