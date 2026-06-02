-- Multi-member candidacies: replace single vice_player_id with a
-- separate table that can hold N members per candidate (no roles).

CREATE TABLE IF NOT EXISTS public.candidate_members (
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  position smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_members_candidate
  ON public.candidate_members(candidate_id, position);

ALTER TABLE public.candidate_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS candidate_members_read ON public.candidate_members;
CREATE POLICY candidate_members_read ON public.candidate_members
  FOR SELECT
  USING (true);

-- Writes go through SECURITY DEFINER RPCs only, so no other policies.

-- Backfill: turn each existing vice_player_id into a member at position 0
INSERT INTO public.candidate_members (candidate_id, player_id, position)
SELECT id, vice_player_id, 0
FROM public.candidates
WHERE vice_player_id IS NOT NULL
ON CONFLICT (candidate_id, player_id) DO NOTHING;

-- We keep candidates.vice_player_id around for read-only back-compat with
-- existing code paths until the UI is fully migrated. New writes from the
-- updated RPCs will sync it to members[0] (or NULL when empty) so older
-- consumers still see a vice if there is at least one member.


-- ─── register_candidate (multi-member version) ─────────────────────────────
-- Backwards compatible: p_vice_dni still works and ends up as a member,
-- and now also accepts p_member_dnis text[] for extra members.

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
  p_flyer_url text DEFAULT NULL,
  p_member_dnis text[] DEFAULT NULL
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
  v_dnis text[];
  v_dni text;
  v_member_hash text;
  v_member_player_id uuid;
  v_resolved_members uuid[] := ARRAY[]::uuid[];
  v_first_member uuid := NULL;
  v_pos smallint := 0;
BEGIN
  -- President DNI
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

  -- Build unified member DNI list: legacy p_vice_dni first, then p_member_dnis
  v_dnis := ARRAY[]::text[];
  IF p_vice_dni IS NOT NULL AND trim(p_vice_dni) <> '' THEN
    v_dnis := array_append(v_dnis, p_vice_dni);
  END IF;
  IF p_member_dnis IS NOT NULL THEN
    FOREACH v_dni IN ARRAY p_member_dnis LOOP
      IF v_dni IS NOT NULL AND trim(v_dni) <> '' THEN
        v_dnis := array_append(v_dnis, v_dni);
      END IF;
    END LOOP;
  END IF;

  -- Resolve every member DNI to a player_id, validating along the way
  FOREACH v_dni IN ARRAY v_dnis LOOP
    v_member_hash := hash_dni(v_dni);
    IF v_member_hash IS NULL THEN
      RETURN jsonb_build_object('status', 'invalid_member_dni');
    END IF;

    SELECT pi.player_id INTO v_member_player_id
    FROM player_identities pi
    WHERE pi.dni_hash = v_member_hash;

    IF v_member_player_id IS NULL THEN
      RETURN jsonb_build_object('status', 'member_dni_not_found');
    END IF;

    IF v_member_player_id = v_player_id THEN
      RETURN jsonb_build_object('status', 'member_same_as_president');
    END IF;

    IF v_member_player_id = ANY(v_resolved_members) THEN
      RETURN jsonb_build_object('status', 'duplicate_member');
    END IF;

    IF EXISTS (
      SELECT 1 FROM candidates
      WHERE election_id = p_election_id AND player_id = v_member_player_id
    ) THEN
      RETURN jsonb_build_object('status', 'member_already_candidate');
    END IF;

    v_resolved_members := array_append(v_resolved_members, v_member_player_id);
  END LOOP;

  -- Election state
  SELECT * INTO v_election FROM elections WHERE id = p_election_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'election_not_found');
  END IF;

  IF v_election.estado <> 'postulacion' THEN
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

  IF array_length(v_resolved_members, 1) IS NOT NULL THEN
    v_first_member := v_resolved_members[1];
  END IF;

  INSERT INTO candidates (
    election_id, player_id, vice_player_id, partido_politico, flyer_url,
    propuesta_organizacion, propuesta_votacion_premios, propuesta_economia,
    propuesta_convivencia, propuesta_tercer_tiempo, propuesta_infraestructura,
    propuesta_constitucion,
    propuesta_domingos, propuesta_ausencias, propuesta_equipos,
    propuesta_presupuesto, propuesta_convivencia2, propuesta_foules
  ) VALUES (
    p_election_id, v_player_id, v_first_member, trim(p_partido), p_flyer_url,
    p_propuesta_organizacion, p_propuesta_votacion_premios, p_propuesta_economia,
    p_propuesta_convivencia, p_propuesta_tercer_tiempo, p_propuesta_infraestructura,
    p_propuesta_constitucion,
    p_propuesta_domingos, p_propuesta_ausencias, p_propuesta_equipos,
    p_propuesta_presupuesto, p_propuesta_convivencia2, p_propuesta_foules
  )
  RETURNING id INTO v_candidate_id;

  -- Insert members in order
  IF array_length(v_resolved_members, 1) IS NOT NULL THEN
    FOREACH v_member_player_id IN ARRAY v_resolved_members LOOP
      INSERT INTO candidate_members (candidate_id, player_id, position)
      VALUES (v_candidate_id, v_member_player_id, v_pos);
      v_pos := v_pos + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('status', 'ok', 'candidate_id', v_candidate_id);
