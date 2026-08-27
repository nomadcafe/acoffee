-- acoffee — the live schema, in one file. Reflects the chain through v0.19.
--
-- ─────────────────────────────── what this is ───────────────────────────────
--
-- The numbered files are a historical record: each one is a diff against
-- whatever came before, several create tables that a later file drops, and
-- bootstrapping a database means running twenty of them in the right order
-- without stopping. `schema.sql` alone creates two RLS-less tables holding
-- emails and IPs, which are only dropped six files later — so a bootstrap
-- interrupted in the middle leaves the data of a half-built product open to
-- the world.
--
-- This file creates the end state directly. Run it once against an empty
-- Supabase project and you have the current schema, with nothing exposed
-- along the way.
--
-- ────────────────────────────── what this isn't ─────────────────────────────
--
-- **It is not a migration.** Every statement is `if not exists` / drop-and-
-- recreate, so it's safe to re-run — but on a database that already has these
-- tables, `create table if not exists` skips the whole table, missing columns
-- included. It cannot bring an older database forward. Use the numbered chain
-- for that; it's still the only migration path, and new changes still go in
-- new numbered files (plus a matching edit here).
--
-- **It is derived from the chain, not from production.** Changes have been
-- applied straight to the dashboard before now (v0.17 drops a `discoverable`
-- column that no committed file ever adds), so a long-lived database can
-- carry columns this file doesn't mention. The verification queries at the
-- bottom of README.md are how you check a specific database rather than
-- trusting either source.
--
-- Two known examples of exactly that, both from the Phase 1 profiles table
-- and both unread by any code path since v0.7:
--
--     profiles.current_city      -- superseded by `city`
--     profiles.whatsapp_number   -- WhatsApp was deliberately dropped as a
--                                -- contact channel (see profile/actions.ts)
--
-- A fresh database made with this file won't have them. An existing one
-- still does, and `whatsapp_number` in particular is readable by `anon`,
-- since the v0.18 grant allow-list is rebuilt from the live catalog and
-- only excludes the two columns it names. Dropping them is a one-liner
-- kept commented at the very bottom — it's a schema change, not a
-- consolidation, so this file won't do it behind your back.

create extension if not exists pgcrypto;

-- ═══════════════════════════════ profiles ═══════════════════════════════
-- One row per auth user; this is the card. Created by the trigger below at
-- signup with a placeholder handle, then filled in by /profile.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique not null check (char_length(handle) between 3 and 20),
  bio text check (bio is null or char_length(bio) <= 140),
  city text,
  -- "I'm here until" — nomad presence hint. Past dates are treated as stale
  -- by the app rather than cleaned up, so no job is needed.
  city_until date check (
    city_until is null
    or (city_until >= date '2024-01-01' and city_until <= date '2100-01-01')
  ),
  coffee_chat_kinds text[] not null default '{}'
    check (coffee_chat_kinds
           <@ array['coffee','cowork','dinner','hike','work_talk']::text[]),
  interests text[] not null default '{}'
    check (coalesce(array_length(interests, 1), 0) <= 6),
  gender text check (gender in ('woman', 'man') or gender is null),
  -- [{platform, value}] — per-platform validation lives in lib/socials.ts.
  social_links jsonb not null default '[]'::jsonb
    check (jsonb_typeof(social_links) = 'array'),
  avatar_url text,
  -- The two gated contact channels. Revoked from anon + authenticated at the
  -- bottom of this file; only the service role reads them back.
  telegram_handle text,
  email_contact text,
  -- Public stand-in for "this card can be invited", so the card page never
  -- has to select the real columns. STORED generated → cannot drift.
  has_contact boolean generated always as (
    telegram_handle is not null or email_contact is not null
  ) stored,
  -- Opt-in coffee scheduling + the host's display zone for slots.
  scheduling_enabled boolean not null default false,
  timezone text,
  -- Drives host-facing email language.
  locale text not null default 'en' check (locale in ('en', 'zh', 'ja')),
  created_at timestamptz not null default now(),
  -- Bumped by the trigger below; used as the OG image's cache-bust key.
  updated_at timestamptz not null default now()
);

create index if not exists profiles_city_idx
  on public.profiles (lower(city))
  where city is not null;
create index if not exists profiles_interests_idx
  on public.profiles using gin (interests);

-- Profile row per signup. security definer because the inserting session is
-- GoTrue's, not the new user's.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, handle)
  values (new.id, 'user_' || substr(replace(new.id::text, '-', ''), 1, 8));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.bump_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.bump_profiles_updated_at();

-- ═══════════════════════════ availability_slots ═══════════════════════════
-- A host's opt-in bookable times. Before `invites`, which references it.

create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists availability_slots_host_idx
  on public.availability_slots (host_id, starts_at);

