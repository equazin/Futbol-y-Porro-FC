-- Admin: get players who haven't voted yet in a given election round
CREATE OR REPLACE FUNCTION public.get_election_pending_voters(
  p_election_id uuid,
  p_round smallint DEFAULT 1
)
RETURNS TABLE(
  player_id uuid,
  nombre text,
  apodo text,
  foto_url text
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
    SELECT p.id, p.nombre, p.apodo, p.foto_url
    FROM players p
    JOIN player_identities pi ON pi.player_id = p.id
    WHERE p.activo = true
      AND NOT EXISTS (
        SELECT 1 FROM election_votes ev
        WHERE ev.election_id = p_election_id
          AND ev.round = p_round
          AND ev.voter_player_id = p.id
      )
    ORDER BY p.nombre;
END;
$$;
