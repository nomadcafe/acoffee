-- v0.14 — invite contact-delivery confidence.
--
-- On Accept, the host's contact channels are emailed to the visitor — that
-- email is the ONLY way the hand-off happens (contacts are never in the
-- page). Until now sendEmail was fire-and-forget: a failed accept-email
-- left the host thinking the connection was made while the visitor got
-- nothing, with no record anywhere.
--
-- These two columns record the outcome of that send so the host's inbox
-- can flag "couldn't deliver — resend" and a resend action can clear it.
-- Both null on a fresh/pending invite; set when an accept-email is
-- attempted. Idempotent — safe to re-apply.

alter table public.invites
  add column if not exists contact_emailed_at timestamptz;

alter table public.invites
  add column if not exists last_email_error text;
