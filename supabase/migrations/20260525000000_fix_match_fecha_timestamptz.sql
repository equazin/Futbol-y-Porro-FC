-- Fix production databases where public.matches.fecha was created as DATE.
-- Keep the currently visible Buenos Aires datetime by treating old DATE values
-- as UTC midnight, which is how the truncated ISO timestamps were stored.

do $$
declare
  blocked_views text[];
  view_row record;
  pending_count int;
  made_progress boolean;
begin
  create temp table if not exists pg_temp.match_fecha_view_backup (
    schema_name name,
    view_name name,
    definition text,
    recreated boolean default false,
    primary key (schema_name, view_name)
  ) on commit drop;

  insert into pg_temp.match_fecha_view_backup (schema_name, view_name, definition)
  select n.nspname, c.relname, pg_get_viewdef(c.oid, true)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'v'
  on conflict (schema_name, view_name) do update
    set definition = excluded.definition,
        recreated = false;

  select array_agg(format('%I.%I', view_schema, view_name))
    into blocked_views
  from information_schema.view_column_usage
  where table_schema = 'public'
    and table_name = 'matches'
    and column_name = 'fecha';

  if blocked_views is not null then
    execute 'drop view if exists ' || array_to_string(blocked_views, ', ') || ' cascade';
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

  loop
    made_progress := false;

    for view_row in
      select *
      from pg_temp.match_fecha_view_backup
      where recreated = false
      order by schema_name, view_name
    loop
      begin
        execute format(
          'create or replace view %I.%I as %s',
          view_row.schema_name,
          view_row.view_name,
          view_row.definition
        );
        update pg_temp.match_fecha_view_backup
          set recreated = true
          where schema_name = view_row.schema_name
            and view_name = view_row.view_name;
        made_progress := true;
      exception
        when others then
          null;
      end;
    end loop;

    select count(*) into pending_count
    from pg_temp.match_fecha_view_backup
    where recreated = false;

    exit when pending_count = 0 or not made_progress;
  end loop;

  if exists (select 1 from pg_temp.match_fecha_view_backup where recreated = false) then
    raise exception 'No se pudieron recrear estas vistas: %',
      (
        select string_agg(format('%I.%I', schema_name, view_name), ', ')
        from pg_temp.match_fecha_view_backup
        where recreated = false
      );
  end if;
end $$;
