-- =====================================================================
-- panel-fyp -> kick-stats seed
-- Generado automaticamente. Ejecutar en Supabase SQL Editor.
-- =====================================================================

begin;

-- 1) Asegurar RLS abierta para este proyecto
alter table if exists public.players enable row level security;
alter table if exists public.matches enable row level security;
alter table if exists public.match_players enable row level security;
alter table if exists public.goal_events enable row level security;
alter table if exists public.contributions enable row level security;
alter table if exists public.votes enable row level security;
alter table if exists public.fines enable row level security;

drop policy if exists open_all_players on public.players;
drop policy if exists open_all_matches on public.matches;
drop policy if exists open_all_match_players on public.match_players;
drop policy if exists open_all_goal_events on public.goal_events;
drop policy if exists open_all_contributions on public.contributions;
drop policy if exists open_all_votes on public.votes;
drop policy if exists open_all_fines on public.fines;

create policy open_all_players on public.players for all using (true) with check (true);
create policy open_all_matches on public.matches for all using (true) with check (true);
create policy open_all_match_players on public.match_players for all using (true) with check (true);
create policy open_all_goal_events on public.goal_events for all using (true) with check (true);
create policy open_all_contributions on public.contributions for all using (true) with check (true);
create policy open_all_votes on public.votes for all using (true) with check (true);
create policy open_all_fines on public.fines for all using (true) with check (true);

-- 2) Limpieza minima para evitar duplicados
delete from public.contributions;
delete from public.votes;
delete from public.goal_events;
delete from public.match_players;
delete from public.matches;
delete from public.fines;
delete from public.players;

-- 3) Jugadores
insert into public.players (nombre, apodo, foto_url, activo)
values
  ('Kippes', 'Kippes', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/kippes.jpg', true),
  ('Turro', 'Turro', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/Turro.jpg', true),
  ('Demencia', 'Demencia', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/Demencia.jpg', true),
  ('Topa', 'Topa', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/Topa.jpg', true),
  ('Isleno', 'Isleno', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/Isleno.jpg', true),
  ('Faculo Airbag', 'Faculo Airbag', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/Faculo.jpg', true),
  ('Fran', 'Fran', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/Fran.jpg', true),
  ('Ponchi', 'Ponchi', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/Ponchi.jpg', true),
  ('Jony sucio', 'Jony sucio', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/Jony.jpg', true),
  ('Julio Metal', 'Julio Metal', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/Julio.jpg', true),
  ('Valencia', 'Valencia', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/Valencia.jpg', true),
  ('Bini', 'Bini', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/Bini.jpg', true),
  ('Cinema', 'Cinema', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/cinema.jpg', true),
  ('Chinche', 'Chinche', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/Chinche.jpg', true),
  ('Culebra', 'Culebra', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/Culebra.jpg', true),
  ('Vegui', 'Vegui', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/Vegui.jpg', true),
  ('Mosky', 'Mosky', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/Mosky.jpg', true),
  ('Bylu', 'Bylu', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/Bylu.jpg', true),
  ('Pana Hija', 'Pana Hija', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/Pana.jpg', true),
  ('DJ Manzon', 'DJ Manzon', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/manzon.jpg', true),
  ('Nuno', 'Nuno', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/nuno.jpg', true),
  ('Peter', 'Peter', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/peter.jpg', true),
  ('Tincho', 'Tincho', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/ticnho.jpg', true),
  ('Nacho Suri IND', 'Nacho Suri IND', 'https://raw.githubusercontent.com/Kippess/panel-fyp/main/Nacho.jpg', true);

-- 4) Partidos
insert into public.matches (fecha, equipo_a_score, equipo_b_score, estado, mvp_player_id, notas)
values
  ('2026-01-05T15:00:00.000Z', 3, 0, 'cerrado', (select id from public.players where nombre = 'Fran' limit 1), 'Migrado desde panel-fyp'),
  ('2026-01-12T15:00:00.000Z', 8, 12, 'cerrado', (select id from public.players where nombre = 'Kippes' limit 1), 'Migrado desde panel-fyp'),
  ('2026-01-18T15:00:00.000Z', 7, 4, 'cerrado', (select id from public.players where nombre = 'Kippes' limit 1), 'Migrado desde panel-fyp'),
  ('2026-01-25T15:00:00.000Z', 8, 9, 'cerrado', (select id from public.players where nombre = 'Peter' limit 1), 'Migrado desde panel-fyp'),
  ('2026-02-05T15:00:00.000Z', 14, 11, 'cerrado', (select id from public.players where nombre = 'Julio Metal' limit 1), 'Migrado desde panel-fyp'),
  ('2026-02-08T15:00:00.000Z', 7, 4, 'cerrado', (select id from public.players where nombre = 'Vegui' limit 1), 'Migrado desde panel-fyp'),
  ('2026-02-10T15:00:00.000Z', 14, 7, 'cerrado', (select id from public.players where nombre = 'Chinche' limit 1), 'Migrado desde panel-fyp'),
  ('2026-02-17T15:00:00.000Z', 5, 7, 'cerrado', (select id from public.players where nombre = 'Culebra' limit 1), 'Migrado desde panel-fyp'),
  ('2026-02-22T15:00:00.000Z', 6, 5, 'cerrado', (select id from public.players where nombre = 'Bylu' limit 1), 'Migrado desde panel-fyp'),
  ('2026-03-15T15:00:00.000Z', 12, 7, 'cerrado', (select id from public.players where nombre = 'Faculo Airbag' limit 1), 'Migrado desde panel-fyp'),
  ('2026-03-22T15:00:00.000Z', 2, 6, 'cerrado', (select id from public.players where nombre = 'Fran' limit 1), 'Migrado desde panel-fyp'),
  ('2026-03-29T15:00:00.000Z', 4, 10, 'cerrado', (select id from public.players where nombre = 'Chinche' limit 1), 'Migrado desde panel-fyp'),
  ('2026-04-05T15:00:00.000Z', 4, 5, 'cerrado', (select id from public.players where nombre = 'Mosky' limit 1), 'Migrado desde panel-fyp'),
  ('2026-04-12T15:00:00.000Z', 7, 3, 'cerrado', (select id from public.players where nombre = 'Fran' limit 1), 'Migrado desde panel-fyp'),
  ('2026-04-19T15:00:00.000Z', 5, 4, 'cerrado', null, 'Migrado desde panel-fyp');

-- 5) Fondo comun legacy (total exacto)
with ordered_matches as (
  select id, row_number() over (order by fecha asc, id asc) as rn
  from public.matches
), base_player as (
  select id as player_id from public.players order by nombre asc limit 1
)
insert into public.contributions (match_id, player_id, monto, pagado)
select
  om.id,
  bp.player_id,
  4005 + case when om.rn <= 6 then 1 else 0 end as monto,
  true as pagado
from ordered_matches om
cross join base_player bp;

commit;
