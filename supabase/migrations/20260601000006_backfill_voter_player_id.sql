-- Backfill voter_player_id for existing votes using voter_dni_hash
UPDATE public.election_votes ev
SET voter_player_id = pi.player_id
FROM public.player_identities pi
WHERE ev.voter_player_id IS NULL
  AND ev.voter_dni_hash = pi.dni_hash;
