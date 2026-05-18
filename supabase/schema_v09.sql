-- v0.9 — gender + public socials on profiles
--
-- gender: optional, three-way enum stored as text with a CHECK constraint.
-- Default null = "prefer not to say". Visible on the public card as a small
-- soft signal.
--
-- socials: four public links visible on the card without invite-accept.
-- Stored as raw username for X / Instagram / GitHub (no @ prefix) and as
-- a full https URL for website. Validation lives in the app layer so we
-- can give friendly errors; the DB only enforces length so a runaway
-- value can't bloat a row.

alter table public.profiles
  add column if not exists gender text
    check (gender in ('woman', 'man') or gender is null);

alter table public.profiles
  add column if not exists x_handle text
    check (x_handle is null or char_length(x_handle) between 1 and 30);

alter table public.profiles
  add column if not exists instagram_handle text
    check (instagram_handle is null or char_length(instagram_handle) between 1 and 30);

alter table public.profiles
  add column if not exists github_handle text
    check (github_handle is null or char_length(github_handle) between 1 and 39);

alter table public.profiles
  add column if not exists website_url text
    check (website_url is null or char_length(website_url) between 8 and 200);
