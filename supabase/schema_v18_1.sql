-- v0.18 — part 2 of 2. RUN THIS ONLY AFTER THE v0.18 APP CODE IS DEPLOYED.
--
-- Until the deploy lands, the running code still SELECTs telegram_handle /
-- email_contact through the anon key on the public card page and in the
-- sitemap; running this first would 403 those reads. schema_v18.sql (the
-- additive half) is what has to go first.
--
-- ─────────────────────────── what this fixes ───────────────────────────
--
-- `profiles_read` is `using (true)` — every card is public by design, which
-- is correct for handle / bio / city / avatar / socials. But the two contact
-- columns live on the same row, and the anon key is shipped in the browser
-- bundle. That meant the entire "your contact stays hidden until you accept
-- an invite" model was enforced *only* in our own TypeScript:
--
--     GET /rest/v1/profiles?select=handle,telegram_handle,email_contact
--
-- with the public anon key returned every user's Telegram and email in one
-- request. RLS can't help here — it filters rows, not columns. Column-level
-- GRANTs are the mechanism that does.
--
-- Note this has to revoke SELECT at the *table* level first and then grant
-- back the columns we do want public. Postgres will not let you revoke a
-- single column out from under a table-wide SELECT grant — it emits a
-- warning and changes nothing — and Supabase ships `grant all on all tables
-- in schema public to anon, authenticated` by default.
--
-- UPDATE / INSERT privileges are deliberately untouched: the owner still
-- writes their own contacts through the normal RLS-scoped path. Only reading
-- them moves behind the service role.
--
-- ⚠️  RE-RUN THIS FILE WHENEVER YOU ADD A COLUMN TO `profiles`. The grant is
--     an explicit allow-list, so a new column is unreadable by anon and
--     authenticated until it's included. The DO block below rebuilds the
--     list from the live catalog, so re-running is all it takes.
--
-- Idempotent: safe to run more than once.

do $$
declare
  public_cols text;
begin
  -- Columns the public card genuinely needs. Anything not named here is
  -- readable by anon/authenticated; the two contact columns are not.
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into public_cols
    from information_schema.columns
   where table_schema = 'public'
     and table_name   = 'profiles'
     and column_name not in ('telegram_handle', 'email_contact');

  if public_cols is null then
    raise exception 'public.profiles not found — run schema_phase1.sql first';
  end if;

  -- Table-wide SELECT has to go before column grants can bite.
  execute 'revoke select on public.profiles from anon, authenticated';
  execute format(
    'grant select (%s) on public.profiles to anon, authenticated',
    public_cols
  );
end
$$;

-- Verification — both should now be true. The first returns 0 rows for anon;
-- the second confirms the readable set still covers the card.
--
--   select has_column_privilege('anon', 'public.profiles', 'email_contact', 'select');
--   -- expect: false
--   select has_column_privilege('anon', 'public.profiles', 'has_contact', 'select');
--   -- expect: true
