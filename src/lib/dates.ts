import { format } from "date-fns";
import { es } from "date-fns/locale";

// "lunes 14 de abril, 20:00 hs"
export const fmtPartidoLargo = (fecha: string) =>
  format(new Date(fecha), "EEEE d 'de' MMMM, HH:mm 'hs'", { locale: es });

// "lunes 14 de abril"
export const fmtPartidoSinHora = (fecha: string) =>
  format(new Date(fecha), "EEEE d 'de' MMMM", { locale: es });

// "lunes 14 de abril 2025"
export const fmtPartidoConAño = (fecha: string) =>
  format(new Date(fecha), "EEEE d 'de' MMMM yyyy", { locale: es });

// "14 abr 2025"
export const fmtFechaCorta = (fecha: string) =>
  format(new Date(fecha), "d MMM yyyy", { locale: es });

// "14 abr"
export const fmtFechaMini = (fecha: string) =>
  format(new Date(fecha), "d MMM", { locale: es });

// "20:00"
export const fmtHora = (fecha: string) =>
  format(new Date(fecha), "HH:mm");

// "abr" / "14" — para el bloque calendario en la lista de partidos
export const fmtMes = (fecha: string) =>
  format(new Date(fecha), "MMM", { locale: es });

export const fmtDia = (fecha: string) =>
  format(new Date(fecha), "d");

export const fmtDiaSemana = (fecha: string) =>
  format(new Date(fecha), "EEEE", { locale: es });
