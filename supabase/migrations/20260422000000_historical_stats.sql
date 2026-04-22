-- ============================================================
-- LIMPIEZA DE DATOS HISTÓRICOS MAL CARGADOS
-- Elimina partidos/match_players/contributions anteriores al 19/04/2026
-- Las estadísticas históricas se cargan en player_historical_stats (migration 000001)
-- ============================================================

-- Limpiar datos históricos incorrectos anteriores a la fecha de inicio digital
DELETE FROM public.match_players
WHERE match_id IN (
  SELECT id FROM public.matches
  WHERE fecha < '2026-04-19'
);

DELETE FROM public.contributions
WHERE match_id IN (
  SELECT id FROM public.matches
  WHERE fecha < '2026-04-19'
);

DELETE FROM public.matches
WHERE fecha < '2026-04-19';

-- ============================================================
-- Bonuses extra que no entran en la fórmula estándar
-- (diferencias entre pts esperados y fórmula PJ×30+PG×20+MVP×50+GF×20)
-- Fran: esperado 760, fórmula da 740 → +20
-- Kippes: esperado 670, fórmula da 630 → +40
-- Peter: esperado 440, fórmula da 420 → +20
-- Julio Metal: esperado 300, fórmula da 280 → +20
-- ============================================================
DELETE FROM public.player_bonuses
WHERE motivo = 'Bonus histórico extra';

INSERT INTO public.player_bonuses (player_id, motivo, puntos, fecha)
SELECT p.id, 'Bonus histórico extra', v.bonus, '2026-04-18 23:59:59+00'
FROM (VALUES
  ('fran',        20),
  ('kippes',      40),
  ('peter',       20),
  ('julio metal', 20)
) AS v(apodo_lower, bonus)
JOIN public.players p
  ON LOWER(COALESCE(p.apodo, p.nombre)) = v.apodo_lower
 AND p.tipo = 'titular';
