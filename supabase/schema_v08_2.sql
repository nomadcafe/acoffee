-- acoffee — v0.8.2 (OG cache-bust) migration.
--
-- Adds profiles.updated_at + a BEFORE UPDATE trigger that auto-bumps it
-- on every row change. We use the timestamp as a `?v=` query param on
-- the public OG image URL so Twitter / Slack / iMessage refetch the
-- preview when a user updates their avatar / status / city / etc.
--
-- Run AFTER schema_v08.sql. Idempotent.

alter table profiles
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.bump_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at
  before update on profiles
  for each row
  execute function public.bump_profiles_updated_at();