-- ════════════════════════════════ invites ════════════════════════════════
-- Visitor → host coffee requests. No FK on the requester: visitors don't
-- have accounts. Lifecycle is unconfirmed → pending → accepted | declined,
-- with expired reachable from either of the first two.

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,

  requester_name text not null
    check (char_length(requester_name) between 1 and 60),
  requester_email text not null
    check (char_length(requester_email) between 5 and 120),
  requester_topic text not null
    check (char_length(requester_topic) between 1 and 280),
  requested_kind text check (
    requested_kind is null
    or requested_kind in ('coffee','cowork','dinner','hike','work_talk')
  ),
  -- Free-form time hint, used when the host has no scheduling slots.
  preferred_time text
    check (preferred_time is null or char_length(preferred_time) <= 80),
  -- Set instead when the visitor booked one of the host's slots. SET NULL on
  -- delete so removing an old slot can't erase a historical invite.
  slot_id uuid references public.availability_slots (id) on delete set null,
  -- Snapshot of the visitor's browsing language: the accept/decline email is
  -- composed much later, when their cookies are long gone.
  requester_locale text not null default 'en'
    check (requester_locale in ('en', 'zh', 'ja')),

  status text not null default 'pending' check (
    status in ('unconfirmed', 'pending', 'accepted', 'declined', 'expired')
  ),
  -- Emailed to the visitor; clicking it is what promotes unconfirmed →
  -- pending. Unique index doubles as the lookup path.
  confirm_token text unique,
  confirmed_at timestamptz,
  -- Outcome of the contact hand-off email on accept, so a failed delivery
  -- can be surfaced in the host's inbox and retried.
  contact_emailed_at timestamptz,
  last_email_error text,

  created_at timestamptz not null default now(),
  -- Two different clocks share this column: one hour to click the confirm
  -- link, then a fresh week for the host to decide. See PENDING_INVITE_TTL_MS
  -- / UNCONFIRMED_INVITE_TTL_MS — the app always writes it explicitly.
  expires_at timestamptz not null default (now() + interval '7 days'),
  decided_at timestamptz
);

create index if not exists invites_host_pending_idx
  on public.invites (host_id, created_at desc)
  where status = 'pending';
create index if not exists invites_host_history_idx
  on public.invites (host_id, decided_at desc)
  where status in ('accepted', 'declined');
create index if not exists invites_confirm_token_pending_idx
  on public.invites (confirm_token)
  where status = 'unconfirmed';
-- Backs the per-host expiry sweep and the "which slots are held?" reads.
create index if not exists invites_host_active_expiry_idx
  on public.invites (host_id, expires_at)
  where status in ('unconfirmed', 'pending');
-- The real double-booking guard. Can't include `expires_at > now()` — a
-- partial index predicate has to be immutable — which is why createInvite
-- sweeps timed-out rows for the host before it inserts.
create unique index if not exists invites_slot_active_idx
  on public.invites (slot_id)
  where slot_id is not null
    and status in ('unconfirmed', 'pending', 'accepted');

-- ══════════════════════════════ rate limiting ═════════════════════════════
-- One row per throttled request. Service-role only; see schema_v19.sql for
-- the full reasoning.

create table if not exists public.rate_limit_hits (
  id bigint generated always as identity primary key,
  key text not null,
  hit_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_key_time_idx
  on public.rate_limit_hits (key, hit_at desc);
create index if not exists rate_limit_hits_time_idx
  on public.rate_limit_hits (hit_at);

create or replace function public.check_rate_limit(
  p_key text,
  p_windows jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w record;
  cnt int;
  oldest timestamptz;
  longest int := 0;
begin
  if p_key is null or p_key = '' or jsonb_typeof(p_windows) <> 'array' then
    raise exception 'check_rate_limit: bad arguments';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_key));

  select coalesce(max((x->>'seconds')::int), 0)
    into longest
    from jsonb_array_elements(p_windows) x;

  delete from public.rate_limit_hits
   where key = p_key
     and hit_at < now() - make_interval(secs => longest);

  for w in
    select (x->>'seconds')::int as secs, (x->>'max')::int as max
      from jsonb_array_elements(p_windows) x
  loop
    select count(*), min(hit_at)
      into cnt, oldest
      from public.rate_limit_hits
     where key = p_key
       and hit_at > now() - make_interval(secs => w.secs);

    if cnt >= w.max then
      return jsonb_build_object(
        'allowed', false,
        'retry_after_sec',
        greatest(
          1,
          ceil(extract(epoch from
            (oldest + make_interval(secs => w.secs)) - now()))::int
        )
      );
    end if;
  end loop;

  insert into public.rate_limit_hits (key) values (p_key);

  if random() < 0.01 then
    delete from public.rate_limit_hits
     where hit_at < now() - interval '2 days';
  end if;

  return jsonb_build_object('allowed', true, 'retry_after_sec', 0);
end;
$$;

revoke all on function public.check_rate_limit(text, jsonb)
  from public, anon, authenticated;

