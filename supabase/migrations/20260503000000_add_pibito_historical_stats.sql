-- Add Pibito with 3 historical matches played.
-- Isleno intentionally remains at 3 PJ.

insert into public.players (nombre, apodo, foto_url, activo)
select
  'Pibito',
  'Pibito',
  'https://raw.githubusercontent.com/equazin/Futbol-y-Porro-FC/main/logo.jpg',
  true
where not exists (
  select 1
  from public.players
  where lower(coalesce(apodo, nombre)) = 'pibito'
     or lower(nombre) = 'pibito'
);

insert into public.player_historical_stats (player_id, pj, pg, mvp, gf)
select p.id, 3, 0, 0, 0
from public.players p
where lower(coalesce(p.apodo, p.nombre)) = 'pibito'
   or lower(p.nombre) = 'pibito'
on conflict (player_id) do update
  set pj = 3,
      pg = excluded.pg,
      mvp = excluded.mvp,
      gf = excluded.gf,
      updated_at = now();
