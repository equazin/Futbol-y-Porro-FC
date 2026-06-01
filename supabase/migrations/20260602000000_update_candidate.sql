-- Allow the president OR the vice of a candidacy to edit
-- partido_politico and the 13 propuesta fields while postulaciones
-- are still open. Vice and flyer are NOT editable through this RPC.

CREATE OR REPLACE FUNCTION public.update_candidate_by_dni(
  p_candidate_id uuid,
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
  v_candidate candidates%ROWTYPE;
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

  SELECT * INTO v_candidate FROM candidates WHERE id = p_candidate_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Authorize: must be the president OR the vice of THIS candidacy
  IF v_candidate.player_id <> v_player_id
     AND COALESCE(v_candidate.vice_player_id, '00000000-0000-0000-0000-000000000000'::uuid) <> v_player_id THEN
    RETURN jsonb_build_object('status', 'unauthorized');
  END IF;

  SELECT * INTO v_election FROM elections WHERE id = v_candidate.election_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'election_not_found');
  END IF;

  IF v_election.estado <> 'postulacion' THEN
    RETURN jsonb_build_object('status', 'postulacion_closed');
  END IF;

  IF trim(p_partido) = '' THEN
    RETURN jsonb_build_object('status', 'missing_partido');
  END IF;

  UPDATE candidates SET
    partido_politico = trim(p_partido),
    propuesta_organizacion = p_propuesta_organizacion,
    propuesta_votacion_premios = p_propuesta_votacion_premios,
    propuesta_economia = p_propuesta_economia,
    propuesta_convivencia = p_propuesta_convivencia,
    propuesta_tercer_tiempo = p_propuesta_tercer_tiempo,
    propuesta_infraestructura = p_propuesta_infraestructura,
    propuesta_constitucion = p_propuesta_constitucion,
    propuesta_domingos = p_propuesta_domingos,
    propuesta_ausencias = p_propuesta_ausencias,
    propuesta_equipos = p_propuesta_equipos,
    propuesta_presupuesto = p_propuesta_presupuesto,
    propuesta_convivencia2 = p_propuesta_convivencia2,
    propuesta_foules = p_propuesta_foules
  WHERE id = p_candidate_id;

  RETURN jsonb_build_object('status', 'ok');
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_candidate_by_dni(
  uuid, text, text,
  text, text, text, text, text, text, text,
  text, text, text, text, text, text
) TO anon, authenticated;
