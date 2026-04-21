-- ===============================================================
-- Public read + admin-only write
-- Run this in Supabase SQL Editor for project hlafffjpmnvrqttiqrqw
-- ===============================================================

begin;

-- Tables controlled by admin only for writes
alter table if exists public.players enable row level security;
alter table if exists public.matches enable row level security;
alter table if exists public.match_players enable row level security;
alter table if exists public.goal_events enable row level security;
alter table if exists public.contributions enable row level security;
alter table if exists public.fines enable row level security;

-- Remove permissive/open policies
drop policy if exists open_all_players on public.players;
drop policy if exists open_all_matches on public.matches;
drop policy if exists open_all_match_players on public.match_players;
drop policy if exists open_all_goal_events on public.goal_events;
drop policy if exists open_all_contributions on public.contributions;
drop policy if exists open_all_fines on public.fines;

drop policy if exists public_read_players on public.players;
drop policy if exists public_read_matches on public.matches;
drop policy if exists public_read_match_players on public.match_players;
drop policy if exists public_read_goal_events on public.goal_events;
drop policy if exists public_read_contributions on public.contributions;
drop policy if exists public_read_fines on public.fines;

drop policy if exists admin_write_players on public.players;
drop policy if exists admin_write_matches on public.matches;
drop policy if exists admin_write_match_players on public.match_players;
drop policy if exists admin_write_goal_events on public.goal_events;
drop policy if exists admin_write_contributions on public.contributions;
drop policy if exists admin_write_fines on public.fines;

-- Read for everyone (anon + authenticated)
create policy public_read_players on public.players
  for select using (true);
create policy public_read_matches on public.matches
  for select using (true);
create policy public_read_match_players on public.match_players
  for select using (true);
create policy public_read_goal_events on public.goal_events
  for select using (true);
create policy public_read_contributions on public.contributions
  for select using (true);
create policy public_read_fines on public.fines
  for select using (true);

-- Write only for admin emails
-- Add more emails here when needed.
create policy admin_write_players on public.players
  for all
  using (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  )
  with check (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  );

create policy admin_write_matches on public.matches
  for all
  using (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  )
  with check (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  );

create policy admin_write_match_players on public.match_players
  for all
  using (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  )
  with check (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  );

create policy admin_write_goal_events on public.goal_events
  for all
  using (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  )
  with check (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  );

create policy admin_write_contributions on public.contributions
  for all
  using (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  )
  with check (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  );

create policy admin_write_fines on public.fines
  for all
  using (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  )
  with check (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  );

commit;
