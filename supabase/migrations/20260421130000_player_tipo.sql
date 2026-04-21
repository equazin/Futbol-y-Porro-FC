-- Columna tipo en players para distinguir titulares de invitados
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'titular'
  CHECK (tipo IN ('titular', 'invitado'));

-- Backfill: todos los existentes son titulares
UPDATE public.players SET tipo = 'titular' WHERE tipo IS NULL OR tipo = '';

CREATE INDEX IF NOT EXISTS idx_players_tipo ON public.players(tipo);
