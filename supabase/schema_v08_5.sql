-- acoffee — v0.8.5 (Visitor email verification) migration.
--
-- Adds a magic-link confirm step between "visitor submits invite form"
-- and "host receives the notification". Previously a fake email would
-- still wake the host's inbox; now no email reaches the host until the
-- visitor clicks the confirm link sent to the address they typed,
-- proving they own it.
--
-- Run AFTER schema_v08_4.sql. Idempotent.

-- Allow `unconfirmed` as a valid status. Drop+recreate the CHECK so
-- the enum-like set can grow without ALTER TYPE.
alter table invites drop constraint if exists invites_status_check;
alter table invites add constraint invites_status_check
  check (
    status in ('unconfirmed', 'pending', 'accepted', 'declined', 'expired')
  );

-- Random server-generated UUID powering the confirm link
-- (acoffee.com/invite/confirm/<token>). Unique so the column also
-- serves as the lookup index for the confirm route.
alter table invites
  add column if not exists confirm_token text unique;

-- When the visitor clicked the confirm link. Null until then; useful
-- for any future "unconfirmed N hours later" query.
alter table invites
  add column if not exists confirmed_at timestamptz;

-- Partial index for the confirm route's read path — narrow because we
-- only ever look up an invite by token while it's still unconfirmed.
create index if not exists invites_confirm_token_pending_idx
  on invites (confirm_token)
  where status = 'unconfirmed';
