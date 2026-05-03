-- Ensure Isleno has 3 historical matches played.

insert into public.player_historical_stats (player_id, pj, pg, mvp, gf)
select p.id, 3, 0, 0, 0
from public.players p
where lower(coalesce(p.apodo, p.nombre)) in ('isleno', 'isleño')
   or lower(p.nombre) in ('isleno', 'isleño')
on conflict (player_id) do update
  set pj = 3,
      pg = excluded.pg,
      mvp = excluded.mvp,
      gf = excluded.gf,
      updated_at = now();
