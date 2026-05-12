-- acoffee — Chiang Mai cafés seed (Phase 1).
--
-- 30 cafés across 5 neighborhoods. Compiled from public sources + general
-- Chiang Mai nomad knowledge as of model training, NOT field-verified.
--
-- IMPORTANT — read before running in production:
--   1. Some cafés may have closed, relocated, or stopped being laptop-friendly.
--      Rows marked `[verify]` in inline comments are my lower-confidence guesses.
--   2. lat/lng are neighborhood approximations, NOT real geocoded points. A
--      follow-up script using Google Places API should backfill exact
--      coordinates + google_place_id. Map markers will be visibly off until
--      then.
--   3. The three booleans (has_wifi / has_outlets / laptop_friendly) are
--      educated guesses. Outlets in particular vary by seat and are easy
--      to get wrong.
--
-- Safe to re-run: `on conflict (slug) do nothing` keeps any hand-edits in DB.
--
-- Prereq: supabase/schema_phase1.sql applied (defines `cafes`).

insert into cafes (slug, name, city, neighborhood, lat, lng, has_wifi, has_outlets, laptop_friendly) values
  -- Nimman / Nimmanhaemin (9) — primary nomad hub
  ('camp-maya-mall',           'CAMP @ Maya Mall',              'chiang-mai', 'Nimman',     18.8021, 98.9678, true, true,  true),
  ('my-secret-cafe-in-town',   'My Secret Cafe in Town',        'chiang-mai', 'Nimman',     18.7977, 98.9667, true, true,  true),
  ('ristr8to',                 'Ristr8to',                      'chiang-mai', 'Nimman',     18.7972, 98.9676, true, false, false),
  ('wake-up-nimman',           'Wake Up @ Nimman',              'chiang-mai', 'Nimman',     18.7988, 98.9680, true, true,  true),
  ('the-barn-nimman',          'The Barn Eatery and Design',    'chiang-mai', 'Nimman',     18.7985, 98.9669, true, true,  true),
  ('roast8ry',                 'Roast8ry',                      'chiang-mai', 'Nimman',     18.7997, 98.9669, true, false, false),
  ('coffeeco-one-nimman',      'CoffeeCo at One Nimman',        'chiang-mai', 'Nimman',     18.8014, 98.9669, true, true,  true),
  ('akha-ama-hussadhisawee',   'Akha Ama Coffee (Hussadhisawee)', 'chiang-mai', 'Nimman',   18.7969, 98.9728, true, true,  true),
  ('cinnamonn-toast',          'Cinnamonn Toast',               'chiang-mai', 'Nimman',     18.7996, 98.9707, true, false, false), -- [verify]

  -- Old City (within the moat) (8)
  ('graph-cafe',               'Graph Café',                    'chiang-mai', 'Old City',   18.7892, 98.9858, true, false, false),
  ('akha-ama-phra-singh',      'Akha Ama (Phra Singh)',         'chiang-mai', 'Old City',   18.7882, 98.9826, true, false, false),
  ('free-bird-cafe',           'Free Bird Café',                'chiang-mai', 'Old City',   18.7949, 98.9849, true, true,  true),
  ('fern-forest-cafe',         'Fern Forest Café',              'chiang-mai', 'Old City',   18.7884, 98.9909, true, true,  true),
  ('the-larder-cafe',          'The Larder Cafe',               'chiang-mai', 'Old City',   18.7855, 98.9854, true, false, false),
  ('blue-diamond',             'BlueDiamond Breakfast Club',    'chiang-mai', 'Old City',   18.7949, 98.9920, true, true,  true),
  ('birds-nest-cafe',          'Birds Nest Cafe',               'chiang-mai', 'Old City',   18.7864, 98.9821, true, false, false),
  ('story-cafe-old-city',      'Story Café',                    'chiang-mai', 'Old City',   18.7919, 98.9882, true, true,  true), -- [verify]

  -- Santitham (6) — quieter, less touristy
  ('akha-ama-santitham',       'Akha Ama Coffee (Santitham)',   'chiang-mai', 'Santitham',  18.7995, 98.9842, true, true,  true),
  ('a-cup-of-sugar',           'A Cup of Sugar Pastry Shop',    'chiang-mai', 'Santitham',  18.8000, 98.9786, true, false, false),
  ('bart-coffee',              'Bart Coffee',                   'chiang-mai', 'Santitham',  18.8030, 98.9819, true, true,  true),
  ('penguin-ghetto',           'Penguin Ghetto',                'chiang-mai', 'Santitham',  18.8025, 98.9806, true, false, false),
  ('roastniyom-coffee',        'Roastniyom Coffee',             'chiang-mai', 'Santitham',  18.8040, 98.9789, true, true,  true),
  ('hello-strangers',          'Hello Strangers',               'chiang-mai', 'Santitham',  18.8004, 98.9818, true, false, false), -- [verify]

  -- East Bank (Wat Ket / Charoenrat — along the Ping River east side) (5)
  ('khagee',                   'Khagee Cafe',                   'chiang-mai', 'East Bank',  18.7837, 98.9981, true, false, false),
  ('hillkoff-charoenrat',      'Hillkoff Riverside',            'chiang-mai', 'East Bank',  18.7855, 98.9988, true, true,  true),
  ('woo-cafe',                 'Woo Cafe',                      'chiang-mai', 'East Bank',  18.7898, 99.0001, true, true,  true),
  ('94-coffee',                '94 Coffee',                     'chiang-mai', 'East Bank',  18.7910, 99.0010, true, false, false),
  ('cottontree-cafe',          'Cottontree Cafe',               'chiang-mai', 'East Bank',  18.7889, 98.9979, true, true,  true), -- [verify]

  -- Hang Dong / outer south (2) — further out, weekend / car-friendly
  ('forest-bake',              'Forest Bake',                   'chiang-mai', 'Hang Dong',  18.7430, 98.9520, true, true,  true),
  ('brown-eyes-coffee',        'Brown Eyes Coffee',             'chiang-mai', 'Hang Dong',  18.7395, 98.9512, true, false, false) -- [verify]
on conflict (slug) do nothing;
