-- ============================================================
-- CARGAR 15 PARTIDOS HISTÓRICOS
-- Correr en Supabase SQL Editor
-- Pechera = Equipo A, Sin pechera = Equipo B
-- ============================================================

-- Borrar el partido mal migrado si quedó (el "18 Abr" genérico)
DELETE FROM public.matches WHERE notas = 'Migrado desde panel-fyp';

-- Insertar los 15 partidos históricos
-- IMPORTANTE: mvp_player_id se deja NULL en los históricos porque los MVPs
-- ya están contados en player_historical_stats. Solo el 19/04 en adelante
-- contará MVPs desde matches.mvp_player_id.
INSERT INTO public.matches (fecha, equipo_a_score, equipo_b_score, mvp_player_id, estado, notas)
VALUES
  ('2026-01-05 21:00:00+00', 3,  0,  NULL, 'cerrado', 'Fecha 1 · MVP: Fran'),
  ('2026-01-12 21:00:00+00', 8,  12, NULL, 'cerrado', 'Fecha 2 · MVP: Kippes'),
  ('2026-01-18 21:00:00+00', 7,  4,  NULL, 'cerrado', 'Fecha 3 · MVP: Kippes'),
  ('2026-01-25 21:00:00+00', 8,  9,  NULL, 'cerrado', 'Fecha 4 · MVP: Peter'),
  ('2026-02-05 21:00:00+00', 14, 11, NULL, 'cerrado', 'Fecha 5 · MVP: Julio Metal'),
  ('2026-02-08 21:00:00+00', 7,  4,  NULL, 'cerrado', 'Fecha 6 · MVP: Vegui'),
  ('2026-02-10 21:00:00+00', 14, 7,  NULL, 'cerrado', 'Fecha 7 · MVP: Chinche'),
  ('2026-02-17 21:00:00+00', 5,  7,  NULL, 'cerrado', 'Fecha 8 · MVP: Culebra'),
  ('2026-02-22 21:00:00+00', 6,  5,  NULL, 'cerrado', 'Fecha 9 · MVP: Bylu'),
  ('2026-03-15 21:00:00+00', 12, 7,  NULL, 'cerrado', 'Fecha 10 · MVP: Faculo Airbag'),
  ('2026-03-22 21:00:00+00', 2,  6,  NULL, 'cerrado', 'Fecha 11 · MVP: Fran'),
  ('2026-03-29 21:00:00+00', 4,  10, NULL, 'cerrado', 'Fecha 12 · MVP: Chinche'),
  ('2026-04-05 21:00:00+00', 4,  5,  NULL, 'cerrado', 'Fecha 13 · MVP: Mosky'),
  ('2026-04-12 21:00:00+00', 7,  3,  NULL, 'cerrado', 'Fecha 14 · MVP: Fran'),
  ('2026-04-19 21:00:00+00', 5,  4,  NULL, 'cerrado', 'Fecha 15');

-- Verificar
SELECT COUNT(*) AS total_partidos FROM public.matches;
