-- ============================================================
-- PLAYER BONUSES
-- Reemplaza los PANEL_BONUS y PANEL_WINS hardcodeados en código
-- ============================================================

CREATE TABLE public.player_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  motivo TEXT NOT NULL,
  puntos INTEGER NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_player_bonuses_player ON public.player_bonuses(player_id);

ALTER TABLE public.player_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY open_all_player_bonuses ON public.player_bonuses
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- PANEL WINS
-- Victorias históricas pre-sistema para jugadores existentes
-- ============================================================

CREATE TABLE public.player_panel_wins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  wins_historicas INTEGER NOT NULL DEFAULT 0,
  motivo TEXT NOT NULL DEFAULT 'Victorias previas al sistema',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id)
);

CREATE INDEX idx_panel_wins_player ON public.player_panel_wins(player_id);

ALTER TABLE public.player_panel_wins ENABLE ROW LEVEL SECURITY;

CREATE POLICY open_all_panel_wins ON public.player_panel_wins
  FOR ALL USING (true) WITH CHECK (true);
