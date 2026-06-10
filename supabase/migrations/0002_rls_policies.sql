-- 0002_rls_policies.sql — Row Level Security
-- Model: shared READ for any authenticated user; INSERT your own rows;
-- UPDATE/DELETE only your own contributions. Every insert/update policy uses a
-- WITH CHECK so created_by/user_id can never be spoofed.

alter table public.profiles          enable row level security;
alter table public.addresses         enable row level security;
alter table public.pins              enable row level security;
alter table public.pin_confirmations enable row level security;
alter table public.notes             enable row level security;
alter table public.photos            enable row level security;

-- PROFILES: read all, update only self.
create policy "profiles_read" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ADDRESSES: shared read, anyone authenticated creates, owner-only edit/delete.
create policy "addr_read" on public.addresses
  for select to authenticated using (true);
create policy "addr_insert" on public.addresses
  for insert to authenticated with check (created_by = auth.uid());
create policy "addr_update" on public.addresses
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "addr_delete" on public.addresses
  for delete to authenticated using (created_by = auth.uid());

-- PINS.
create policy "pins_read" on public.pins
  for select to authenticated using (true);
create policy "pins_insert" on public.pins
  for insert to authenticated with check (created_by = auth.uid());
create policy "pins_update" on public.pins
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "pins_delete" on public.pins
  for delete to authenticated using (created_by = auth.uid());

-- CONFIRMATIONS: read all; confirm only as yourself; remove only your own.
create policy "conf_read" on public.pin_confirmations
  for select to authenticated using (true);
create policy "conf_insert" on public.pin_confirmations
  for insert to authenticated with check (user_id = auth.uid());
create policy "conf_delete" on public.pin_confirmations
  for delete to authenticated using (user_id = auth.uid());

-- NOTES.
create policy "notes_read" on public.notes
  for select to authenticated using (true);
create policy "notes_insert" on public.notes
  for insert to authenticated with check (created_by = auth.uid());
create policy "notes_update" on public.notes
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "notes_delete" on public.notes
  for delete to authenticated using (created_by = auth.uid());

-- PHOTOS (table rows; the storage objects have their own policies).
create policy "photos_read" on public.photos
  for select to authenticated using (true);
create policy "photos_insert" on public.photos
  for insert to authenticated with check (created_by = auth.uid());
create policy "photos_delete" on public.photos
  for delete to authenticated using (created_by = auth.uid());
