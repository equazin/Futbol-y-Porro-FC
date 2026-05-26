-- Fix production databases where public.matches.fecha was created as DATE.
-- DATE truncates the admin datetime-local value, so 23/05/2026 21:00 becomes
-- 2026-05-24 and the UI keeps showing the old value.
--
-- Run this once in the Supabase SQL editor for the production project.

do $$
declare
  player_advanced_stats_view text;
begin
  if to_regclass('public.player_advanced_stats') is not null then
    select pg_get_viewdef(to_regclass('public.player_advanced_stats'), true)
      into player_advanced_stats_view;
    drop view public.player_advanced_stats;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'matches'
      and column_name = 'fecha'
      and data_type = 'date'
  ) then
    alter table public.matches
      alter column fecha type timestamptz
      using fecha::timestamp at time zone 'UTC';
  end if;

  if player_advanced_stats_view is not null then
    execute 'create view public.player_advanced_stats as ' || player_advanced_stats_view;
  end if;
end $$;
