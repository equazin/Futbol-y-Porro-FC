-- Keep public voting available, but reserve destructive vote actions for admins.

alter table if exists public.votes enable row level security;

drop policy if exists open_all_votes on public.votes;
drop policy if exists public_read_votes on public.votes;
drop policy if exists public_insert_votes on public.votes;
drop policy if exists public_update_votes on public.votes;
drop policy if exists admin_delete_votes on public.votes;

create policy public_read_votes on public.votes
  for select using (true);

create policy public_insert_votes on public.votes
  for insert with check (true);

create policy public_update_votes on public.votes
  for update using (true) with check (true);

create policy admin_delete_votes on public.votes
  for delete using (
    auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('nicopbenitez84@gmail.com')
  );
