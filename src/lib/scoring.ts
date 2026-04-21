// Sistema de puntos del torneo (usado en useRanking)
export const SCORING = {
  PARTIDO_JUGADO: 30,
  PARTIDO_GANADO: 20,
  MVP: 50,
  GOL_FECHA: 20,
} as const;

export const FONDO = {
  APORTE_POR_PARTIDO: 1000,
  PREMIO_1: 100000,
  PREMIO_2: 50000,
  PREMIO_3_5: "Remera",
} as const;

export const VOTACION = {
  HORAS_DURACION_DEFAULT: 48,
} as const;

export function calcularPuntos(stats: {
  partidos_jugados: number;
  partidos_ganados: number;
  mvp_count: number;
  gol_fecha_count: number;
  bonus_points?: number;
}): number {
  return (
    stats.partidos_jugados * SCORING.PARTIDO_JUGADO +
    stats.partidos_ganados * SCORING.PARTIDO_GANADO +
    stats.mvp_count * SCORING.MVP +
    stats.gol_fecha_count * SCORING.GOL_FECHA +
    (stats.bonus_points ?? 0)
  );
}

export const CALIFICACION_CRITERIOS = [
  { rango: "9 – 10", label: "Figura del partido", descripcion: "Fue determinante, influyó en casi todo" },
  { rango: "7 – 8", label: "Muy bueno", descripcion: "Consistente, aportó en ataque y defensa" },
  { rango: "5 – 6", label: "Regular", descripcion: "Cumplió pero sin destacarse" },
  { rango: "3 – 4", label: "Por debajo", descripcion: "Tuvo errores que costaron caro" },
  { rango: "1 – 2", label: "Muy mal partido", descripcion: "Fue un lastre para el equipo" },
] as const;

export function formatARS(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}