END;
$$;


-- ─── update_candidate_by_dni (multi-member version) ────────────────────────
-- Auth: president only (per latest decision). Replaces member list with
-- whatever p_member_dnis contains. Pass empty array to clear members.

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
  p_propuesta_foules text DEFAULT '',
  p_member_dnis text[] DEFAULT NULL
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
  v_dni text;
  v_member_hash text;
  v_member_player_id uuid;
  v_resolved_members uuid[] := ARRAY[]::uuid[];
  v_pos smallint := 0;
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

  -- President only
  IF v_candidate.player_id <> v_player_id THEN
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

  -- Resolve members (validate before mutating)
  IF p_member_dnis IS NOT NULL THEN
    FOREACH v_dni IN ARRAY p_member_dnis LOOP
      IF v_dni IS NULL OR trim(v_dni) = '' THEN
        CONTINUE;
      END IF;

      v_member_hash := hash_dni(v_dni);
      IF v_member_hash IS NULL THEN
        RETURN jsonb_build_object('status', 'invalid_member_dni');
      END IF;

      SELECT pi.player_id INTO v_member_player_id
      FROM player_identities pi
      WHERE pi.dni_hash = v_member_hash;

      IF v_member_player_id IS NULL THEN
        RETURN jsonb_build_object('status', 'member_dni_not_found');
      END IF;

      IF v_member_player_id = v_candidate.player_id THEN
        RETURN jsonb_build_object('status', 'member_same_as_president');
      END IF;

      IF v_member_player_id = ANY(v_resolved_members) THEN
        RETURN jsonb_build_object('status', 'duplicate_member');
      END IF;

      -- Allowed to be a member of THIS candidacy only.
      IF EXISTS (
        SELECT 1 FROM candidates
        WHERE election_id = v_candidate.election_id
          AND player_id = v_member_player_id
      ) THEN
        RETURN jsonb_build_object('status', 'member_already_candidate');
      END IF;

      v_resolved_members := array_append(v_resolved_members, v_member_player_id);
    END LOOP;
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

  -- Replace member list only if p_member_dnis was provided
  IF p_member_dnis IS NOT NULL THEN
    DELETE FROM candidate_members WHERE candidate_id = p_candidate_id;
    IF array_length(v_resolved_members, 1) IS NOT NULL THEN
      FOREACH v_member_player_id IN ARRAY v_resolved_members LOOP
        INSERT INTO candidate_members (candidate_id, player_id, position)
        VALUES (p_candidate_id, v_member_player_id, v_pos);
        v_pos := v_pos + 1;
      END LOOP;
    END IF;

    -- Keep legacy vice_player_id in sync with the first member (or NULL)
    UPDATE candidates
      SET vice_player_id = CASE
        WHEN array_length(v_resolved_members, 1) IS NOT NULL
        THEN v_resolved_members[1]
        ELSE NULL
      END
      WHERE id = p_candidate_id;
  END IF;

  RETURN jsonb_build_object('status', 'ok');
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_candidate(
  uuid, text, text,
  text, text, text, text, text, text, text,
  text, text, text, text, text, text,
  text, text, text[]
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_candidate_by_dni(
  uuid, text, text,
  text, text, text, text, text, text, text,
  text, text, text, text, text, text,
  text[]
) TO anon, authenticated;
