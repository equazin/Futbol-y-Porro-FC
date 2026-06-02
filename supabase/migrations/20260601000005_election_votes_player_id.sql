-- Add voter_player_id to election_votes for admin visibility
-- The column is nullable so existing anonymous votes are preserved.
ALTER TABLE public.election_votes
  ADD COLUMN voter_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL;

-- Update cast_election_vote to also store voter_player_id
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
  v_player_id uuid;
  v_election elections%ROWTYPE;
BEGIN
  v_dni_hash := hash_dni(p_dni);
  IF v_dni_hash IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid_dni');
  END IF;

  SELECT pi.player_id INTO v_player_id
  FROM player_identities pi
  WHERE pi.dni_hash = v_dni_hash;

  IF v_player_id IS NULL THEN
    RETURN jsonb_build_object('status', 'dni_not_found');
  END IF;

  SELECT * INTO v_election FROM elections WHERE id = p_election_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'election_not_found');
  END IF;

  IF v_election.estado NOT IN ('votacion', 'segunda_vuelta') THEN
    RETURN jsonb_build_object('status', 'voting_not_open');
  END IF;

  IF v_election.votacion_cierra IS NOT NULL AND now() > v_election.votacion_cierra THEN
    RETURN jsonb_build_object('status', 'window_closed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM candidates WHERE id = p_candidate_id AND election_id = p_election_id) THEN
    RETURN jsonb_build_object('status', 'candidate_not_found');
  END IF;

  IF EXISTS (SELECT 1 FROM candidates WHERE id = p_candidate_id AND eliminado = true) THEN
    RETURN jsonb_build_object('status', 'candidate_eliminated');
  END IF;

  IF EXISTS (
    SELECT 1 FROM election_votes
    WHERE election_id = p_election_id AND voter_dni_hash = v_dni_hash AND round = p_round
  ) THEN
    RETURN jsonb_build_object('status', 'already_voted');
  END IF;

  INSERT INTO election_votes (election_id, voter_dni_hash, voter_player_id, candidate_id, round)
  VALUES (p_election_id, v_dni_hash, v_player_id, p_candidate_id, p_round);

  RETURN jsonb_build_object('status', 'ok');
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Function: get_election_votes_detail (admin only)
-- Returns each vote with voter player info and candidate info
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_election_votes_detail(p_election_id uuid)
RETURNS TABLE(
  vote_id uuid,
  round smallint,
  candidate_id uuid,
  candidate_partido text,
  voter_player_id uuid,
  voter_nombre text,
  voter_apodo text,
  voted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'nicopbenitez84@gmail.com' THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      ev.id,
      ev.round,
      ev.candidate_id,
      c.partido_politico,
      ev.voter_player_id,
      p.nombre,
      p.apodo,
      ev.created_at
    FROM election_votes ev
    JOIN candidates c ON c.id = ev.candidate_id
    LEFT JOIN players p ON p.id = ev.voter_player_id
    WHERE ev.election_id = p_election_id
    ORDER BY ev.round, ev.created_at DESC;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Function: nullify_election_vote (admin only)
-- Deletes a specific vote by vote_id
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.nullify_election_vote(p_vote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'nicopbenitez84@gmail.com' THEN
    RETURN jsonb_build_object('status', 'unauthorized');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM election_votes WHERE id = p_vote_id) THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  DELETE FROM election_votes WHERE id = p_vote_id;

  RETURN jsonb_build_object('status', 'ok');
END;
$$;
