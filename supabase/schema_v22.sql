-- v0.22 — narrow UPDATE on `invites` and `profiles` to the columns the
-- browser-side session actually needs to write.
--
-- ⚠️  DEPLOY ORDER: ship the matching app code FIRST, then run this file.
--     The code moves updateProfile, addSlot's timezone stamp and
--     recordContactEmail onto the service-role client; run this before that
--     is live and profile saves fail with 42501 (permission denied).
--
-- Idempotent: revokes and re-grants, drops and recreates the trigger.
--
-- ─────────────────────────── what this fixes ───────────────────────────
--
-- v0.21 put CHECK constraints on the two profile columns it called
-- load-bearing, but left the grant itself table-wide. RLS (`*_own`) settles
-- *whose* row may be written; it says nothing about *which columns*. With
-- the anon key in the browser bundle, any signed-in user can PATCH every
-- column of their own rows through PostgREST, skipping every rule written
-- in TypeScript.
--
-- ── invites: an email relay ──
--
-- `invites_update_own` let a host rewrite any column of an invite they
-- received — requester_email and requester_name included. Combined with
-- resendAcceptedContact, which mails the accepted-invite email to
-- requester_email on demand:
--
--   1. get one invite into your own inbox (invite yourself from a second
--      address and click the confirm link);
--   2. PATCH it: requester_email = <anyone>, requester_name = <any text>,
--      status = 'accepted';
--   3. call resendAcceptedContact; repeat from 2.
--
-- Each round sends mail from our domain to an address of the attacker's
-- choosing, with attacker-chosen text in the greeting and — via the next
-- section — in the contact block. The only brake was the in-memory
-- per-instance limiter.
--
-- Now: authenticated may update `status` and `decided_at` only, and the
-- trigger below allows exactly the transitions the app performs. The
-- delivery bookkeeping (contact_emailed_at / last_email_error) is written
-- by the service role.
--
-- ── profiles ──
--
-- telegram_handle and email_contact land in that same email and had no
-- DB-side rule at all; city, bio-adjacent text, interests and timezone
-- had length/shape rules in TypeScript only. Rather than mirror every zod
-- rule as a CHECK (two sources of truth that drift), the write moves
-- server-side: updateProfile validates, then writes with the service role
-- scoped to the caller's id. The browser keeps exactly what it writes
-- directly:
--
--   avatar_url — AvatarUpload PATCHes it; constrained by v0.21.
--   locale     — setLocale mirrors the cookie; CHECK-constrained to en/zh/ja.

-- ═══════════════════════════════ invites ═══════════════════════════════

revoke update on public.invites from anon, authenticated;
grant update (status, decided_at) on public.invites to authenticated;

-- Column grants decide *what* can be written; this decides *to what*.
-- Applies only to the `authenticated` role — the service role (createInvite,
-- the confirm page, the visitor-side expiry sweep) is trusted and skips it.
create or replace function public.guard_invite_host_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.status is distinct from old.status then
    -- The host's decision.
    if old.status = 'pending' and new.status in ('accepted', 'declined') then
      return new;
    end if;
    -- getMyInviteHistory's sweep of timed-out pending rows.
    if old.status = 'pending' and new.status = 'expired'
       and old.expires_at < now() then
      return new;
    end if;
    raise exception 'invites: % -> % is not a host transition',
      old.status, new.status
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists invites_guard_host_update on public.invites;
create trigger invites_guard_host_update
  before update on public.invites
  for each row execute function public.guard_invite_host_update();

-- ═══════════════════════════════ profiles ══════════════════════════════

revoke update on public.profiles from anon, authenticated;
grant update (avatar_url, locale) on public.profiles to authenticated;

-- Verification:
--
--   select has_column_privilege('authenticated', 'public.invites',  'requester_email', 'update'); -- false
--   select has_column_privilege('authenticated', 'public.invites',  'status',          'update'); -- true
--   select has_column_privilege('authenticated', 'public.profiles', 'email_contact',   'update'); -- false
--   select has_column_privilege('authenticated', 'public.profiles', 'avatar_url',      'update'); -- true
--
--   -- Then, in the app: save the profile form, upload a photo, switch
--   -- language while signed in, add a slot, accept and decline an invite,
--   -- and resend an accepted invite's contact email.
