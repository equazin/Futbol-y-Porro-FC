-- ============================================================
-- ACTUALIZAR ELO HISTÓRICO DE JUGADORES
-- Fórmula: 1000 + PG×40 - Derrotas×40 + MVP×15 + GF×10
-- Correr en Supabase SQL Editor
-- ============================================================

UPDATE public.players SET elo = v.elo
FROM (VALUES
  ('fran',           1075),
  ('chinche',        1050),
  ('kippes',          880),
  ('vegui',           1045),
  ('nuno',            800),
  ('peter',          1055),
  ('topa',            880),
  ('mosky',           895),
  ('faculo airbag',  1005),
  ('bylu',            855),
  ('bini',            900),
  ('julio metal',     815),
  ('culebra',         945),
  ('dj manzon',       840),
  ('tincho',          880),
  ('turro',           680),
  ('demencia',       1000),
  ('cinema',          840),
  ('pana hija',       840),
  ('jony sucio',      960),
  ('valencia',        960),
  ('isleño',          880),
  ('isleno',          880),
  ('pibito',          880),
  ('nacho suri ind',  880)
) AS v(apodo_lower, elo)
WHERE LOWER(COALESCE(players.apodo, players.nombre)) = v.apodo_lower
   OR LOWER(players.nombre) = v.apodo_lower;

-- Verificar
SELECT apodo, nombre, elo FROM public.players ORDER BY elo DESC;
