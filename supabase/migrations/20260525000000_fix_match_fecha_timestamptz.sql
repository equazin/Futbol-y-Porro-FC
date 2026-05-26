-- Fix production databases where public.matches.fecha was created as DATE.
-- Keep the currently visible Buenos Aires datetime by treating old DATE values
-- as UTC midnight, which is how the truncated ISO timestamps were stored.

do $$
begin
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
end $$;

