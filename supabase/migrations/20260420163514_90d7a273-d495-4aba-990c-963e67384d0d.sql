-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.match_status AS ENUM ('pendiente', 'jugado', 'cerrado');
CREATE TYPE public.team_side AS ENUM ('A', 'B');
CREATE TYPE public.vote_type AS ENUM ('mvp', 'goal');
CREATE TYPE public.player_position AS ENUM ('arquero', 'defensor', 'mediocampista', 'delantero');

-- ============================================================
-- PLAYERS
-- ============================================================
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  apodo TEXT,
  posicion player_position,
  foto_url TEXT,
  fecha_alta TIMESTAMPTZ NOT NULL DEFAULT now(),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MATCHES
-- ============================================================
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha TIMESTAMPTZ NOT NULL,
  equipo_a_score INT NOT NULL DEFAULT 0 CHECK (equipo_a_score >= 0),
  equipo_b_score INT NOT NULL DEFAULT 0 CHECK (equipo_b_score >= 0),
  mvp_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  gol_de_la_fecha_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  estado match_status NOT NULL DEFAULT 'pendiente',
  votacion_abre TIMESTAMPTZ,
  votacion_cierra TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_matches_fecha ON public.matches(fecha DESC);
CREATE INDEX idx_matches_estado ON public.matches(estado);

-- ============================================================
-- MATCH PLAYERS
-- ============================================================
CREATE TABLE public.match_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  equipo team_side NOT NULL,
  goles INT NOT NULL DEFAULT 0 CHECK (goles >= 0),
  asistencias INT NOT NULL DEFAULT 0 CHECK (asistencias >= 0),
  calificacion NUMERIC(3,1) CHECK (calificacion IS NULL OR (calificacion >= 1 AND calificacion <= 10)),
  presente BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, player_id)
);
CREATE INDEX idx_match_players_match ON public.match_players(match_id);
CREATE INDEX idx_match_players_player ON public.match_players(player_id);

-- ============================================================
-- GOAL EVENTS
-- ============================================================
CREATE TABLE public.goal_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  minuto INT,
  descripcion TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_goal_events_match ON public.goal_events(match_id);
CREATE INDEX idx_goal_events_player ON public.goal_events(player_id);

-- ============================================================
-- CONTRIBUTIONS (fondo común)
-- ============================================================
CREATE TABLE public.contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  monto NUMERIC(12,2) NOT NULL DEFAULT 1000,
  pagado BOOLEAN NOT NULL DEFAULT false,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, player_id)
);
CREATE INDEX idx_contributions_match ON public.contributions(match_id);

-- ============================================================
-- VOTES
-- ============================================================
CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  voter_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  voted_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  type vote_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (voter_player_id <> voted_player_id),
  UNIQUE (match_id, voter_player_id, type)
);
CREATE INDEX idx_votes_match_type ON public.votes(match_id, type);

-- ============================================================
-- TRIGGER updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_players_updated BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_matches_updated BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_match_players_updated BEFORE UPDATE ON public.match_players
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- VOTE VALIDATION TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m_estado match_status;
  m_abre TIMESTAMPTZ;
  m_cierra TIMESTAMPTZ;
  voter_played BOOLEAN;
  voted_played BOOLEAN;
BEGIN
  SELECT estado, votacion_abre, votacion_cierra
    INTO m_estado, m_abre, m_cierra
    FROM public.matches WHERE id = NEW.match_id;

  IF m_estado = 'cerrado' THEN
    RAISE EXCEPTION 'La votación de este partido ya está cerrada';
  END IF;

  IF m_abre IS NOT NULL AND now() < m_abre THEN
    RAISE EXCEPTION 'La votación aún no abrió';
  END IF;

  IF m_cierra IS NOT NULL AND now() > m_cierra THEN
    RAISE EXCEPTION 'La votación ya cerró';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.match_players
    WHERE match_id = NEW.match_id AND player_id = NEW.voter_player_id AND presente = true)
    INTO voter_played;
  IF NOT voter_played THEN
    RAISE EXCEPTION 'Solo pueden votar jugadores que participaron del partido';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.match_players
    WHERE match_id = NEW.match_id AND player_id = NEW.voted_player_id AND presente = true)
    INTO voted_played;
  IF NOT voted_played THEN
    RAISE EXCEPTION 'Solo se puede votar a jugadores que participaron del partido';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_vote BEFORE INSERT ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.validate_vote();

