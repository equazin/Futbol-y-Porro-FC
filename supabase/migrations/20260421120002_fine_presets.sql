-- Presets de motivos de multa editables desde el admin
CREATE TABLE public.fine_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motivo TEXT NOT NULL,
  monto_default NUMERIC NOT NULL DEFAULT 500,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fine_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY open_all_fine_presets ON public.fine_presets
  FOR ALL USING (true) WITH CHECK (true);

-- Datos iniciales (los mismos que estaban hardcodeados)
INSERT INTO public.fine_presets (motivo, monto_default, orden) VALUES
  ('Ausencia sin avisar', 1000, 1),
  ('Llegada tarde',        300, 2),
  ('Olvido elementos',     200, 3),
  ('Roja directa',         500, 4),
  ('Otro',                 500, 5);
