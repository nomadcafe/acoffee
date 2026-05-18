-- acoffee — v0.7 (Coffee Card) migration.
--
-- (1) DROPS the v0.5 / Phase 0+1 surface that doesn't exist in the Card product:
--   * intent_responses, intents          (signal/match system)
--   * checkins, cafes                    (café roster + check-in flow)
--   * subscribers, pins                  (Phase 0 email list + anon pin map)
-- (2) Adds three Card fields to `profiles`:
--   * city            — free-form city name the user wants to be found in
--   * coffee_chat_kinds — what they're up for (multi-select chips)
--   * email_contact   — a contact email (NOT auth.users.email; user-supplied)
--
-- Run AFTER schema.sql + schema_phase1.sql. Idempotent: safe to re-apply.
-- Existing rows in the dropped tables are lost — that's the v0.7 product
-- decision, not an accident.
--
-- Why a separate file: schema_phase1.sql shipped in v0.5/v0.6 and is already
-- applied in prod. Keeping v0.7 changes here makes the diff obvious and lets
-- us roll forward without rewriting the originals.

-- ---------------------------------------------------------------------------
-- v0.7 drops — order matters because of FK dependencies. The CASCADE flag
-- belt-and-braces against any leftover policy / view we forgot.
-- ---------------------------------------------------------------------------
drop view if exists active_intents;
drop table if exists intent_responses cascade;
drop table if exists intents cascade;
drop table if exists checkins cascade;
drop table if exists cafes cascade;
drop table if exists subscribers cascade;
drop table if exists pins cascade;

-- ---------------------------------------------------------------------------
-- v0.7 additions on profiles.
-- ---------------------------------------------------------------------------

alter table profiles
  add column if not exists city text;

alter table profiles
  add column if not exists email_contact text;

-- coffee_chat_kinds: text[] with a CHECK that constrains members to the
-- v0.7 allowed set. Default empty array so existing rows back-fill cleanly.
alter table profiles
  add column if not exists coffee_chat_kinds text[] not null default '{}';

-- Drop + recreate the check constraint so adding a new kind later is just
-- a "drop + recreate" (idempotent block can't easily add to an existing
-- check). The constraint name is stable so re-runs are no-ops after the
-- first.
alter table profiles
  drop constraint if exists profiles_coffee_chat_kinds_check;

alter table profiles
  add constraint profiles_coffee_chat_kinds_check
  check (coffee_chat_kinds <@ array['coffee', 'cowork', 'dinner', 'hike', 'work_talk']::text[]);

-- Index for "who else in my city" lookups once card discovery lands.
-- Lower() so the query side can normalise without a functional cast.
create index if not exists profiles_city_idx
  on profiles (lower(city))
  where city is not null;
