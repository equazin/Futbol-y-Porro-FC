-- Fix production databases where public.matches.fecha was created as DATE.
-- Keep the currently visible Buenos Aires datetime by treating old DATE values
-- as UTC midnight, which is how the truncated ISO timestamps were stored.

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
