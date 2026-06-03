-- v0.12 — `city_slug` on profiles: a stored, generated slug for the
-- city discovery pages (/city/[slug]).
--
-- The city discovery routes need to (a) build a URL segment from a
-- profile's city and (b) look other profiles up by that same segment.
-- Doing the slugging in JS meant two functions — toCitySlug for the URL
-- and cityNameFromSlug for the reverse DB match — that had to agree with
-- each other and with the stored Title-cased `city`. The reverse map was
-- lossy: a real name containing a hyphen ("Saint-Tropez") slugged to
-- "saint-tropez" and reversed to "saint tropez", which then failed to
-- match its own rows.
--
-- A generated column removes the round-trip entirely. The expression is
-- the single source of truth: the app reads `city_slug` to build the URL
-- and matches on it with plain equality (indexed), so there's no JS slug
-- function left to drift out of sync with the DB.
--
--   slug = lower(regexp_replace(btrim(city), '\s+', '-', 'g'))
--
-- i.e. trim, collapse internal whitespace runs to single hyphens, and
-- lowercase. STORED (not virtual) so the index below can use it. Null
-- city → null slug (btrim/regexp_replace/lower all propagate null); the
-- read path treats a null slug as "no discovery link".

alter table public.profiles
  add column if not exists city_slug text
  generated always as (
    lower(regexp_replace(btrim(city), '\s+', '-', 'g'))
  ) stored;

-- Exact-match lookups by slug back the /city/[slug] card list and the
-- "active cities" grouping. Partial — a null slug is never queried.
create index if not exists profiles_city_slug_idx
  on public.profiles (city_slug)
  where city_slug is not null;
