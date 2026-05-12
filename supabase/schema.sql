-- Nomad Meetup — Phase 0 schema.
-- Run this once in your Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists pins (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  nickname text,
  ip text,
  -- Populated server-side via Nominatim reverse-geocoding after insert.
  -- Nullable: stays null when the geocoder fails or the lat/lng is over
  -- water / wilderness. The CitiesPanel aggregates only non-null rows.
  city text,
  created_at timestamptz not null default now()
);

-- Existing schemas need this column too — idempotent ADD COLUMN.
alter table pins add column if not exists city text;

create index if not exists pins_created_at_idx on pins (created_at desc);
create index if not exists pins_city_idx on pins (city) where city is not null;

create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  city text,
  created_at timestamptz not null default now()
);
