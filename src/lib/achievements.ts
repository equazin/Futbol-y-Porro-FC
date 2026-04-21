// Logros derivados de stats (sin tabla nueva)
import type { LucideIcon } from "lucide-react";
import { Trophy, Star, Goal, Flame, Award, Zap, Crown, Target } from "lucide-react";

export interface Achievement {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string; // tailwind classes (texto)
  bg: string; // tailwind classes (fondo + borde)
}

export interface PlayerStats {
  partidos_jugados: number;
  goles: number;
  asistencias: number;
  mvp_count: number;
  gol_fecha_count: number;
  promedio_calificacion?: number | null;
}

/** Logros tipo "milestone" basados solo en stats agregadas */
export function getAchievements(s: PlayerStats): Achievement[] {
  const out: Achievement[] = [];

  if (s.mvp_count >= 3) {
    out.push({
      id: "mvp_x3",
      label: "MVP x3",
      description: "Ganó MVP en 3 o más partidos",
      icon: Crown,
      color: "text-mvp",
      bg: "bg-mvp/15 border-mvp/40",
    });
  }
  if (s.gol_fecha_count >= 3) {
    out.push({
      id: "golazo_x3",
      label: "Pintor",
      description: "Gol de la fecha en 3+ partidos",
      icon: Goal,
      color: "text-stats",
      bg: "bg-stats/15 border-stats/40",
    });
  }
  if (s.goles >= 10) {
    out.push({
      id: "goleador_10",
      label: "Goleador",
      description: "10+ goles en el torneo",
      icon: Target,
      color: "text-destructive",
      bg: "bg-destructive/15 border-destructive/40",
    });
  }
  if (s.goles >= 25) {
    out.push({
      id: "goleador_25",
      label: "Killer",
      description: "25+ goles en el torneo",
      icon: Flame,
      color: "text-destructive",
      bg: "bg-destructive/15 border-destructive/40",
    });
  }
  if (s.asistencias >= 10) {
    out.push({
      id: "asistidor_10",
      label: "Asistidor",
      description: "10+ asistencias",
      icon: Zap,
      color: "text-primary",
      bg: "bg-primary/15 border-primary/40",
    });
  }
  if (s.partidos_jugados >= 10) {
    out.push({
      id: "presente",
      label: "Presente",
      description: "Jugó 10+ partidos",
      icon: Award,
      color: "text-foreground",
      bg: "bg-secondary border-border",
    });
  }
  if (s.partidos_jugados >= 25) {
    out.push({
      id: "habitual",
      label: "Habitual",
      description: "Jugó 25+ partidos",
      icon: Award,
      color: "text-mvp",
      bg: "bg-mvp/10 border-mvp/30",
    });
  }
  if ((s.promedio_calificacion ?? 0) >= 8) {
    out.push({
      id: "estrella",
      label: "Estrella",
      description: "Promedio de calificación 8+",
      icon: Star,
      color: "text-mvp",
      bg: "bg-mvp/15 border-mvp/40",
    });
  }
  if (s.partidos_jugados > 0 && s.goles / s.partidos_jugados >= 1.5) {
    out.push({
      id: "letal",
      label: "Letal",
      description: "1.5+ goles por partido",
      icon: Trophy,
      color: "text-mvp",
      bg: "bg-mvp/15 border-mvp/40",
    });
  }

  return out;
}

/** Detecta hat-trick por partido individual */
export function isHatTrick(goles: number): boolean {
  return goles >= 3;
}
