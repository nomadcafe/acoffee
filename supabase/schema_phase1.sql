-- acoffee — Phase 1 schema.
--
-- Separate from schema.sql (Phase 0: pins, subscribers). Run this in your
-- Supabase SQL editor when you're ready to start Phase 1 work. The two
-- schemas coexist; no table from Phase 0 is modified.
--
-- Prereqs:
--   1. Supabase Auth enabled, with email magic-link + Google OAuth providers.
--   2. schema.sql (Phase 0) already applied — gives us pgcrypto.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles — application mirror of auth.users
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique not null check (char_length(handle) between 3 and 20),
  bio text check (bio is null or char_length(bio) <= 140),
  current_city text,
  telegram_handle text,
  whatsapp_number text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up. Default handle is
-- "user_<first 8 chars of uuid>"; the user picks their real handle later.
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

-- ---------------------------------------------------------------------------
-- cafes — venues. 30 hand-seeded for Chiang Mai; UGC submissions go through
-- submission_status = 'pending' until approved.
-- ---------------------------------------------------------------------------
create table if not exists cafes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  city text not null,
  neighborhood text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  has_wifi boolean not null default true,
  has_outlets boolean not null default false,
  laptop_friendly boolean not null default false,
  google_place_id text unique,
  submitted_by uuid references profiles (id) on delete set null,
  submission_status text not null default 'approved'
    check (submission_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists cafes_city_approved_idx
  on cafes (city)
  where submission_status = 'approved';

-- ---------------------------------------------------------------------------
-- checkins — "I'm working at this café right now". Default 2h TTL; the app
-- writes expires_at explicitly so users can pick a shorter / longer stay.
-- ---------------------------------------------------------------------------
create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  cafe_id uuid not null references cafes (id) on delete cascade,
  note text check (note is null or char_length(note) <= 80),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists checkins_cafe_active_idx
  on checkins (cafe_id, expires_at desc);
create index if not exists checkins_profile_idx
  on checkins (profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- intents — one active intent per user (coffee / cowork / dinner / hike).
-- Replacing an intent is a DELETE + INSERT in the API layer; cascading delete
-- drops stale responses so a new intent starts clean.
-- ---------------------------------------------------------------------------
do $$ begin
  create type intent_kind as enum ('coffee', 'cowork', 'dinner', 'hike');
exception when duplicate_object then null;
end $$;

-- Idempotent backfill for environments that already created the enum without 'hike'.
do $$ begin
  alter type intent_kind add value 'hike';
exception when duplicate_object then null;
end $$;

create table if not exists intents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles (id) on delete cascade,
  kind intent_kind not null,
  city text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists intents_city_kind_active_idx
  on intents (city, kind, expires_at desc);

-- Convenience view: only currently-active intents.
create or replace view active_intents as
  select * from intents where expires_at > now();

-- ---------------------------------------------------------------------------
-- intent_responses — A says "me too" to B's intent. On accept, the responder
-- picks one contact channel (telegram or whatsapp); the actual handle is
-- looked up from profiles, not duplicated here.
-- ---------------------------------------------------------------------------
create table if not exists intent_responses (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references intents (id) on delete cascade,
  responder_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  contact_via text check (contact_via in ('telegram', 'whatsapp')),
  created_at timestamptz not null default now(),
  unique (intent_id, responder_id)
);

create index if not exists intent_responses_intent_idx
  on intent_responses (intent_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security — minimal starter policies. Tighten before public launch.
--
-- Reads: anon allowed for cafes (SEO) and aggregated intents/checkins data.
--        Server-side aggregates use service_role and bypass RLS anyway.
-- Writes: authenticated users only, scoped to themselves.
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table cafes enable row level security;
alter table checkins enable row level security;
alter table intents enable row level security;
alter table intent_responses enable row level security;

-- profiles: anyone can read public-facing fields; users edit only their own row.
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select using (true);

drop policy if exists profiles_write_own on profiles;
create policy profiles_write_own on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- cafes: approved + community-submitted (pending) readable by anyone; only
-- 'rejected' stays hidden until moderator action. Authenticated users submit
-- their own; submitted_by clause keeps a user's own rejected submission visible
-- to themselves so they can edit / resubmit later if we add that.
drop policy if exists cafes_read_approved on cafes;
create policy cafes_read_approved on cafes for select
  using (submission_status in ('approved', 'pending') or submitted_by = auth.uid());

drop policy if exists cafes_insert_authenticated on cafes;
create policy cafes_insert_authenticated on cafes for insert
  with check (auth.uid() is not null and submitted_by = auth.uid()
              and submission_status = 'pending');

-- checkins: anyone can read; users create/delete only their own.
drop policy if exists checkins_read on checkins;
create policy checkins_read on checkins for select using (true);

drop policy if exists checkins_write_own on checkins;
create policy checkins_write_own on checkins for insert
  with check (auth.uid() = profile_id);

drop policy if exists checkins_delete_own on checkins;
create policy checkins_delete_own on checkins for delete
  using (auth.uid() = profile_id);

-- UPDATE policy needed for two things: editing the note on an existing
-- check-in, and extending expires_at by 2h (cafe page 'Extend' button).
-- Without this, both fail silently — RLS returns 0 rows affected, no error.
drop policy if exists checkins_update_own on checkins;
create policy checkins_update_own on checkins for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- intents: anyone can read; users create/delete only their own.
drop policy if exists intents_read on intents;
create policy intents_read on intents for select using (true);

drop policy if exists intents_write_own on intents;
create policy intents_write_own on intents for insert
  with check (auth.uid() = profile_id);

drop policy if exists intents_delete_own on intents;
create policy intents_delete_own on intents for delete
  using (auth.uid() = profile_id);

-- intent_responses: visible to intent owner + responder; responder writes own.
drop policy if exists responses_read_parties on intent_responses;
create policy responses_read_parties on intent_responses for select
  using (
    auth.uid() = responder_id
    or auth.uid() in (select profile_id from intents where intents.id = intent_id)
  );

drop policy if exists responses_write_own on intent_responses;
create policy responses_write_own on intent_responses for insert
  with check (auth.uid() = responder_id);

drop policy if exists responses_update_parties on intent_responses;
create policy responses_update_parties on intent_responses for update
  using (
    auth.uid() = responder_id
    or auth.uid() in (select profile_id from intents where intents.id = intent_id)
  );
