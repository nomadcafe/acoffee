-- acoffee — v0.8.4 (Host locale persistence) migration.
--
-- Adds profiles.locale so host-facing emails (new-invite notification)
-- can be sent in the host's preferred language. setLocale + updateProfile
-- both write to this column whenever the host touches a server action,
-- so the "preferred language" tracks the user's actual recent usage
-- without needing a separate settings UI.
--
-- Run AFTER schema_v08_3.sql. Idempotent.

alter table profiles
  add column if not exists locale text not null default 'en'
  check (locale in ('en', 'zh', 'ja'));
