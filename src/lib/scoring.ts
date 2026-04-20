// Sistema de puntos del torneo
export const SCORING = {
  ASISTENCIA: 1,
  GOL: 2,
  ASISTENCIA_PASE: 1,
  MVP: 5,
  GOL_FECHA: 3,
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
  goles: number;
  asistencias: number;
  mvp_count: number;
  gol_fecha_count: number;
}): number {
  return (
    stats.partidos_jugados * SCORING.ASISTENCIA +
    stats.goles * SCORING.GOL +
    stats.asistencias * SCORING.ASISTENCIA_PASE +
    stats.mvp_count * SCORING.MVP +
    stats.gol_fecha_count * SCORING.GOL_FECHA
  );
}

export function formatARS(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}
