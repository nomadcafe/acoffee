# Nomad Meetup

Phase 0 landing site: a global "where are nomads right now?" map where anyone
can drop a pin, plus an email list for the Chiang Mai launch of the full
meetup app. Product direction lives in [`docs/vision.md`](docs/vision.md).

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind v4**
- **MapLibre GL** + **react-map-gl** + **OpenFreeMap** tiles (no API key)
- **Supabase** (Postgres) for pins + subscribers — optional in dev (in-memory fallback)

## Run locally

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>.

Without Supabase env vars the app uses an in-memory store; pins and emails
reset whenever the dev server restarts. Good enough to click around.

## Connect Supabase (persistent / production)

1. Create a project at <https://supabase.com>.
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — Settings → API → `service_role` key
     (server-side only, never expose to the client)
4. Restart the dev server.

## Layout

```
src/
  app/
    page.tsx            landing page (server component)
    api/
      pins/route.ts     GET recent pins, POST a new pin
      subscribe/route.ts POST email subscription
  components/
    PinMap.tsx          MapLibre map + "I'm here" button (client)
    SubscribeForm.tsx   email capture (client)
  lib/
    store.ts            Supabase or in-memory store
    types.ts
supabase/
  schema.sql
docs/
  vision.md             product direction
```
