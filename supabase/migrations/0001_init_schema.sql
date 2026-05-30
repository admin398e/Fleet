-- 0001_init_schema.sql — core shared address-book schema
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- Profiles mirror auth.users 1:1, populated by a trigger on signup.
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

-- Shared property/address record (the thing every driver reads).
create table public.addresses (
  id             uuid primary key default gen_random_uuid(),
  postcode       text not null,
  postcode_norm  text generated always as (upper(replace(postcode, ' ', ''))) stored,
  address_line   text not null,
  lat            double precision,
  lng            double precision,
  created_by     uuid not null references public.profiles(id) default auth.uid(),
  created_at     timestamptz not null default now()
);
create index addresses_postcode_norm_idx on public.addresses (postcode_norm);
create index addresses_address_line_trgm_idx
  on public.addresses using gin (address_line gin_trgm_ops);

create type public.pin_type as enum ('door', 'parking');

-- One row per contributed pin; many pins per address. "Best" pin is chosen by
-- confirmation count at query time, preserving the full contribution history.
create table public.pins (
  id           uuid primary key default gen_random_uuid(),
  address_id   uuid not null references public.addresses(id) on delete cascade,
  pin_type     public.pin_type not null,
  lat          double precision not null,
  lng          double precision not null,
  what3words   text,
  created_by   uuid not null references public.profiles(id) default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index pins_address_type_idx on public.pins (address_id, pin_type);

-- A driver vouches that a pin is correct (one confirmation per pin per user).
create table public.pin_confirmations (
  pin_id     uuid not null references public.pins(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (pin_id, user_id)
);

create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  address_id uuid not null references public.addresses(id) on delete cascade,
  body       text not null,
  created_by uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index notes_address_idx on public.notes (address_id);

create table public.photos (
  id           uuid primary key default gen_random_uuid(),
  address_id   uuid not null references public.addresses(id) on delete cascade,
  storage_path text not null,
  created_by   uuid not null references public.profiles(id) default auth.uid(),
  created_at   timestamptz not null default now()
);
create index photos_address_idx on public.photos (address_id);

-- updated_at maintenance for pins.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger pins_touch
  before update on public.pins
  for each row execute function public.touch_updated_at();

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Convenience view: each pin with its confirmation count, newest/most-confirmed
-- first. The app reads this to surface the "best" door/parking pin per address.
create view public.pins_with_confirmations
with (security_invoker = true) as
select
  p.*,
  coalesce(c.cnt, 0) as confirmation_count
from public.pins p
left join (
  select pin_id, count(*)::int as cnt
  from public.pin_confirmations
  group by pin_id
) c on c.pin_id = p.id;
