import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ChemistryPair {
  player_a_id: string;
  player_b_id: string;
  partidos: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  win_rate: number;
}

/**
 * Calcula la "química" entre todos los pares de jugadores que jugaron en el mismo equipo,
 * solo en partidos cerrados.
 */
export const useChemistry = (minPartidos = 2) =>
  useQuery({
    queryKey: ["chemistry", minPartidos],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id, equipo_a_score, equipo_b_score, estado, match_players(player_id, equipo, presente)")
        .eq("estado", "cerrado");
      if (error) throw error;

      const pairs = new Map<string, ChemistryPair>();
      const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

      (data ?? []).forEach((m: any) => {
        const presentes = (m.match_players ?? []).filter((mp: any) => mp.presente);
        const teams: { A: string[]; B: string[] } = { A: [], B: [] };
        presentes.forEach((mp: any) => {
          if (mp.equipo === "A") teams.A.push(mp.player_id);
          else if (mp.equipo === "B") teams.B.push(mp.player_id);
        });

        const sideResult = (mine: number, theirs: number) =>
          mine > theirs ? "ganados" : mine < theirs ? "perdidos" : "empatados";

        (["A", "B"] as const).forEach((side) => {
          const list = teams[side];
          const mine = side === "A" ? m.equipo_a_score : m.equipo_b_score;
          const theirs = side === "A" ? m.equipo_b_score : m.equipo_a_score;
          const result = sideResult(mine, theirs);
          for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
              const k = key(list[i], list[j]);
              const [a, b] = k.split("|");
              const p = pairs.get(k) ?? {
                player_a_id: a,
                player_b_id: b,
                partidos: 0, ganados: 0, empatados: 0, perdidos: 0, win_rate: 0,
              };
              p.partidos += 1;
              p[result] += 1;
              pairs.set(k, p);
            }
          }
        });
      });

      const arr = Array.from(pairs.values())
        .map((p) => ({ ...p, win_rate: p.partidos ? p.ganados / p.partidos : 0 }))
        .filter((p) => p.partidos >= minPartidos)
        .sort((a, b) => b.win_rate - a.win_rate || b.partidos - a.partidos);
      return arr;
    },
  });
