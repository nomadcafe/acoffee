-- v0.21 — constrain the two `profiles` columns the browser writes directly.
--
-- Additive and idempotent. No matching app change is required: both rules
-- are already what the app produces. The read-side guard for the second one
-- (src/lib/avatar.ts) ships alongside but neither half depends on the other.
--
-- Each constraint is preceded by a scan that raises with a count and the
-- query to see the offending rows, so a database carrying pre-existing junk
-- stops with something actionable instead of a bare "check constraint
-- violated by some row".
--
-- ─────────────────────────── what this fixes ───────────────────────────
--
-- `profiles_write_own` is `using (auth.uid() = id)`. RLS filters rows, not
-- values — it settles *whose* row may be written and has nothing to say
-- about what goes in it. UPDATE is granted table-wide to `authenticated`
-- (the v0.18 block narrows SELECT only, and has to: AvatarUpload writes
-- avatar_url straight from the browser with the anon key, by design). So
-- every column-shape rule the app enforces is enforced in TypeScript, on a
-- path any signed-in user can simply not take — one PATCH to PostgREST
-- writes whatever they like into their own row.
--
-- Two of those rules were load-bearing.
--
-- ── handle ──
--
-- The app's rule is `^[a-z0-9_]+$`, 3–20 (ProfileSchema, and again in
-- checkHandleAvailable). The DB's was `char_length(handle) between 3 and
-- 20`. Length only. Consequences, worst first:
--
--   • `handle` is interpolated into hrefs as `/${handle}` — the confirm
--     page's "view their card", CardSharePanel, the nav. A handle of
--     `/evil.com` is nine characters, passes the length check, and renders
--     as `href="//evil.com"`: a protocol-relative URL, i.e. a redirect out
--     of the site, on a link a visitor has every reason to trust.
--     Constraining the charset is the right layer for that — the
--     alternative is escaping at every interpolation site forever.
--   • RESERVED_HANDLES (src/lib/reserved-handles.ts) is bypassed.
--   • So is lowercasing: `/[handle]` looks up `handle.toLowerCase()`, so an
--     uppercase handle makes the owner's own card unreachable. Self-
--     inflicted, but silent and support-visible.
--
-- Note what this deliberately does NOT enforce: RESERVED_HANDLES. That list
-- is product judgement that changes with the routes; mirroring it here would
-- create two sources of truth that drift, and what it prevents is squatting
-- — annoying, not dangerous. Charset is the half with teeth, and the half
-- that never changes.
--
-- ── avatar_url ──
--
-- No rule at all: any string. It is read back by the public card and the nav
-- as an <img src>, and — the one that matters — by
-- `[handle]/opengraph-image.tsx`, which renders it inside an ImageResponse.
-- That means the *server* fetches it, from a public unauthenticated route
-- anyone can hit as often as they like. An arbitrary URL there is a blind
-- SSRF with a free trigger.
--
-- The legitimate shape is fully determined, because the bucket's own RLS
-- (`avatars_insert_own`: (storage.foldername(name))[1] = auth.uid()::text)
-- already fixes where a user may upload: our Supabase origin, the public
-- avatars prefix, the owner's own folder. The constraint says exactly that,
-- and because a CHECK may reference other columns of the same row it binds
-- the URL to its owner — closing something the bucket policy structurally
-- cannot see, since the write is to `profiles` and not to storage: pointing
-- your card at another user's uploaded photo. Cheap impersonation on a site
-- whose premise is "this is who you're meeting".
--
-- The host pattern is `<ref>.supabase.co` rather than this project's literal
-- ref, so the file stays portable (dev, a fresh bootstrap, a second project).
-- A deployment on a custom storage domain has to widen it; the symptom would
-- be an upload erroring visibly in the avatar widget, not a silent drop.
-- `%` is not used as a wildcard for the host on purpose — `like
-- 'https://%.supabase.co/…'` would also match
-- `https://evil.example/x.supabase.co/…`, since `%` spans `/`.

-- ───────────────────────────── handle format ─────────────────────────────

do $$
declare
  bad int;
begin
  select count(*) into bad
    from public.profiles
   where handle !~ '^[a-z0-9_]{3,20}$';

  if bad > 0 then
    raise exception 'v21: % profile handle(s) violate ^[a-z0-9_]{3,20}$', bad
      using hint = 'List them with: select id, handle from public.profiles '
                || 'where handle !~ ''^[a-z0-9_]{3,20}$''; — rename each one, '
                || 'then re-run this file.';
  end if;
end
$$;

alter table public.profiles
  drop constraint if exists profiles_handle_format;

alter table public.profiles
  add constraint profiles_handle_format
  check (handle ~ '^[a-z0-9_]{3,20}$');

-- ──────────────────────────── avatar_url origin ───────────────────────────
--
-- The pattern is built per row: the owner's uuid is spliced in, so the
-- folder has to be theirs. A uuid contributes no regex metacharacters.

do $$
declare
  bad int;
begin
  select count(*) into bad
    from public.profiles
   where avatar_url is not null
     and avatar_url !~ (
           '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/avatars/'
           || id::text || '/'
         );

  if bad > 0 then
    raise exception 'v21: % avatar_url(s) are not the owner''s own upload', bad
      using hint = 'Inspect them, then clear them — the user simply '
                || 're-uploads: update public.profiles set avatar_url = null '
                || 'where avatar_url is not null and avatar_url !~ '
                || '(''^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/'
                || 'public/avatars/'' || id::text || ''/'');';
  end if;
end
$$;

alter table public.profiles
  drop constraint if exists profiles_avatar_url_own;

alter table public.profiles
  add constraint profiles_avatar_url_own
  check (
    avatar_url is null
    or avatar_url ~ (
         '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/avatars/'
         || id::text || '/'
       )
  );

-- Verification:
--
--   select conname, pg_get_constraintdef(oid) as definition
--     from pg_constraint
--    where conrelid = 'public.profiles'::regclass
--      and conname in ('profiles_handle_format', 'profiles_avatar_url_own');
--
--   -- Both of these must now fail with 23514. Pick a real row id.
--   update public.profiles set handle     = '/evil.com'           where id = '<uuid>';
--   update public.profiles set avatar_url = 'https://evil.test/x' where id = '<uuid>';
--
--   -- And the happy paths must still work: save the profile form on
--   -- /profile, and upload a photo. The upload is the one to actually try,
--   -- since it is the write this file constrains most tightly.
