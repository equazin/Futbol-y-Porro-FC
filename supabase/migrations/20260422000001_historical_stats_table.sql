-- ============================================================
-- ESTADÍSTICAS HISTÓRICAS POR JUGADOR
-- Acumula PJ, PG, MVP, GF de temporadas previas al sistema digital
-- El ranking suma estos valores a los calculados desde match_players
-- ============================================================

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

CREATE POLICY open_all_historical_stats ON public.player_historical_stats
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_historical_stats_player ON public.player_historical_stats(player_id);

-- ============================================================
-- Poblar con datos de la planilla oficial al 19/04/2026
-- ============================================================
INSERT INTO public.player_historical_stats (player_id, pj, pg, mvp, gf)
SELECT p.id, v.pj, v.pg, v.mvp, v.gf
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
  ('nacho suri ind',  3, 0, 0, 0)
) AS v(apodo_lower, pj, pg, mvp, gf)
JOIN public.players p
  ON LOWER(COALESCE(p.apodo, p.nombre)) = v.apodo_lower
 AND p.tipo = 'titular'
ON CONFLICT (player_id) DO UPDATE
  SET pj = EXCLUDED.pj,
      pg = EXCLUDED.pg,
      mvp = EXCLUDED.mvp,
      gf = EXCLUDED.gf,
      updated_at = now();
