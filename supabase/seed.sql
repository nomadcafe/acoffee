-- Optional one-shot: pre-fill the map with ~80 seed pins across nomad
-- hubs so the world view doesn't look like a ghost town on day one.
-- Run once in the Supabase SQL editor, after schema.sql.
--
-- Safe to skip if you'd rather start from zero. Re-running adds another
-- batch (no de-dup), so only run once.

insert into pins (lat, lng, created_at)
select
  c.lat + (random() - 0.5) * 0.024,
  c.lng + (random() - 0.5) * 0.024,
  now() - ((row_number() over () % 30) || ' days')::interval
from (
  select unnest(array[
    'Chiang Mai','Bangkok','Bali Canggu','Bali Ubud','HCMC','Hanoi','Da Nang',
    'KL','Singapore','Taipei','Tokyo','Seoul','Hong Kong',
    'Lisbon','Porto','Madrid','Barcelona','Berlin','Amsterdam','Budapest',
    'Belgrade','Tbilisi','Istanbul','Warsaw',
    'CDMX','Oaxaca','Medellin','BA','Rio','Floripa','NYC','Austin','SF','YVR',
    'Cape Town','Marrakech','Tenerife','Dubai','Sydney'
  ]) as name,
  unnest(array[
    18.7883,13.7563,-8.6478,-8.5069,10.7769,21.0285,16.0544,
    3.139,1.3521,25.033,35.6762,37.5665,22.3193,
    38.7223,41.1579,40.4168,41.3851,52.52,52.3676,47.4979,
    44.7866,41.7151,41.0082,52.2297,
    19.4326,17.0732,6.2476,-34.6037,-22.9068,-27.5954,40.7128,30.2672,37.7749,49.2827,
    -33.9249,31.6295,28.2916,25.2048,-33.8688
  ]) as lat,
  unnest(array[
    98.9853,100.5018,115.1385,115.2625,106.7009,105.8542,108.2022,
    101.6869,103.8198,121.5654,139.6503,126.978,114.1694,
    -9.1393,-8.6291,-3.7038,2.1734,13.405,4.9041,19.0402,
    20.4489,44.8271,28.9784,21.0122,
    -99.1332,-96.7266,-75.5658,-58.3816,-43.1729,-48.548,-74.006,-97.7431,-122.4194,-123.1207,
    18.4241,-7.9811,-16.6291,55.2708,151.2093
  ]) as lng
) c
cross join generate_series(1, 2) -- two pins per city
;
