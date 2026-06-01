-- Add vice-president and flyer support to candidates

ALTER TABLE public.candidates
  ADD COLUMN vice_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  ADD COLUMN flyer_url text;

-- Update register_candidate to accept optional vice DNI and flyer URL
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
  p_propuesta_foules text DEFAULT '',
  p_vice_dni text DEFAULT NULL,
  p_flyer_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dni_hash text;
  v_player_id uuid;
  v_vice_dni_hash text;
  v_vice_player_id uuid;
  v_election elections%ROWTYPE;
  v_candidate_id uuid;
BEGIN
  -- Validate and hash president DNI
  v_dni_hash := hash_dni(p_dni);
  IF v_dni_hash IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid_dni');
  END IF;

  -- Find president by DNI hash
  SELECT pi.player_id INTO v_player_id
  FROM player_identities pi
  WHERE pi.dni_hash = v_dni_hash;

  IF v_player_id IS NULL THEN
    RETURN jsonb_build_object('status', 'dni_not_found');
  END IF;

  -- If vice DNI provided, resolve it
  IF p_vice_dni IS NOT NULL AND trim(p_vice_dni) != '' THEN
    v_vice_dni_hash := hash_dni(p_vice_dni);
    IF v_vice_dni_hash IS NULL THEN
      RETURN jsonb_build_object('status', 'invalid_vice_dni');
    END IF;

    SELECT pi.player_id INTO v_vice_player_id
    FROM player_identities pi
    WHERE pi.dni_hash = v_vice_dni_hash;

    IF v_vice_player_id IS NULL THEN
      RETURN jsonb_build_object('status', 'vice_dni_not_found');
    END IF;

    IF v_vice_player_id = v_player_id THEN
      RETURN jsonb_build_object('status', 'vice_same_as_president');
    END IF;

    IF EXISTS (SELECT 1 FROM candidates WHERE election_id = p_election_id AND player_id = v_vice_player_id) THEN
      RETURN jsonb_build_object('status', 'vice_already_candidate');
    END IF;
  END IF;

  -- Load election
  SELECT * INTO v_election FROM elections WHERE id = p_election_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'election_not_found');
  END IF;

  IF v_election.estado != 'postulacion' THEN
    RETURN jsonb_build_object('status', 'postulacion_closed');
  END IF;

  IF now() < v_election.postulacion_abre OR now() > v_election.postulacion_cierra THEN
    RETURN jsonb_build_object('status', 'window_closed');
  END IF;

  IF EXISTS (SELECT 1 FROM candidates WHERE election_id = p_election_id AND player_id = v_player_id) THEN
    RETURN jsonb_build_object('status', 'already_registered');
  END IF;

  IF trim(p_partido) = '' THEN
    RETURN jsonb_build_object('status', 'missing_partido');
  END IF;

  INSERT INTO candidates (
    election_id, player_id, vice_player_id, partido_politico, flyer_url,
    propuesta_organizacion, propuesta_votacion_premios, propuesta_economia,
    propuesta_convivencia, propuesta_tercer_tiempo, propuesta_infraestructura,
    propuesta_constitucion,
    propuesta_domingos, propuesta_ausencias, propuesta_equipos,
    propuesta_presupuesto, propuesta_convivencia2, propuesta_foules
  ) VALUES (
    p_election_id, v_player_id, v_vice_player_id, trim(p_partido), p_flyer_url,
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

-- Function to update flyer after candidate registration (admin or self)
CREATE OR REPLACE FUNCTION public.update_candidate_flyer(
  p_candidate_id uuid,
  p_dni text,
  p_flyer_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dni_hash text;
  v_player_id uuid;
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

  -- Only the president (player_id) of the candidacy can update
  IF NOT EXISTS (SELECT 1 FROM candidates WHERE id = p_candidate_id AND player_id = v_player_id) THEN
    RETURN jsonb_build_object('status', 'unauthorized');
  END IF;

  UPDATE candidates SET flyer_url = p_flyer_url WHERE id = p_candidate_id;

  RETURN jsonb_build_object('status', 'ok');
END;
$$;
