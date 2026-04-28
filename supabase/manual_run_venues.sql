-- Run this once in Supabase SQL Editor.
-- Creates editable venues for the match wizard.

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text null,
  activo boolean not null default true,
  orden integer not null default 1,
  created_at timestamptz not null default now()
);

create unique index if not exists venues_nombre_unique on public.venues (lower(nombre));
create index if not exists idx_venues_activo_orden on public.venues (activo, orden);

insert into public.venues (nombre, orden)
values
  ('Cancha Norte', 1),
  ('Cancha Sur', 2),
  ('Polideportivo', 3),
  ('Club Barrio', 4)
on conflict (lower(nombre)) do nothing;

alter table public.venues enable row level security;

drop policy if exists public_read_venues on public.venues;
drop policy if exists admin_write_venues on public.venues;

create policy public_read_venues on public.venues
  for select using (true);

create policy admin_write_venues on public.venues
  for all
  using (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  )
  with check (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  );

