-- v0.10 — socials become a dynamic list, bio.link style
--
-- Replaces the four fixed v0.9 columns (x_handle, instagram_handle,
-- github_handle, website_url) with a single `social_links jsonb` column.
-- Stored shape:
--
--   [
--     { "platform": "x",       "value": "alex_nomad" },
--     { "platform": "github",  "value": "alex" },
--     { "platform": "website", "value": "https://alex.dev" },
--     ...
--   ]
--
-- The app layer enforces the platform enum, value format, and a per-row
-- soft cap. DB just guarantees it's an array so a malformed jsonb can't
-- crash the read.

alter table public.profiles
  add column if not exists social_links jsonb not null default '[]'::jsonb;

-- Sanity: stored value must be a jsonb array, never an object or scalar.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_social_links_is_array'
  ) then
    alter table public.profiles
      add constraint profiles_social_links_is_array
      check (jsonb_typeof(social_links) = 'array');
  end if;
end $$;

-- If v0.9 ever ran, fold the four columns into social_links (preserving
-- the canonical order) and then drop them. Idempotent: skipped if the
-- columns aren't there. NULL-only rows just produce an empty array, so
-- nothing else has to handle the "first time" case.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'x_handle'
  ) then
    update public.profiles
    set social_links = coalesce((
      select jsonb_agg(elem order by ord)
      from (
        select 1 as ord, jsonb_build_object('platform', 'x', 'value', x_handle) as elem where x_handle is not null
        union all
        select 2, jsonb_build_object('platform', 'instagram', 'value', instagram_handle) where instagram_handle is not null
        union all
        select 3, jsonb_build_object('platform', 'github', 'value', github_handle) where github_handle is not null
        union all
        select 4, jsonb_build_object('platform', 'website', 'value', website_url) where website_url is not null
      ) sub
    ), '[]'::jsonb)
    where social_links = '[]'::jsonb;

    alter table public.profiles drop column x_handle;
    alter table public.profiles drop column instagram_handle;
    alter table public.profiles drop column github_handle;
    alter table public.profiles drop column website_url;
  end if;
end $$;
