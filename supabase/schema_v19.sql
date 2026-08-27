-- v0.19 — durable rate limiting.
--
-- Additive only, and safe to run before or after the matching app code:
-- `checkRateLimitDurable` falls back to the in-memory limiter (and logs
-- once) whenever this function isn't there yet.
--
-- ─────────────────────────── what this fixes ───────────────────────────
--
-- `src/lib/rate-limit.ts` keeps its sliding window in a module-level Map.
-- That works on one long-lived Node process and is close to useless on
-- Vercel: every serverless instance carries its own Map, so the effective
-- limit is (configured limit × number of live instances), and a burst is
-- exactly what makes Vercel spin up more of them. The endpoint that
-- matters is `createInvite` — unauthenticated, and it sends mail to a
-- visitor-typed address with visitor-typed text in it. Turnstile (v0.19
-- app code) is the first line there; this is the one that actually counts.
--
-- Shape: one row per hit, sliding window computed at read time. A counter
-- column would be cheaper but can't express "3 per 5 min AND 10 per hour"
-- over the same key without either a row per window or a fixed-bucket
-- approximation that lets a burst straddle a bucket boundary.
--
-- Idempotent: safe to run more than once.

create table if not exists public.rate_limit_hits (
  id bigint generated always as identity primary key,
  -- Opaque, caller-composed: "invite:<ip>", "signin:email:<addr>", …
  -- Not a foreign key to anything on purpose — an IP is not a user, and
  -- this table must stay writable for callers with no identity at all.
  key text not null,
  hit_at timestamptz not null default now()
);

-- Every read is "hits for this key, newer than X", so the composite index
-- is the whole access pattern.
create index if not exists rate_limit_hits_key_time_idx
  on public.rate_limit_hits (key, hit_at desc);
-- Used only by the global sweep inside the function below.
create index if not exists rate_limit_hits_time_idx
  on public.rate_limit_hits (hit_at);

-- RLS on with no policies at all: the table is service-role only. anon and
-- authenticated must never read it — the keys are IPs and email addresses.
alter table public.rate_limit_hits enable row level security;
revoke all on public.rate_limit_hits from anon, authenticated;

-- How long a hit is kept once no window can still care about it. The
-- longest window in the app is 24h (sendMagicLink's daily cap), so a day
-- of slack past that is plenty.
--
-- p_windows is [{"seconds": 300, "max": 3}, …]; the most restrictive
-- window decides, matching the in-memory limiter's semantics exactly.
create or replace function public.check_rate_limit(
  p_key text,
  p_windows jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w record;
  cnt int;
  oldest timestamptz;
  longest int := 0;
begin
  if p_key is null or p_key = '' or jsonb_typeof(p_windows) <> 'array' then
    raise exception 'check_rate_limit: bad arguments';
  end if;

  -- Serialise concurrent checks of the same key for the rest of this
  -- transaction. Without it two simultaneous requests can both read
  -- count = max - 1 and both insert, which is precisely the burst the
  -- limiter exists to stop. Per-key, so unrelated callers never wait.
  perform pg_advisory_xact_lock(hashtext(p_key));

  select coalesce(max((x->>'seconds')::int), 0)
    into longest
    from jsonb_array_elements(p_windows) x;

  -- This key's own expired hits: nothing can count them again.
  delete from public.rate_limit_hits
   where key = p_key
     and hit_at < now() - make_interval(secs => longest);

  for w in
    select (x->>'seconds')::int as secs, (x->>'max')::int as max
      from jsonb_array_elements(p_windows) x
  loop
    select count(*), min(hit_at)
      into cnt, oldest
      from public.rate_limit_hits
     where key = p_key
       and hit_at > now() - make_interval(secs => w.secs);

    if cnt >= w.max then
      -- Retry-after is when the oldest hit in this window falls out of it.
      return jsonb_build_object(
        'allowed', false,
        'retry_after_sec',
        greatest(
          1,
          ceil(extract(epoch from
            (oldest + make_interval(secs => w.secs)) - now()))::int
        )
      );
    end if;
  end loop;

  insert into public.rate_limit_hits (key) values (p_key);

  -- Housekeeping. There is no cron in this project, so the sweep rides the
  -- traffic: roughly one call in a hundred pays for it. Per-key pruning
  -- above only ever touches keys that come back, and the long tail — an IP
  -- seen once, ever — is most of the table.
  if random() < 0.01 then
    delete from public.rate_limit_hits
     where hit_at < now() - interval '2 days';
  end if;

  return jsonb_build_object('allowed', true, 'retry_after_sec', 0);
end;
$$;

-- Service role only. It bypasses RLS anyway; this makes the intent explicit
-- and stops a future `grant all … to authenticated` from opening it up.
revoke all on function public.check_rate_limit(text, jsonb)
  from public, anon, authenticated;

-- Verification:
--
--   select public.check_rate_limit('probe:demo', '[{"seconds":60,"max":2}]');
--   -- expect: {"allowed": true, "retry_after_sec": 0}   (twice)
--   -- expect: {"allowed": false, "retry_after_sec": …}  (third call)
--   delete from public.rate_limit_hits where key = 'probe:demo';
