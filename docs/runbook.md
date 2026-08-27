# Runbook — is the thing actually working?

Queries for answering "is anyone using this, and if not, is it because
something is broken?" Run them in the Supabase SQL editor.

This file exists because that question went unanswered for two months.
Magic-link sign-in broke at the end of May 2026 and dropped 10 of 14 email
sign-ups — every one of them somebody who had clicked the link — and nothing
surfaced it. There was no error page, no alert, and no obvious place to look.
The queries below are the ones that eventually found it, written down so the
next diagnosis takes ten minutes instead of a month.

Read them in order. Each one narrows the previous one's answer.

---

## 1. The funnel, end to end

```sql
select
  (select count(*) from auth.users)                                        as signups,
  (select count(*) from auth.users where last_sign_in_at is not null)      as signed_in,
  (select count(*) from profiles
    where handle !~ '^user_[a-f0-9]{8}$')                                  as claimed_handle,
  (select count(*) from profiles where bio is not null or city is not null) as filled_card,
  (select count(*) from profiles where has_contact)                        as can_be_invited,
  (select count(*) from invites)                                           as invites_all_time,
  (select count(*) from availability_slots)                                as slots;
```

Each column is a strictly smaller set than the one before it, so the first
big drop is where to look. Baseline from 2026-08-15: 16 / 6 / 2 / 2 / 1 / 7 / 0.

`can_be_invited` deserves attention — a card without a contact channel
renders the "no contact yet" empty state instead of the invite button, so it
cannot receive anything. Handles still matching `user_<8 hex>` never finished
onboarding.

## 2. If `signups` → `signed_in` is where it drops

This is the one that hid for two months. The instinct is to read a null
`last_sign_in_at` as "they ignored the email" — it is not.

```sql
select count(*) filter (where email_confirmed_at is not null) as clicked_but_no_session,
       count(*) filter (where email_confirmed_at is null)     as never_clicked,
       count(*)                                               as total
  from auth.users
 where last_sign_in_at is null;
```

Supabase stamps `email_confirmed_at` when its verify endpoint is hit — that
is, **when the user clicks the link**. So a row with `email_confirmed_at` set
and `last_sign_in_at` null means the person clicked, got verified, and then
the session was never created. That is a broken callback, not disinterest.

The usual cause: `emailRedirectTo` is not in Supabase's allow-list, so the
magic link falls back to the Site URL root and `?code=` lands on `/` with
nothing to exchange it. Check **Authentication → URL Configuration → Redirect
URLs** contains `https://<site>/auth/callback`. `src/proxy.ts` forwards such
requests as a fallback and logs a warning when it fires — if that warning is
in the Vercel logs, the config is still wrong and only the fallback is saving
you.

Then split by sign-in method, because one path breaking while the other works
is what makes this invisible:

```sql
select i.provider,
       count(*)                                          as users,
       count(*) filter (where u.last_sign_in_at is null) as never_signed_in
  from auth.users u
  join auth.identities i on i.user_id = u.id
 group by i.provider
 order by users desc;
```

Google succeeding while email fails still looks like "some sign-ups work".

And the timeline, to tie a regression to a deploy:

```sql
select date_trunc('day', created_at)::date              as day,
       count(*) filter (where last_sign_in_at is null)     as never_in,
       count(*) filter (where last_sign_in_at is not null) as signed_in
  from auth.users
 group by 1 order by 1;
```

## 3. Invite flow health

```sql
select status, count(*), min(created_at)::date as oldest, max(created_at)::date as newest
  from invites
 group by status
 order by count desc;
```

`unconfirmed` rows older than an hour are dead — the confirm link expired
(see `UNCONFIRMED_INVITE_TTL_MS` in `src/lib/types.ts`). A high ratio of
never-confirmed invites means the confirm email is slow or not arriving:

```sql
select count(*) filter (where confirmed_at is null and status = 'expired') as never_confirmed,
       count(*) filter (where confirmed_at is not null)                    as confirmed
  from invites
 where created_at > now() - interval '14 days';
```

