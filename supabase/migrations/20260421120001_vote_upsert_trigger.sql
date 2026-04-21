-- El trigger validate_vote original solo cubría INSERT.
-- Al usar UPSERT, el conflicto dispara un UPDATE interno.
-- Extendemos el trigger para cubrir también UPDATE.

DROP TRIGGER IF EXISTS trg_validate_vote ON public.votes;

CREATE TRIGGER trg_validate_vote
  BEFORE INSERT OR UPDATE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.validate_vote();
