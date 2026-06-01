-- Admin tools for election management

-- ─────────────────────────────────────────────────────────────────────────────
-- Function: delete_election (admin only)
-- Deletes an election and all related candidates/votes (CASCADE handles it)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_election(p_election_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'nicopbenitez84@gmail.com' THEN
    RETURN jsonb_build_object('status', 'unauthorized');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM elections WHERE id = p_election_id) THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  DELETE FROM elections WHERE id = p_election_id;

  RETURN jsonb_build_object('status', 'ok');
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Function: get_election_votes_admin (admin only)
-- Returns vote counts per candidate per round — no individual voter data exposed
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_election_votes_admin(p_election_id uuid)
RETURNS TABLE(
  candidate_id uuid,
  round smallint,
  votos bigint
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
    SELECT ev.candidate_id, ev.round, COUNT(*)::bigint AS votos
    FROM election_votes ev
    WHERE ev.election_id = p_election_id
    GROUP BY ev.candidate_id, ev.round
    ORDER BY ev.round, votos DESC;
END;
$$;
