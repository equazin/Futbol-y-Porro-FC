-- 1) ELO en players
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS elo NUMERIC NOT NULL DEFAULT 1000;

-- 2) Tabla de multas
CREATE TABLE IF NOT EXISTS public.fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  match_id UUID,
  motivo TEXT NOT NULL,
  monto NUMERIC NOT NULL DEFAULT 500,
  pagada BOOLEAN NOT NULL DEFAULT false,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fines_player ON public.fines(player_id);
CREATE INDEX IF NOT EXISTS idx_fines_match ON public.fines(match_id);

ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS open_all_fines ON public.fines;
CREATE POLICY open_all_fines ON public.fines FOR ALL USING (true) WITH CHECK (true);

-- 3) Vista rankings extendida (drop + recreate, mantiene el mismo nombre)
DROP VIEW IF EXISTS public.rankings;

CREATE VIEW public.rankings AS
WITH stats AS (
  SELECT
    p.id AS player_id,
    p.nombre,
    p.apodo,
    p.foto_url,
    p.elo,
    COUNT(DISTINCT mp.match_id) FILTER (WHERE m.estado = 'cerrado' AND mp.presente) AS partidos_jugados,
    COALESCE(SUM(mp.goles) FILTER (WHERE m.estado = 'cerrado'), 0)::int AS goles,
    COALESCE(SUM(mp.asistencias) FILTER (WHERE m.estado = 'cerrado'), 0)::int AS asistencias,
    AVG(mp.calificacion) FILTER (WHERE m.estado = 'cerrado') AS promedio_calificacion
  FROM public.players p
  LEFT JOIN public.match_players mp ON mp.player_id = p.id
  LEFT JOIN public.matches m ON m.id = mp.match_id
  GROUP BY p.id
),
mvp_counts AS (
  SELECT mvp_player_id AS player_id, COUNT(*)::int AS mvp_count
  FROM public.matches WHERE estado = 'cerrado' AND mvp_player_id IS NOT NULL
  GROUP BY mvp_player_id
),
gol_counts AS (
  SELECT gol_de_la_fecha_player_id AS player_id, COUNT(*)::int AS gol_fecha_count
  FROM public.matches WHERE estado = 'cerrado' AND gol_de_la_fecha_player_id IS NOT NULL
  GROUP BY gol_de_la_fecha_player_id
),
fine_balance AS (
  SELECT player_id,
    COALESCE(SUM(monto) FILTER (WHERE NOT pagada), 0)::numeric AS multas_pendientes
  FROM public.fines GROUP BY player_id
)
SELECT
  s.player_id,
  s.nombre,
  s.apodo,
  s.foto_url,
  s.elo,
  s.partidos_jugados,
  s.goles,
  s.asistencias,
  COALESCE(mc.mvp_count, 0) AS mvp_count,
  COALESCE(gc.gol_fecha_count, 0) AS gol_fecha_count,
  s.promedio_calificacion,
  COALESCE(fb.multas_pendientes, 0) AS multas_pendientes,
  -- Puntos del ranking: asistencia +1, gol +2, asist +1, MVP +5, gol-fecha +3
  (s.partidos_jugados * 1
   + s.goles * 2
   + s.asistencias * 1
   + COALESCE(mc.mvp_count, 0) * 5
   + COALESCE(gc.gol_fecha_count, 0) * 3)::int AS puntos
FROM stats s
LEFT JOIN mvp_counts mc ON mc.player_id = s.player_id
LEFT JOIN gol_counts gc ON gc.player_id = s.player_id
LEFT JOIN fine_balance fb ON fb.player_id = s.player_id;

-- 4) Storage policies para player-photos (modo abierto)
DROP POLICY IF EXISTS "player_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "player_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "player_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "player_photos_delete" ON storage.objects;

CREATE POLICY "player_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'player-photos');
CREATE POLICY "player_photos_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'player-photos');
CREATE POLICY "player_photos_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'player-photos');
CREATE POLICY "player_photos_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'player-photos');

-- Mismo set para goal-videos
DROP POLICY IF EXISTS "goal_videos_select" ON storage.objects;
DROP POLICY IF EXISTS "goal_videos_insert" ON storage.objects;
DROP POLICY IF EXISTS "goal_videos_update" ON storage.objects;
DROP POLICY IF EXISTS "goal_videos_delete" ON storage.objects;

CREATE POLICY "goal_videos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'goal-videos');
CREATE POLICY "goal_videos_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'goal-videos');
CREATE POLICY "goal_videos_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'goal-videos');
CREATE POLICY "goal_videos_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'goal-videos');