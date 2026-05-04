-- Voting opens when an official match is marked as played and closes
-- automatically 48 hours after the match datetime.

create or replace function public.validate_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m_estado public.match_status;
  m_fecha timestamptz;
  m_is_friendly boolean;
  voter_played boolean;
  voted_played boolean;
begin
  select estado, fecha, coalesce(is_friendly, false)
    into m_estado, m_fecha, m_is_friendly
    from public.matches
    where id = new.match_id;

  if m_estado is null then
    raise exception 'Partido inexistente';
  end if;

  if m_is_friendly then
    raise exception 'Los amistosos no tienen votacion';
  end if;

  if m_estado = 'cerrado' then
    raise exception 'La votacion de este partido ya esta cerrada';
  end if;

  if m_estado <> 'jugado' then
    raise exception 'La ventana de votacion no esta abierta.';
  end if;

  if now() < m_fecha then
    raise exception 'La ventana de votacion no esta abierta.';
  end if;

  if now() >= m_fecha + interval '48 hours' then
    raise exception 'La votacion ya cerro';
  end if;

  select exists(
    select 1
    from public.match_players mp
    join public.players p on p.id = mp.player_id
    where mp.match_id = new.match_id
      and mp.player_id = new.voter_player_id
      and mp.presente = true
      and coalesce(p.tipo, 'titular') <> 'invitado'
  ) into voter_played;

  if not voter_played then
    raise exception 'Solo pueden votar jugadores oficiales que participaron del partido';
  end if;

  select exists(
    select 1
    from public.match_players mp
    join public.players p on p.id = mp.player_id
    where mp.match_id = new.match_id
      and mp.player_id = new.voted_player_id
      and mp.presente = true
      and coalesce(p.tipo, 'titular') <> 'invitado'
  ) into voted_played;

  if not voted_played then
    raise exception 'Solo se puede votar a jugadores oficiales que participaron del partido';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_vote on public.votes;

create trigger trg_validate_vote
  before insert or update on public.votes
  for each row execute function public.validate_vote();

update public.matches
set votacion_abre = fecha,
    votacion_cierra = fecha + interval '48 hours'
where estado = 'jugado'
  and coalesce(is_friendly, false) = false;