-- ============================================================
-- RANKINGS VIEW
-- Puntos: asistencia +1, gol +2, asistencia (pase) +1, MVP +5, Gol fecha +3
-- ============================================================
CREATE OR REPLACE VIEW public.rankings AS
SELECT
  p.id AS player_id,
  p.nombre,
  p.apodo,
  p.foto_url,
  COALESCE(SUM(CASE WHEN mp.presente THEN 1 ELSE 0 END), 0)::int AS partidos_jugados,
  COALESCE(SUM(mp.goles), 0)::int AS goles,
  COALESCE(SUM(mp.asistencias), 0)::int AS asistencias,
  COALESCE(mvp_counts.mvp_count, 0)::int AS mvp_count,
  COALESCE(gol_counts.gol_fecha_count, 0)::int AS gol_fecha_count,
  ROUND(AVG(mp.calificacion)::numeric, 2) AS promedio_calificacion,
  (
    COALESCE(SUM(CASE WHEN mp.presente THEN 1 ELSE 0 END), 0)
    + COALESCE(SUM(mp.goles), 0) * 2
    + COALESCE(SUM(mp.asistencias), 0) * 1
    + COALESCE(mvp_counts.mvp_count, 0) * 5
    + COALESCE(gol_counts.gol_fecha_count, 0) * 3
  )::int AS puntos
FROM public.players p
LEFT JOIN public.match_players mp ON mp.player_id = p.id
LEFT JOIN (
  SELECT mvp_player_id, COUNT(*) AS mvp_count
  FROM public.matches
  WHERE mvp_player_id IS NOT NULL AND estado = 'cerrado'
  GROUP BY mvp_player_id
) mvp_counts ON mvp_counts.mvp_player_id = p.id
LEFT JOIN (
  SELECT gol_de_la_fecha_player_id, COUNT(*) AS gol_fecha_count
  FROM public.matches
  WHERE gol_de_la_fecha_player_id IS NOT NULL AND estado = 'cerrado'
  GROUP BY gol_de_la_fecha_player_id
) gol_counts ON gol_counts.gol_de_la_fecha_player_id = p.id
WHERE p.activo = true
GROUP BY p.id, p.nombre, p.apodo, p.foto_url, mvp_counts.mvp_count, gol_counts.gol_fecha_count;

-- ============================================================
-- RLS – Modo abierto (sin login). Cualquiera puede leer/escribir.
-- ============================================================
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_all_players" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all_matches" ON public.matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all_match_players" ON public.match_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all_goal_events" ON public.goal_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all_contributions" ON public.contributions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all_votes" ON public.votes FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('player-photos', 'player-photos', true),
  ('goal-videos', 'goal-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_read_player_photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'player-photos');
CREATE POLICY "public_write_player_photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'player-photos');
CREATE POLICY "public_update_player_photos" ON storage.objects FOR UPDATE
  USING (bucket_id = 'player-photos');
CREATE POLICY "public_delete_player_photos" ON storage.objects FOR DELETE
  USING (bucket_id = 'player-photos');

CREATE POLICY "public_read_goal_videos" ON storage.objects FOR SELECT
  USING (bucket_id = 'goal-videos');
CREATE POLICY "public_write_goal_videos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'goal-videos');
CREATE POLICY "public_update_goal_videos" ON storage.objects FOR UPDATE
  USING (bucket_id = 'goal-videos');
CREATE POLICY "public_delete_goal_videos" ON storage.objects FOR DELETE
  USING (bucket_id = 'goal-videos');