-- ═════════════════════════ row level security ═════════════════════════════
-- Enabled on all four tables. rate_limit_hits gets no policies at all: under
-- RLS an empty policy set denies everything to anon and authenticated, which
-- is the intent — its keys are IP and email addresses.

alter table public.profiles           enable row level security;
alter table public.availability_slots enable row level security;
alter table public.invites            enable row level security;
alter table public.rate_limit_hits    enable row level security;

revoke all on public.rate_limit_hits from anon, authenticated;

-- profiles: every card is public (column privileges below are what keep the
-- contact channels out of it). No INSERT policy — rows come from the
-- security-definer signup trigger, never from a client.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);

drop policy if exists profiles_write_own on public.profiles;
create policy profiles_write_own on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- availability_slots: public read (the invite form's picker needs them),
-- owner writes.
drop policy if exists availability_slots_read on public.availability_slots;
create policy availability_slots_read
  on public.availability_slots for select using (true);

drop policy if exists availability_slots_insert_own on public.availability_slots;
create policy availability_slots_insert_own
  on public.availability_slots for insert with check (host_id = auth.uid());

drop policy if exists availability_slots_delete_own on public.availability_slots;
create policy availability_slots_delete_own
  on public.availability_slots for delete using (host_id = auth.uid());

-- invites: the host reads and decides their own; anyone may insert, because
-- visitors have no session. The server action is the real gate (validation,
-- CAPTCHA, rate limit); RLS here just permits the write to happen at all.
drop policy if exists invites_read_own on public.invites;
create policy invites_read_own on public.invites for select
  using (auth.uid() = host_id);

drop policy if exists invites_insert_public on public.invites;
create policy invites_insert_public on public.invites for insert
  to public with check (true);

drop policy if exists invites_update_own on public.invites;
create policy invites_update_own on public.invites for update
  using (auth.uid() = host_id) with check (auth.uid() = host_id);

-- ═══════════════════════════ avatars storage ══════════════════════════════
-- Public read (the card's <img> and the OG renderer fetch without auth),
-- writes scoped to `{auth.uid()}/…`.

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists avatars_read_public on storage.objects;
create policy avatars_read_public on storage.objects for select
  to public using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects for insert
  to authenticated with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects for update
  to authenticated using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete
  to authenticated using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ═════════════════════ contact columns: column privileges ═════════════════
-- RLS filters rows, not columns, and `profiles_read` is `using (true)` — so
-- without this block the anon key (which ships in the browser bundle) reads
-- every user's Telegram and email in one REST call. Column-level GRANTs are
-- the mechanism that closes it. Table-wide SELECT has to be revoked first:
-- Postgres will not revoke a single column out from under a table grant, and
-- Supabase grants all tables to anon + authenticated by default.
--
-- ⚠️  RE-RUN THIS BLOCK WHENEVER YOU ADD A COLUMN TO `profiles` — it's an
--     allow-list rebuilt from the live catalog, so a new column is invisible
--     to the app until it's included. The symptom is a field that reads back
--     null everywhere with no error. (schema_v18_1.sql is this same block on
--     its own, for exactly that purpose.)
--
-- Keep this LAST: on an existing deployment it must not run until the app
-- code that stopped selecting those columns is already live.

do $$
declare
  public_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into public_cols
    from information_schema.columns
   where table_schema = 'public'
     and table_name   = 'profiles'
     and column_name not in ('telegram_handle', 'email_contact');

  if public_cols is null then
    raise exception 'public.profiles not found — did the section above run?';
  end if;

  execute 'revoke select on public.profiles from anon, authenticated';
  execute format(
    'grant select (%s) on public.profiles to anon, authenticated',
    public_cols
  );
end
$$;

-- ═══════════════════════════════ verifying ════════════════════════════════
--
--   select has_table_privilege ('anon', 'public.profiles', 'select')                    as table_level;   -- false
--   select has_column_privilege('anon', 'public.profiles', 'email_contact', 'select')   as email_contact; -- false
--   select has_column_privilege('anon', 'public.profiles', 'has_contact',   'select')   as has_contact;   -- true
--   select public.check_rate_limit('probe:bootstrap', '[{"seconds":60,"max":2}]');
--   delete from public.rate_limit_hits where key = 'probe:bootstrap';
--
-- Plus the RLS table listing in README.md — expect exactly four tables.
--
-- ══════════════════ dead columns on long-lived databases ══════════════════
--
-- Not run automatically: this file describes the schema, it doesn't migrate
-- one. Nothing in src/ has referenced either column since v0.7, and
-- `whatsapp_number` is currently readable by anon (it's in the allow-list
-- above by omission, since that list names only the two contact columns).
-- Check them for stray data first, then drop, then re-run the block above:
--
--   select count(*) filter (where current_city    is not null) as has_current_city,
--          count(*) filter (where whatsapp_number is not null) as has_whatsapp
--     from public.profiles;
--
--   alter table public.profiles drop column if exists current_city;
--   alter table public.profiles drop column if exists whatsapp_number;
