-- v0.13 — interest tags on profiles: a small set of free-form-but-
-- normalised tags (`ai`, `web3`, `trail-running`, …) that give a card a
-- hook beyond city + the five fixed coffee_chat_kinds, and back the new
-- /browse interest filter.
--
-- Stored lowercase + hyphen-slugged (same normalisation the generated
-- city_slug uses: lower, whitespace runs → single hyphen) so matching is
-- exact + indexable and the values render uniformly as `#tag` chips. The
-- element shape (2–24 chars, [a-z0-9-]) is enforced in the app
-- (lib/interests.ts), same split socials uses — Postgres only guards
-- cardinality so a runaway client can't bloat the array.

alter table public.profiles
  add column if not exists interests text[] not null default '{}';

-- At most 6 tags. coalesce handles the empty-array case (array_length of
-- '{}' is null, not 0).
alter table public.profiles
  drop constraint if exists profiles_interests_max;
alter table public.profiles
  add constraint profiles_interests_max
  check (coalesce(array_length(interests, 1), 0) <= 6);

-- GIN index backs the /browse interest filter's containment lookups
-- (`interests @> '{ai}'`, PostgREST `.contains`).
create index if not exists profiles_interests_idx
  on public.profiles using gin (interests);
