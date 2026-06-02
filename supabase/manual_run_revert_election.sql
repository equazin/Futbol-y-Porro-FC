-- Run once in the Supabase SQL editor.
-- Adds revert_election_to_postulacion: admin-only RPC to undo an
-- accidental "abrir votacion". Deletes round-1 votes and moves the
-- election back to estado='postulacion'.

CREATE OR REPLACE FUNCTION public.revert_election_to_postulacion(p_election_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_election elections%ROWTYPE;
  v_deleted_votes integer;
  v_new_cierra timestamptz;
BEGIN
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'nicopbenitez84@gmail.com' THEN
    RETURN jsonb_build_object('status', 'unauthorized');
  END IF;

  SELECT * INTO v_election FROM elections WHERE id = p_election_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'election_not_found');
  END IF;

  IF v_election.estado <> 'votacion' THEN
    RETURN jsonb_build_object('status', 'not_in_voting_state');
  END IF;

  DELETE FROM election_votes
    WHERE election_id = p_election_id AND round = 1;
  GET DIAGNOSTICS v_deleted_votes = ROW_COUNT;

  v_new_cierra := GREATEST(
    COALESCE(v_election.postulacion_cierra, now()),
    now() + interval '24 hours'
  );

  UPDATE elections
    SET estado = 'postulacion',
        votacion_abre = NULL,
        votacion_cierra = NULL,
        ganador_id = NULL,
        postulacion_cierra = v_new_cierra
    WHERE id = p_election_id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'deleted_votes', v_deleted_votes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.revert_election_to_postulacion(uuid)
  TO authenticated;
