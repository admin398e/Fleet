-- 0004_integration_credentials.sql — per-operator integration credentials.
-- "Bring your own API key": each operator stores their own TruTac/TruLinks and
-- Microlise credentials. Secrets are encrypted in the application layer
-- (AES-256-GCM, see src/lib/crypto/secretBox.ts) before they reach the DB, so
-- secret_cipher is opaque ciphertext. RLS scopes every row to its owner.

create type public.integration_provider as enum ('trutac', 'microlise');

create table public.integration_credentials (
  user_id       uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  provider      public.integration_provider not null,
  -- Non-secret config (e.g. baseUrl, Microlise clientId).
  config        jsonb not null default '{}'::jsonb,
  -- AES-GCM envelope (base64); null until a secret is saved.
  secret_cipher text,
  updated_at    timestamptz not null default now(),
  primary key (user_id, provider)
);

create trigger integration_credentials_touch
  before update on public.integration_credentials
  for each row execute function public.touch_updated_at();

-- RLS: an operator can only read or write their own credentials.
alter table public.integration_credentials enable row level security;

create policy "intcred_read" on public.integration_credentials
  for select to authenticated using (user_id = auth.uid());
create policy "intcred_insert" on public.integration_credentials
  for insert to authenticated with check (user_id = auth.uid());
create policy "intcred_update" on public.integration_credentials
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "intcred_delete" on public.integration_credentials
  for delete to authenticated using (user_id = auth.uid());
