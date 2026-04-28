-- Manual fund movements for team events, purchases, prizes, and cash adjustments.

create table if not exists public.fund_movements (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  monto integer not null check (monto > 0),
  motivo text not null,
  created_at timestamptz not null default now()
);

alter table public.fund_movements enable row level security;

drop policy if exists public_read_fund_movements on public.fund_movements;
drop policy if exists admin_write_fund_movements on public.fund_movements;

create policy public_read_fund_movements on public.fund_movements
  for select using (true);

create policy admin_write_fund_movements on public.fund_movements
  for all
  using (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  )
  with check (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  );

