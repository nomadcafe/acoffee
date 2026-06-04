-- v0.15 — reconcile the invites schema with the v12 "kind" change.
--
-- v12 replaced the invite's online/in_person/either `mode` axis with
-- `requested_kind` (one of the host's coffee_chat_kinds, or null). The app
-- has shipped on that shape for a while — the insert path writes
-- `requested_kind` and never writes `mode`, and the inbox reads
-- `requested_kind` — but the migration that made the DB match was applied
-- out-of-band and never committed here. So the repo's invites schema
-- (schema_v08.sql: `mode text not null`, no `requested_kind`) no longer
-- describes production.
--
-- This forward migration closes that gap. It is idempotent and safe in
-- both directions:
--   • On production, where the change already happened: add-if-not-exists
--     is a no-op and drop-if-exists removes the long-dead `mode` column.
--   • On a fresh database, where v08 just created `mode not null` and no
--     `requested_kind`: this is the step that brings invites to the shape
--     the application code expects.
--
-- Run AFTER schema_v14.sql.

-- The kind the visitor asked for: one of the host's advertised
-- coffee_chat_kinds, or null (pre-v12 rows / visitor left it unset).
alter table public.invites
  add column if not exists requested_kind text;

alter table public.invites
  drop constraint if exists invites_requested_kind_check;
alter table public.invites
  add constraint invites_requested_kind_check
  check (
    requested_kind is null
    or requested_kind in ('coffee', 'cowork', 'dinner', 'hike', 'work_talk')
  );

-- `mode` is superseded and unread by any code path. Drop it so the table
-- matches the application. (No-op if a prior out-of-band migration already
-- removed it.)
alter table public.invites
  drop column if exists mode;
