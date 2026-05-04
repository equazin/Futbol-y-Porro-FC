-- The app can manage duplicate-date prevention in the UI. The database should
-- not reject inserts with a raw matches_fecha_key error.

alter table if exists public.matches
  drop constraint if exists matches_fecha_key;

create index if not exists idx_matches_fecha
  on public.matches (fecha desc);
