# Database

Supabase Postgres. Migrations are **forward-only and applied by hand** in the
Supabase SQL editor — there is no CLI, no `config.toml`, and nothing runs them
automatically on deploy. Each file is idempotent, so re-applying one is a safe
no-op.

Numbered files are a historical record, not a description of the current
schema. They are never rewritten — v0.7's header states the rule outright:
keeping each change in its own file "lets us roll forward without rewriting
the originals". A file that creates a table which a later file drops stays
exactly as it was; read the chain, or read the summary below.

## What actually exists today

Three tables, all with RLS enabled:

| Table | Purpose | RLS shape |
|---|---|---|
| `profiles` | one row per auth user; the card | public read (column-restricted), owner writes |
| `invites` | visitor → host coffee requests | host reads/updates own; public insert |
| `availability_slots` | host's opt-in bookable times | public read, owner insert/delete |

Plus:

- `handle_new_user()` trigger on `auth.users` — creates the profile row with a
  `user_<8 hex>` placeholder handle.
- `avatars` storage bucket (public read, owner writes) — see `schema_v07_1.sql`.

Everything from the pre-Card product is gone: `pins`, `subscribers` (Phase 0),
`cafes`, `checkins`, `intents`, `intent_responses` and the `active_intents`
view (Phase 1). They are created by `schema.sql` / `schema_phase1.sql` and
dropped by `schema_v07.sql`. **A fresh bootstrap must not stop before v0.7** —
`pins` and `subscribers` are created without RLS, so halting between phase1
and v0.7 leaves two anon-readable-and-writable tables holding emails and IPs.

## Bootstrapping a fresh database

Run every file in this order — no skipping, no stopping early:

```
schema.sql
schema_phase1.sql
schema_v07.sql       schema_v07_1.sql
schema_v08.sql       schema_v08_2.sql  schema_v08_3.sql
schema_v08_4.sql     schema_v08_5.sql
schema_v09.sql  …  schema_v17.sql
schema_v18.sql
schema_v18_1.sql
```

`schema_v18_1.sql` goes last, and on an *existing* deployment it goes after the
app code that matches it — see below.

## Standing rules

**Adding a column to `profiles` means re-running `schema_v18_1.sql`.**
Contact columns are protected by column-level GRANTs, which are an allow-list
rebuilt from the live catalog. A newly added column is unreadable by `anon` and
`authenticated` until that file is re-run. The symptom is nasty: the field
reads back as null everywhere with no error.

**Two-part migrations deploy around the code.** When a migration removes
access the running code still depends on (v0.18 is the example), the additive
half ships first, then the code, then the restricting half. Each such file
says so in its header.

**The committed files can lag production.** Changes have been applied straight
to the dashboard without a migration before now — the v0.12 `mode` →
`requested_kind` change shipped that way and was only reconciled in v0.15.
Before trusting a file, check it against what the app actually reads and
writes (`src/lib/auth-queries.ts`, `src/app/[handle]/actions.ts`,
`src/app/profile/actions.ts`).

## Verifying a database matches

```sql
-- Every public table and whether RLS is on. Expect exactly the three above.
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as policies
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
 order by c.relrowsecurity, c.relname;

-- Contact columns must be unreadable by anon; the card's columns must not be.
select has_table_privilege ('anon', 'public.profiles', 'select')                    as table_level,   -- false
       has_column_privilege('anon', 'public.profiles', 'email_contact',   'select') as email_contact, -- false
       has_column_privilege('anon', 'public.profiles', 'telegram_handle', 'select') as telegram,      -- false
       has_column_privilege('anon', 'public.profiles', 'has_contact',     'select') as has_contact,   -- true
       has_column_privilege('anon', 'public.profiles', 'handle',          'select') as handle;        -- true
```
