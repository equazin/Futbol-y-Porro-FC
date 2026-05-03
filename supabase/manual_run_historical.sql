-- ============================================================
-- CORRER ESTO EN SUPABASE SQL EDITOR (una sola vez)
-- Carga estadísticas históricas y limpia datos mal cargados
-- ============================================================

-- 1. CREAR TABLA (si no existe)
CREATE TABLE IF NOT EXISTS public.player_historical_stats (
  player_id UUID PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  pj INTEGER NOT NULL DEFAULT 0,
  pg INTEGER NOT NULL DEFAULT 0,
  mvp INTEGER NOT NULL DEFAULT 0,
  gf INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.player_historical_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'player_historical_stats'
      AND policyname = 'open_all_historical_stats'
  ) THEN
    CREATE POLICY open_all_historical_stats ON public.player_historical_stats
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. LIMPIAR datos históricos mal cargados (match_players vacíos, contributions solo Bini)
DELETE FROM public.match_players
WHERE match_id IN (
  SELECT id FROM public.matches WHERE fecha < '2026-04-19'
);

DELETE FROM public.contributions
WHERE match_id IN (
  SELECT id FROM public.matches WHERE fecha < '2026-04-19'
);

DELETE FROM public.matches
WHERE fecha < '2026-04-19';

-- 3. CARGAR estadísticas históricas por jugador (planilla al 19/04/2026)
INSERT INTO public.player_historical_stats (player_id, pj, pg, mvp, gf)
SELECT DISTINCT ON (p.id) p.id, v.pj, v.pg, v.mvp, v.gf
FROM (VALUES
  ('fran',           15, 7, 3, 0),
  ('chinche',        14, 7, 2, 2),
  ('kippes',         15, 3, 2, 1),
  ('vegui',          13, 4, 1, 3),
  ('nuno',           15, 5, 0, 0),
  ('peter',           9, 5, 1, 0),
  ('topa',           11, 4, 0, 0),
  ('mosky',           9, 3, 1, 0),
  ('faculo airbag',   7, 4, 1, 1),
  ('bylu',            8, 2, 1, 0),
  ('bini',            9, 2, 0, 0),
  ('julio metal',     7, 1, 1, 0),
  ('culebra',         6, 2, 1, 1),
  ('dj manzon',       8, 2, 0, 0),
  ('tincho',          7, 2, 0, 0),
  ('turro',           8, 0, 0, 0),
  ('demencia',        6, 3, 0, 0),
  ('cinema',          4, 0, 0, 0),
  ('pana hija',       4, 0, 0, 0),
  ('jony sucio',      3, 1, 0, 0),
  ('valencia',        3, 1, 0, 0),
  ('isleño',          3, 0, 0, 0),
  ('isleno',          3, 0, 0, 0),
  ('pibito',          3, 0, 0, 0),
  ('nacho suri ind',  3, 0, 0, 0)
) AS v(apodo_lower, pj, pg, mvp, gf)
JOIN public.players p
  ON LOWER(COALESCE(p.apodo, p.nombre)) = v.apodo_lower
  OR LOWER(p.nombre) = v.apodo_lower
ON CONFLICT (player_id) DO UPDATE
  SET pj = EXCLUDED.pj,
      pg = EXCLUDED.pg,
      mvp = EXCLUDED.mvp,
      gf = EXCLUDED.gf,
      updated_at = now();

-- 4. BONUSES EXTRA (diferencias que no cuadran con la fórmula)
DELETE FROM public.player_bonuses
WHERE motivo = 'Bonus histórico extra';

INSERT INTO public.player_bonuses (player_id, motivo, puntos, fecha)
SELECT DISTINCT ON (p.id) p.id, 'Bonus histórico extra', v.bonus, '2026-04-18 23:59:59+00'
FROM (VALUES
  ('fran',        20),
  ('kippes',      40),
  ('peter',       20),
  ('julio metal', 20)
) AS v(apodo_lower, bonus)
JOIN public.players p
  ON LOWER(COALESCE(p.apodo, p.nombre)) = v.apodo_lower
  OR LOWER(p.nombre) = v.apodo_lower;

-- 5. VERIFICAR cuántos jugadores se cargaron
SELECT p.apodo, p.nombre, h.pj, h.pg, h.mvp, h.gf,
       h.pj*30 + h.pg*20 + h.mvp*50 + h.gf*20 AS pts_formula
FROM public.player_historical_stats h
JOIN public.players p ON p.id = h.player_id
ORDER BY pts_formula DESC;
