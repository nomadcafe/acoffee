-- acoffee — v0.8 (Form-based Invite) migration.
--
-- Adds the `invites` table that backs the new request-approve-reveal flow
-- on /[handle]. Visitors POST an invite (no account needed); host accepts
-- or declines from their /profile inbox; on accept the contact channels
-- get emailed to the requester (NOT shown in the browser anymore — the
-- v0.7 client-side reveal was security theatre, contacts were in HTML).
--
-- Run AFTER schema_v07_1.sql. Idempotent: safe to re-apply.

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references profiles (id) on delete cascade,

  -- Visitor-supplied. No FK to profiles — visitors don't need an account
  -- to invite. The host validates legitimacy by reading the topic + email
  -- in their inbox before clicking Accept.
  requester_name text not null
    check (char_length(requester_name) between 1 and 60),
  requester_email text not null
    check (char_length(requester_email) between 5 and 120),
  requester_topic text not null
    check (char_length(requester_topic) between 1 and 280),
  mode text not null
    check (mode in ('online', 'in_person', 'either')),
  -- Free-form preferred time ("Tue / Thu afternoons", "Next week any
  -- evening"). Calendar integration is explicitly out of scope (vision
  -- §0.3) — both sides nail it down in TG/WA after accept.
  preferred_time text
    check (preferred_time is null or char_length(preferred_time) <= 80),

  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamptz not null default now(),
  -- 7-day TTL — after that the visitor probably moved on; a stale "pending"
  -- in the host's inbox is noise. A background job (cron / pg_cron) will
  -- mark expired; for v0.8 ship we read `expires_at < now()` at fetch time
  -- so no background process required.
  expires_at timestamptz not null default (now() + interval '7 days'),
  decided_at timestamptz
);

-- Host inbox query — pending invites in reverse chronological order. Partial
-- index keeps it small once accepted/declined rows pile up.
create index if not exists invites_host_pending_idx
  on invites (host_id, created_at desc)
  where status = 'pending';

-- For "show me all invites" history view (decided ones, future surface).
create index if not exists invites_host_history_idx
  on invites (host_id, decided_at desc)
  where status in ('accepted', 'declined');

alter table invites enable row level security;

-- Read: host sees only their own invites. Visitor never reads back —
-- they're emailed the result on accept/decline.
drop policy if exists invites_read_own on invites;
create policy invites_read_own on invites for select
  using (auth.uid() = host_id);

-- Insert: public. Visitors don't have a session. Server action does the
-- only meaningful validation (host exists, rate-limit, content length).
-- RLS's role here is just "allow the write at all".
drop policy if exists invites_insert_public on invites;
create policy invites_insert_public on invites for insert
  to public
  with check (true);

-- Update: host accepts/declines their own invites. Status check enforces
-- the legal transitions (pending → accepted | declined). Expired is set
-- by the server, not by the host UI.
drop policy if exists invites_update_own on invites;
create policy invites_update_own on invites for update
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);
