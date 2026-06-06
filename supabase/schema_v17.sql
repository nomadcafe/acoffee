-- v0.17 — remove the discovery surface.
--
-- acoffee dropped the browsable directory entirely: there is no longer a
-- /browse page or /city/[slug] listing, and cards are shared by direct
-- link only. Two profile columns existed solely to power that discovery
-- surface and are now unread by any code path:
--
--   * city_slug   — STORED generated slug (added in v0.12) used to look
--                   profiles up by city on the discovery pages. The public
--                   card now renders the city as plain text, so nothing
--                   reads it.
--   * discoverable — per-card opt-out of the city listing. With no listing
--                    to opt out of, the flag is meaningless.
--
-- Idempotent: safe to run more than once. DROP COLUMN cascades the partial
-- index on city_slug, but we drop it explicitly first so a re-run on a
-- DB where the column is already gone is still a clean no-op.
--
-- Ordering note: deploy the v0.17 application code (which no longer SELECTs
-- or writes either column) BEFORE running this, so no in-flight request
-- references a column mid-drop.

drop index if exists public.profiles_city_slug_idx;

alter table public.profiles
  drop column if exists city_slug;

alter table public.profiles
  drop column if exists discoverable;
