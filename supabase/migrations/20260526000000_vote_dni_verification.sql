-- Private DNI verification for voting.

create extension if not exists pgcrypto;

create table if not exists public.player_identities (
  player_id uuid primary key references public.players(id) on delete cascade,
  dni_hash text not null unique,
  dni_last4 text,
  updated_at timestamptz not null default now()
);

alter table public.player_identities enable row level security;

drop policy if exists admin_manage_player_identities on public.player_identities;

create policy admin_manage_player_identities on public.player_identities
  for all
  using (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  )
  with check (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  );

create or replace function public.normalize_dni(input text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(input, ''), '\D', '', 'g');
$$;

create or replace function public.hash_dni(input text)
returns text
language sql
immutable
as $$
  select encode(digest(public.normalize_dni(input), 'sha256'), 'hex');
$$;

create or replace function public.set_player_dni(p_player_id uuid, p_dni text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := public.normalize_dni(p_dni);
begin
  if not (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  ) then
    raise exception 'No autorizado';
  end if;

  if normalized = '' then
    delete from public.player_identities where player_id = p_player_id;
    return;
  end if;

  if length(normalized) < 7 or length(normalized) > 9 then
    raise exception 'DNI invalido';
  end if;

  insert into public.player_identities (player_id, dni_hash, dni_last4, updated_at)
  values (
    p_player_id,
    public.hash_dni(normalized),
    right(normalized, 4),
    now()
  )
  on conflict (player_id) do update
    set dni_hash = excluded.dni_hash,
        dni_last4 = excluded.dni_last4,
        updated_at = now();
end;
$$;

create or replace function public.verify_match_voter(p_match_id uuid, p_dni text)
returns table (
  id uuid,
  nombre text,
  apodo text,
  foto_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := public.normalize_dni(p_dni);
begin
  if length(normalized) < 7 or length(normalized) > 9 then
    return;
  end if;

  return query
    select p.id, p.nombre, p.apodo, p.foto_url
    from public.match_players mp
    join public.players p on p.id = mp.player_id
    join public.player_identities pi on pi.player_id = p.id
    join public.matches m on m.id = mp.match_id
    where mp.match_id = p_match_id
      and mp.presente = true
      and coalesce(p.tipo, 'titular') <> 'invitado'
      and m.estado = 'jugado'
      and coalesce(m.is_friendly, false) = false
      and now() >= coalesce(m.votacion_abre, m.fecha)
      and now() < coalesce(m.votacion_cierra, m.fecha + interval '48 hours')
      and pi.dni_hash = public.hash_dni(normalized)
    limit 1;
end;
$$;

create or replace function public.cast_match_votes_with_dni(
  p_match_id uuid,
  p_dni text,
  p_mvp_voted_id uuid,
  p_goal_voted_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  voter_id uuid;
  score_a int;
  score_b int;
  winner_team public.team_side;
  mvp_is_eligible boolean;
  goal_is_eligible boolean;
begin
  select v.id
    into voter_id
  from public.verify_match_voter(p_match_id, p_dni) v
  limit 1;

  if voter_id is null then
    raise exception 'DNI invalido para este partido';
  end if;

  if voter_id = p_mvp_voted_id or voter_id = p_goal_voted_id then
    raise exception 'No podes votarte a vos mismo';
  end if;

  select equipo_a_score, equipo_b_score
    into score_a, score_b
  from public.matches
  where id = p_match_id
    and estado = 'jugado'
    and coalesce(is_friendly, false) = false;

  if score_a is null or score_b is null or score_a = score_b then
    raise exception 'Para votar MVP primero tiene que estar cargado el resultado con equipo ganador.';
  end if;

  winner_team := case when score_a > score_b then 'A'::public.team_side else 'B'::public.team_side end;

  select exists(
    select 1
    from public.match_players mp
    join public.players p on p.id = mp.player_id
    where mp.match_id = p_match_id
      and mp.player_id = p_mvp_voted_id
      and mp.presente = true
      and mp.equipo = winner_team
      and coalesce(p.tipo, 'titular') <> 'invitado'
  ) into mvp_is_eligible;

  if not mvp_is_eligible then
    raise exception 'El MVP debe ser un jugador oficial del equipo ganador';
  end if;

  select exists(
    select 1
    from public.match_players mp
    join public.players p on p.id = mp.player_id
    where mp.match_id = p_match_id
      and mp.player_id = p_goal_voted_id
      and mp.presente = true
      and coalesce(p.tipo, 'titular') <> 'invitado'
  ) into goal_is_eligible;

  if not goal_is_eligible then
    raise exception 'El gol de la fecha debe ser un jugador oficial presente';
  end if;

  insert into public.votes (match_id, voter_player_id, voted_player_id, type)
  values
    (p_match_id, voter_id, p_mvp_voted_id, 'mvp'),
    (p_match_id, voter_id, p_goal_voted_id, 'goal')
  on conflict (match_id, voter_player_id, type) do update
    set voted_player_id = excluded.voted_player_id;
end;
$$;

drop policy if exists public_insert_votes on public.votes;
drop policy if exists public_update_votes on public.votes;

grant execute on function public.set_player_dni(uuid, text) to authenticated;
grant execute on function public.verify_match_voter(uuid, text) to anon, authenticated;
grant execute on function public.cast_match_votes_with_dni(uuid, text, uuid, uuid) to anon, authenticated;