Over a third never confirmed is a signal to widen the window. Note that a
confirm email which fails outright no longer leaves a row at all — the invite
is rolled back and the visitor is told — so these counts only cover emails
that were accepted by the provider and then ignored.

Failed contact hand-offs on accepted invites are recorded on the row:

```sql
select id, requester_email, last_email_error, decided_at
  from invites
 where status = 'accepted' and contact_emailed_at is null
 order by decided_at desc;
```

## 4. Privileges still correct

Contact columns are protected by column GRANTs, which are easy to undo by
accident — adding a column to `profiles` and re-running the wrong file is
enough. See `supabase/README.md`.

```sql
select has_table_privilege ('anon', 'public.profiles', 'select')                    as table_level,   -- false
       has_column_privilege('anon', 'public.profiles', 'email_contact',   'select') as email_contact, -- false
       has_column_privilege('anon', 'public.profiles', 'telegram_handle', 'select') as telegram,      -- false
       has_column_privilege('anon', 'public.profiles', 'has_contact',     'select') as has_contact,   -- true
       has_column_privilege('anon', 'public.profiles', 'handle',          'select') as handle;        -- true
```

Any of the first three coming back true means every user's contact details
are readable by anyone holding the anon key, which ships in the browser
bundle.

## 5. Testing the front door by hand

Queries only show what already happened. Once a quarter, or after touching
auth, sign up with an address never used before — **via the email magic link,
not the Google button**, since they take different callback paths and only
one of them has ever broken. Confirm the row lands with `last_sign_in_at`
set:

```sql
select u.email, i.provider, u.created_at, u.email_confirmed_at, u.last_sign_in_at
  from auth.users u
  join auth.identities i on i.user_id = u.id
 order by u.created_at desc
 limit 3;
```

Delete the test account afterwards from `/profile` (it goes through
`deleteAccount`, which removes the auth user, the profile row, and the
avatar) so it stays out of the numbers in §1.

## 6. Is anything being throttled?

`rate_limit_hits` is a live record of what the limiter has been counting, and
the key prefix says which control fired. Unlike everything else in this file
it answers a question about *right now*, so it's the first place to look when
someone reports "it says I'm sending too many".

```sql
select split_part(key, ':', 1) || ':' || split_part(key, ':', 2) as control,
       count(*)                                                  as hits,
       count(distinct key)                                       as distinct_keys,
       max(hit_at)                                               as latest
  from rate_limit_hits
 where hit_at > now() - interval '24 hours'
 group by 1
 order by hits desc;
```

Prefixes: `invite:<ip>` (per-IP submissions), `invite:to:<email>` (per
recipient), `invite:global` (the ceiling), `signin:ip:` / `signin:email:`.
An empty table after real traffic means the app never reached the RPC — check
the Vercel logs for `[rate-limit] durable check unavailable`, which is emitted
once per process when the durable check falls back to the in-memory window.

Rows live for two days, so this is a rolling window, not history. Nothing
here counts *rejected* attempts — a hit is recorded only when a call is
allowed — so these numbers are legitimate-looking traffic, not attacks. The
rejections are in the Vercel logs:

```
[invite] rate-limited                    -- per-IP window
[invite] recipient rate-limited          -- one address being mailed a lot
[invite] captcha rejected                -- token missing, expired, or refused
[invite] GLOBAL ceiling hit              -- 60/hour of invites got through
```

The last one should never appear. At the §1 baseline it is roughly a hundred
times normal volume, so it means either something is very wrong or the
product got very popular in one afternoon; either way invites are paused
until the window rolls and someone should look.

Who is being hit hardest, when one of those warnings is showing up:

```sql
select key, count(*) as hits, min(hit_at) as first_seen, max(hit_at) as last_seen
  from rate_limit_hits
 where hit_at > now() - interval '6 hours'
 group by key
 having count(*) > 3
 order by hits desc
 limit 20;
```

To lift a block for one caller (a real person caught by a shared office IP,
say) delete their rows — the window is computed from what's in the table, so
this takes effect immediately:

```sql
delete from rate_limit_hits where key = 'invite:203.0.113.7';
```
