-- Run this once in Supabase SQL Editor.
-- Adds friendly matches and one-time ELO application tracking.

alter table public.matches
  add column if not exists is_friendly boolean not null default false;

alter table public.matches
  add column if not exists elo_applied boolean not null default false;

alter table public.matches
  add column if not exists elo_applied_at timestamptz null;

create index if not exists idx_matches_is_friendly on public.matches (is_friendly);
create index if not exists idx_matches_elo_applied on public.matches (elo_applied);

