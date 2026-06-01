-- Admin: delete a single candidate and their votes
CREATE OR REPLACE FUNCTION public.delete_candidate(p_candidate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'nicopbenitez84@gmail.com' THEN
    RETURN jsonb_build_object('status', 'unauthorized');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM candidates WHERE id = p_candidate_id) THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  DELETE FROM election_votes WHERE candidate_id = p_candidate_id;
  DELETE FROM candidates WHERE id = p_candidate_id;

  RETURN jsonb_build_object('status', 'ok');
END;
$$;
