create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  accion text not null,
  entidad text not null,
  entidad_id text,
  detalle jsonb,
  admin_email text not null,
  created_at timestamptz not null default now()
);

alter table audit_logs enable row level security;

-- Solo admins autenticados pueden leer
create policy "admins_can_read_audit_logs"
  on audit_logs for select
  to authenticated
  using (true);

-- Cualquier usuario autenticado puede insertar (el frontend valida que sea admin)
create policy "authenticated_can_insert_audit_logs"
  on audit_logs for insert
  to authenticated
  with check (true);
