-- Election system for club president voting

-- Enum for election states
CREATE TYPE election_status AS ENUM ('postulacion', 'votacion', 'segunda_vuelta', 'cerrada');

-- Main elections table
CREATE TABLE public.elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  estado election_status NOT NULL DEFAULT 'postulacion',
  postulacion_abre timestamptz NOT NULL,
  postulacion_cierra timestamptz NOT NULL,
  votacion_abre timestamptz,
  votacion_cierra timestamptz,
  ganador_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Candidates table
CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  partido_politico text NOT NULL,
  -- Categorías de propuestas (7 temáticas)
  propuesta_organizacion text NOT NULL DEFAULT '',      -- ⚽ Organización de los partidos
  propuesta_votacion_premios text NOT NULL DEFAULT '',  -- 🏆 Sistema de votación / premios
  propuesta_economia text NOT NULL DEFAULT '',          -- 💰 Economía del club
  propuesta_convivencia text NOT NULL DEFAULT '',       -- 🌿 Código de convivencia
  propuesta_tercer_tiempo text NOT NULL DEFAULT '',     -- 🥩 El "tercer tiempo"
  propuesta_infraestructura text NOT NULL DEFAULT '',   -- 🏟️ Infraestructura del grupo
  propuesta_constitucion text NOT NULL DEFAULT '',      -- 📜 Constitución del club
  -- Preguntas específicas (6)
  propuesta_domingos text NOT NULL DEFAULT '',          -- ¿Cómo mejorarías los domingos?
  propuesta_ausencias text NOT NULL DEFAULT '',         -- ¿Qué harías con los que faltan mucho?
  propuesta_equipos text NOT NULL DEFAULT '',           -- ¿Cómo evitarías equipos disparejos?
  propuesta_presupuesto text NOT NULL DEFAULT '',       -- ¿Qué harías con el presupuesto del grupo?
  propuesta_convivencia2 text NOT NULL DEFAULT '',      -- ¿Cómo mejorarías la convivencia? (específico)
  propuesta_foules text NOT NULL DEFAULT '',            -- ¿Cuál sería tu política frente a los foules?
  eliminado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(election_id, player_id)
);

-- Add FK from elections to candidates (after candidates table exists)
ALTER TABLE public.elections
  ADD CONSTRAINT elections_ganador_id_fkey
  FOREIGN KEY (ganador_id) REFERENCES public.candidates(id);

-- Election votes table (anonymous: only stores dni_hash, never player_id)
CREATE TABLE public.election_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  voter_dni_hash text NOT NULL,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  round smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(election_id, voter_dni_hash, round)
);

-- RLS
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_votes ENABLE ROW LEVEL SECURITY;

-- elections: public read
CREATE POLICY "elections_public_read" ON public.elections
  FOR SELECT USING (true);

-- candidates: public read
CREATE POLICY "candidates_public_read" ON public.candidates
  FOR SELECT USING (true);

-- election_votes: no direct read (only via aggregation functions)
-- insert handled via security definer functions only

-- ─────────────────────────────────────────────────────────────────────────────
-- Function: register_candidate
-- Allows any player with a registered DNI to run for president during postulacion phase
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.register_candidate(
  p_election_id uuid,
  p_dni text,
  p_partido text,
  p_propuesta_organizacion text DEFAULT '',
  p_propuesta_votacion_premios text DEFAULT '',
  p_propuesta_economia text DEFAULT '',
  p_propuesta_convivencia text DEFAULT '',
  p_propuesta_tercer_tiempo text DEFAULT '',
  p_propuesta_infraestructura text DEFAULT '',
  p_propuesta_constitucion text DEFAULT '',
  p_propuesta_domingos text DEFAULT '',
  p_propuesta_ausencias text DEFAULT '',
  p_propuesta_equipos text DEFAULT '',
  p_propuesta_presupuesto text DEFAULT '',
  p_propuesta_convivencia2 text DEFAULT '',
  p_propuesta_foules text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dni_hash text;
  v_player_id uuid;
  v_election elections%ROWTYPE;
  v_candidate_id uuid;
BEGIN
  -- Validate and hash DNI
  v_dni_hash := hash_dni(p_dni);
  IF v_dni_hash IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid_dni');
  END IF;

  -- Find player by DNI hash
  SELECT pi.player_id INTO v_player_id
  FROM player_identities pi
  WHERE pi.dni_hash = v_dni_hash;

  IF v_player_id IS NULL THEN
    RETURN jsonb_build_object('status', 'dni_not_found');
  END IF;

  -- Load election
  SELECT * INTO v_election FROM elections WHERE id = p_election_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'election_not_found');
  END IF;

  -- Check state
  IF v_election.estado != 'postulacion' THEN
    RETURN jsonb_build_object('status', 'postulacion_closed');
  END IF;

  -- Check window
  IF now() < v_election.postulacion_abre OR now() > v_election.postulacion_cierra THEN
    RETURN jsonb_build_object('status', 'window_closed');
  END IF;

  -- Check not already registered
  IF EXISTS (SELECT 1 FROM candidates WHERE election_id = p_election_id AND player_id = v_player_id) THEN
    RETURN jsonb_build_object('status', 'already_registered');
  END IF;

  -- Validate partido name
  IF trim(p_partido) = '' THEN
    RETURN jsonb_build_object('status', 'missing_partido');
  END IF;

  -- Insert candidate
  INSERT INTO candidates (
    election_id, player_id, partido_politico,
    propuesta_organizacion, propuesta_votacion_premios, propuesta_economia,
    propuesta_convivencia, propuesta_tercer_tiempo, propuesta_infraestructura,
    propuesta_constitucion,
    propuesta_domingos, propuesta_ausencias, propuesta_equipos,
    propuesta_presupuesto, propuesta_convivencia2, propuesta_foules
  ) VALUES (
    p_election_id, v_player_id, trim(p_partido),
    p_propuesta_organizacion, p_propuesta_votacion_premios, p_propuesta_economia,
    p_propuesta_convivencia, p_propuesta_tercer_tiempo, p_propuesta_infraestructura,
    p_propuesta_constitucion,
    p_propuesta_domingos, p_propuesta_ausencias, p_propuesta_equipos,
    p_propuesta_presupuesto, p_propuesta_convivencia2, p_propuesta_foules
  )
  RETURNING id INTO v_candidate_id;

  RETURN jsonb_build_object('status', 'ok', 'candidate_id', v_candidate_id);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Function: cast_election_vote
