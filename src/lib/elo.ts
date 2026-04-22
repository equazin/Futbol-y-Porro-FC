// Sistema ELO simple + utilidades de armado de equipos balanceados

export const ELO_K = 32; // factor K (volatilidad de cambio por partido)
export const ELO_INICIAL = 1000;

/** Probabilidad esperada de ganar de A vs B */
export function expectedScore(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

/** result: 1 = ganó, 0.5 = empate, 0 = perdió */
export function newElo(currentElo: number, expected: number, result: number, k = ELO_K): number {
  return currentElo + k * (result - expected);
}

/** Promedio de ELO de un grupo de jugadores */
export function avgElo(elos: number[]): number {
  if (elos.length === 0) return ELO_INICIAL;
  return elos.reduce((s, e) => s + e, 0) / elos.length;
}

/** Calcula el resultado de un equipo: 1, 0.5 o 0 */
export function teamResult(myScore: number, theirScore: number): number {
  if (myScore > theirScore) return 1;
  if (myScore < theirScore) return 0;
  return 0.5;
}

/* ==========================================================
 * Auto-armado de equipos balanceados
 * Heurística: ordenar por "fuerza" (ELO + bonus posición),
 * luego repartir alternando para minimizar diferencia,
 * intentando además mantener al menos 1 arquero por equipo.
 * ========================================================== */

interface PlayerLite {
  id: string;
  elo: number;
  posicion: string | null;
  promedio_rendimiento?: number | null;
}

const positionWeight: Record<string, number> = {
  arquero: 30,
  defensor: 10,
  mediocampista: 15,
  delantero: 20,
};

export function balanceTeams(players: PlayerLite[]): { A: string[]; B: string[] } {
  if (players.length === 0) return { A: [], B: [] };

  // Score = elo + peso por posición + ajuste por promedio de rendimiento
  // PROM escala de 0-10, cada punto = 15 puntos de score
  const scored = players
    .map((p) => ({
      ...p,
      score:
        (p.elo ?? ELO_INICIAL) +
        (p.posicion ? positionWeight[p.posicion] ?? 0 : 0) +
        (p.promedio_rendimiento != null ? (p.promedio_rendimiento - 5) * 15 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  const A: typeof scored = [];
  const B: typeof scored = [];
  let sumA = 0;
  let sumB = 0;

  // Greedy: cada jugador va al equipo con menor suma actual
  for (const p of scored) {
    if (sumA <= sumB) {
      A.push(p);
      sumA += p.score;
    } else {
      B.push(p);
      sumB += p.score;
    }
  }

  // Asegurar arquero en cada equipo si hay >=2 arqueros disponibles
  const arquerosA = A.filter((p) => p.posicion === "arquero");
  const arquerosB = B.filter((p) => p.posicion === "arquero");
  if (arquerosA.length === 0 && arquerosB.length >= 2) {
    const swap = arquerosB[0];
    // mover swap de B a A, balancear con un jugador de A similar
    const candidate = A.sort((a, b) => Math.abs(a.score - swap.score) - Math.abs(b.score - swap.score))[0];
    if (candidate) {
      A.splice(A.indexOf(candidate), 1);
      B.splice(B.indexOf(swap), 1);
      A.push(swap);
      B.push(candidate);
    }
  } else if (arquerosB.length === 0 && arquerosA.length >= 2) {
    const swap = arquerosA[0];
    const candidate = B.sort((a, b) => Math.abs(a.score - swap.score) - Math.abs(b.score - swap.score))[0];
    if (candidate) {
      B.splice(B.indexOf(candidate), 1);
      A.splice(A.indexOf(swap), 1);
      B.push(swap);
      A.push(candidate);
    }
  }

  return { A: A.map((p) => p.id), B: B.map((p) => p.id) };
}
