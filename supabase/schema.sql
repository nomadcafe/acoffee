-- Nomad Meetup — Phase 0 schema.
-- Run this once in your Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists pins (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  nickname text,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists pins_created_at_idx on pins (created_at desc);

create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  city text,
  created_at timestamptz not null default now()
);