-- Anonymous vote: only stores voter_dni_hash, never player_id
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cast_election_vote(
  p_election_id uuid,
  p_dni text,
  p_candidate_id uuid,
  p_round smallint DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dni_hash text;
  v_election elections%ROWTYPE;
  v_candidate candidates%ROWTYPE;
BEGIN
  -- Hash DNI (never stored raw)
  v_dni_hash := hash_dni(p_dni);
  IF v_dni_hash IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid_dni');
  END IF;

  -- Verify DNI is registered
  IF NOT EXISTS (SELECT 1 FROM player_identities WHERE dni_hash = v_dni_hash) THEN
    RETURN jsonb_build_object('status', 'dni_not_found');
  END IF;

  -- Load election
  SELECT * INTO v_election FROM elections WHERE id = p_election_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'election_not_found');
  END IF;

  -- Check state
  IF v_election.estado NOT IN ('votacion', 'segunda_vuelta') THEN
    RETURN jsonb_build_object('status', 'voting_not_open');
  END IF;

  -- Check voting window
  IF now() < v_election.votacion_abre OR now() > v_election.votacion_cierra THEN
    RETURN jsonb_build_object('status', 'window_closed');
  END IF;

  -- Load candidate
  SELECT * INTO v_candidate FROM candidates WHERE id = p_candidate_id AND election_id = p_election_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'candidate_not_found');
  END IF;

  -- Check candidate not eliminated
  IF v_candidate.eliminado THEN
    RETURN jsonb_build_object('status', 'candidate_eliminated');
  END IF;

  -- Check not already voted in this round
  IF EXISTS (
    SELECT 1 FROM election_votes
    WHERE election_id = p_election_id AND voter_dni_hash = v_dni_hash AND round = p_round
  ) THEN
    RETURN jsonb_build_object('status', 'already_voted');
  END IF;

  -- Insert anonymous vote
  INSERT INTO election_votes (election_id, voter_dni_hash, candidate_id, round)
  VALUES (p_election_id, v_dni_hash, p_candidate_id, p_round);

  RETURN jsonb_build_object('status', 'ok');
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Function: get_election_vote_counts
-- Returns vote counts per candidate for a given election and round
-- (public aggregation, no individual votes exposed)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_election_vote_counts(
  p_election_id uuid,
  p_round smallint DEFAULT 1
)
RETURNS TABLE(candidate_id uuid, votos bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ev.candidate_id, COUNT(*) AS votos
  FROM election_votes ev
  WHERE ev.election_id = p_election_id AND ev.round = p_round
  GROUP BY ev.candidate_id;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Function: check_has_voted_election
-- Returns whether a DNI has already voted in a given election/round
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_has_voted_election(
  p_election_id uuid,
  p_dni text,
  p_round smallint DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dni_hash text;
BEGIN
  v_dni_hash := hash_dni(p_dni);
  IF v_dni_hash IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM election_votes
    WHERE election_id = p_election_id
      AND voter_dni_hash = v_dni_hash
      AND round = p_round
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Function: close_election_voting (admin only)
-- Applies paso argentino logic and determines winner
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.close_election_voting(p_election_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_election elections%ROWTYPE;
  v_current_round smallint;
  v_top1_votes bigint;
  v_top2_votes bigint;
  v_winner_id uuid;
BEGIN
  -- Admin check
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'nicopbenitez84@gmail.com' THEN
    RETURN jsonb_build_object('status', 'unauthorized');
  END IF;

  SELECT * INTO v_election FROM elections WHERE id = p_election_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'election_not_found');
  END IF;

  IF v_election.estado NOT IN ('votacion', 'segunda_vuelta') THEN
    RETURN jsonb_build_object('status', 'not_in_voting_state');
  END IF;

  v_current_round := CASE WHEN v_election.estado = 'segunda_vuelta' THEN 2 ELSE 1 END;

  -- Get top 2 vote counts using a CTE (no temp tables)
  SELECT
    MAX(CASE WHEN rn = 1 THEN votos END),
    MAX(CASE WHEN rn = 2 THEN votos END)
  INTO v_top1_votes, v_top2_votes
  FROM (
    SELECT
      COALESCE(ev.votos, 0) AS votos,
      ROW_NUMBER() OVER (ORDER BY COALESCE(ev.votos, 0) DESC) AS rn
    FROM candidates c
    LEFT JOIN (
      SELECT candidate_id, COUNT(*) AS votos
      FROM election_votes
      WHERE election_id = p_election_id AND round = v_current_round
      GROUP BY candidate_id
    ) ev ON ev.candidate_id = c.id
    WHERE c.election_id = p_election_id AND NOT c.eliminado
  ) ranked
  WHERE rn <= 2;

  -- Get winner candidate id (most votes)
  SELECT c.id INTO v_winner_id
  FROM candidates c
  LEFT JOIN (
    SELECT candidate_id, COUNT(*) AS votos
    FROM election_votes
    WHERE election_id = p_election_id AND round = v_current_round
    GROUP BY candidate_id
  ) ev ON ev.candidate_id = c.id
  WHERE c.election_id = p_election_id AND NOT c.eliminado
  ORDER BY COALESCE(ev.votos, 0) DESC
  LIMIT 1;

  -- If segunda_vuelta OR only 1 candidate OR 3+ vote lead → close
  IF v_election.estado = 'segunda_vuelta'
     OR (v_top2_votes IS NULL)
     OR (v_top1_votes - COALESCE(v_top2_votes, 0) >= 3)
  THEN
    UPDATE elections
      SET estado = 'cerrada', ganador_id = v_winner_id
      WHERE id = p_election_id;
    RETURN jsonb_build_object('status', 'closed', 'winner_id', v_winner_id);
  END IF;

  -- Paso argentino: keep top 3, eliminate the rest, open segunda_vuelta
  UPDATE candidates
    SET eliminado = true
    WHERE election_id = p_election_id
      AND NOT eliminado
      AND id NOT IN (
        SELECT c.id
        FROM candidates c
        LEFT JOIN (
          SELECT candidate_id, COUNT(*) AS votos
          FROM election_votes
          WHERE election_id = p_election_id AND round = v_current_round
          GROUP BY candidate_id
        ) ev ON ev.candidate_id = c.id
        WHERE c.election_id = p_election_id AND NOT c.eliminado
        ORDER BY COALESCE(ev.votos, 0) DESC
        LIMIT 3
      );

  UPDATE elections
    SET estado = 'segunda_vuelta',
        votacion_abre = now(),
        votacion_cierra = now() + interval '24 hours'
    WHERE id = p_election_id;

  RETURN jsonb_build_object('status', 'segunda_vuelta');
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Function: open_election_voting (admin only)
-- Transitions from postulacion → votacion
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.open_election_voting(
  p_election_id uuid,
  p_votacion_cierra timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cierra timestamptz;
BEGIN
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'nicopbenitez84@gmail.com' THEN
    RETURN jsonb_build_object('status', 'unauthorized');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM elections WHERE id = p_election_id AND estado = 'postulacion') THEN
    RETURN jsonb_build_object('status', 'not_in_postulacion_state');
  END IF;

  v_cierra := COALESCE(p_votacion_cierra, now() + interval '48 hours');

  UPDATE elections
    SET estado = 'votacion',
        votacion_abre = now(),
        votacion_cierra = v_cierra
    WHERE id = p_election_id;

  RETURN jsonb_build_object('status', 'ok');
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Function: create_election (admin only)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_election(
  p_titulo text,
  p_postulacion_abre timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'nicopbenitez84@gmail.com' THEN
    RETURN jsonb_build_object('status', 'unauthorized');
  END IF;

  INSERT INTO elections (titulo, postulacion_abre, postulacion_cierra)
  VALUES (trim(p_titulo), p_postulacion_abre, p_postulacion_abre + interval '24 hours')
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('status', 'ok', 'election_id', v_id);
END;
$$;
