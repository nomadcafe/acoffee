-- v0.16 — opt-in coffee scheduling (host time slots).
--
-- Lets a host publish concrete times they're free. A visitor picks one
-- when inviting; the pick is "held" while the invite is unconfirmed /
-- pending, "booked" on accept, and released automatically when the invite
-- is declined or expires (its status leaves the active set below). Default
-- OFF — hosts who never enable it keep the free-form preferred_time hint.
--
-- Timezone: starts_at is an absolute instant (timestamptz). The host's tz
-- (profiles.timezone, IANA) is captured from the browser when they add a
-- slot and used only to *display* the instant in their local time. No
-- server-side tz math.
--
-- Run AFTER schema_v15.sql. Idempotent.

-- Opt-in flag + the host's timezone for display.
alter table public.profiles
  add column if not exists scheduling_enabled boolean not null default false;
alter table public.profiles
  add column if not exists timezone text;

-- Concrete one-off slots a host offers.
create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists availability_slots_host_idx
  on public.availability_slots (host_id, starts_at);

alter table public.availability_slots enable row level security;

-- Public read: the invite form (incl. anonymous visitors) shows a host's
-- free slots. Slots are "I'm free then" — not sensitive. Same posture as
-- profiles_read.
drop policy if exists availability_slots_read on public.availability_slots;
create policy availability_slots_read
  on public.availability_slots for select
  using (true);

-- Owner-only insert / delete, scoped to the signed-in host.
drop policy if exists availability_slots_insert_own on public.availability_slots;
create policy availability_slots_insert_own
  on public.availability_slots for insert
  with check (host_id = auth.uid());

drop policy if exists availability_slots_delete_own on public.availability_slots;
create policy availability_slots_delete_own
  on public.availability_slots for delete
  using (host_id = auth.uid());

-- The slot a visitor picked. ON DELETE SET NULL so removing a slot never
-- orphans an invite row (removeSlot already refuses to delete a slot with
-- an active invite, so in practice this only fires for stale/declined rows).
alter table public.invites
  add column if not exists slot_id uuid
  references public.availability_slots (id) on delete set null;

-- Double-booking guard: at most one *active* invite per slot. A second
-- pick of the same slot fails with a unique violation (23505), which the
-- create-invite action surfaces as "that time was just taken". The slot
-- frees the moment an invite leaves this status set (declined / expired).
create unique index if not exists invites_slot_active_idx
  on public.invites (slot_id)
  where slot_id is not null
    and status in ('unconfirmed', 'pending', 'accepted');
