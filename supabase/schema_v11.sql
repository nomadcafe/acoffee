-- v0.11 — `city_until` on profiles: a nomad-aware presence hint.
--
-- A traveling user can pin a date that says "I'm in this city until X".
-- Residents leave it null. When the date is in the past, the app treats
-- the city as stale and renders nothing — no cleanup job needed, the
-- read path does the gating.
--
-- Date-only (no time / timezone). "Until June 10" is intentionally
-- fuzzy at the day boundary; storing a timestamptz here would imply
-- precision the field doesn't have.

alter table public.profiles
  add column if not exists city_until date;

-- Soft sanity: absolute (immutable) bounds to catch finger-slip year
-- typos like `2002` or `2202`. Must NOT use `current_date` here — CHECK
-- constraints re-evaluate on every UPDATE that touches the row, so any
-- "today-relative" bound would mean editing an unrelated field (handle,
-- bio) could fail months later when an old `city_until` falls outside
-- the rolling window. App-layer enforces the tighter "must be in the
-- future when written" rule; this is the DB-level backstop.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_city_until_in_range'
  ) then
    alter table public.profiles
      add constraint profiles_city_until_in_range
      check (
        city_until is null
        or (city_until >= date '2024-01-01'
            and city_until <= date '2100-01-01')
      );
  end if;
end $$;
