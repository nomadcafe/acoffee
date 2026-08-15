-- v0.18 — part 1 of 2. Additive only: safe to run against the *current*
-- deployed code, and it must run BEFORE the v0.18 app code goes out.
-- The teeth (revoking read access to the contact columns) live in
-- schema_v18_1.sql, which runs AFTER the deploy. See that file's header.
--
-- Two independent fixes:
--
--   A. profiles.has_contact — a public, readable boolean standing in for
--      "this card has at least one contact channel". The card page needs
--      exactly that much and nothing more; today it SELECTs the two real
--      contact columns and throws them away in JS, which is why anon can
--      read them straight off the REST endpoint. Once every reader is on
--      this column, v18_1 can take the real ones away.
--
--   B. invite expiry — release the availability slot held by an invite
--      that timed out. `invites_slot_active_idx` and the app's "is this
--      slot taken?" queries both key off `status` alone, and nothing ever
--      moved a timed-out row out of the active set: an `unconfirmed`
--      invite (visitor never clicked the confirm link — typo'd address,
--      spam folder, or deliberate) held its slot forever. The slot then
--      vanished from the public picker, showed as `taken` in the host's
--      editor, and refused to be deleted ("decline that invite first")
--      while never appearing in the inbox to decline. The one-time sweep
--      below unsticks the rows that are already wedged; createInvite now
--      sweeps per host before inserting so it can't happen again.
--
-- Idempotent: safe to run more than once.

-- ---------------------------------------------------------------------------
-- A. Public "has a contact channel" flag.
-- ---------------------------------------------------------------------------
-- STORED generated column: Postgres keeps it in sync with the two source
-- columns on every write, so there's no trigger to maintain and no way for
-- it to drift. The expression is immutable, which generated columns require.
alter table public.profiles
  add column if not exists has_contact boolean
  generated always as (
    telegram_handle is not null or email_contact is not null
  ) stored;

-- ---------------------------------------------------------------------------
-- B. Invite expiry frees the slot.
-- ---------------------------------------------------------------------------
-- Serves both the per-host sweep in createInvite and the "which slots are
-- held?" reads, which now carry an `expires_at > now()` predicate.
create index if not exists invites_host_active_expiry_idx
  on public.invites (host_id, expires_at)
  where status in ('unconfirmed', 'pending');

-- One-time unsticking of rows that are already past their TTL. Every one of
-- these is holding a slot it has no claim to. Re-running matches nothing
-- (the rows are no longer unconfirmed/pending), so this stays idempotent.
update public.invites
   set status = 'expired'
 where status in ('unconfirmed', 'pending')
   and expires_at < now();
