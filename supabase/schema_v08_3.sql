-- acoffee — v0.8.3 (Invite locale persistence) migration.
--
-- Adds invites.requester_locale so visitor-facing emails sent later
-- (accepted / declined, fired by the host's action) can be in the
-- locale the visitor was browsing in when they submitted. The cookie/
-- header that resolved their locale at submit time is long gone by the
-- time the host decides — stashing it on the row is the simplest path.
--
-- Run AFTER schema_v08_2.sql. Idempotent.

alter table invites
  add column if not exists requester_locale text not null default 'en'
  check (requester_locale in ('en', 'zh', 'ja'));
