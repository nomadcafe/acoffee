# acoffee

**Coffee in bio — your friendly coffee chat page.**

acoffee is a personal page where other people can invite you for coffee.
Think *link in bio*, but instead of "see my links" the call-to-action is
*"let's grab a coffee."*

You make a card at `acoffee.com/your-handle`. You write a line about what
you're working on and what you'd love to chat about. You add a contact —
Telegram, WhatsApp, or email. Then you share the link in a tweet, a Slack,
or a DM. Anyone who wants to talk clicks **Invite for coffee**, your
contact channels appear, and you take it from there. Online or in person —
your call.

## Who it's for

Builders, digital nomads, founders, indie creators, AI / domain / web3
folks, and anyone who likes meeting interesting people over coffee without
the LinkedIn formality.

acoffee is **not** a meetup app, a city directory, or a dating site. It's
just a page that makes you easy to invite.

## What a card looks like

Each card at `acoffee.com/{handle}` has:

- An initials avatar + display name
- The city you want to be found in
- A one-line status (up to 140 characters) — what you're up to,
  what you'd love to chat about
- Tags for what you're up for: ☕ Coffee · 💻 Cowork · 🍜 Dinner ·
  🥾 Hike · 💼 Work talk
- A contact channel (Telegram / WhatsApp / email) that stays hidden
  until someone clicks **Invite for coffee**

The whole flow from sign-in to a shareable URL takes about three minutes.

## Status

Open beta. Free to claim a handle. No paid tier, no algorithm, no chat
inbox — just your card and the people who decide to use it. Product
direction is tracked in [`docs/vision.md`](docs/vision.md).

## Running it locally

```bash
pnpm install
pnpm dev
```

The app expects a Supabase project (Auth + a `profiles` table). Run the
SQL files in [`supabase/`](supabase/) in order — `schema.sql`,
`schema_phase1.sql`, then `schema_v07.sql` — copy `.env.example` to
`.env.local`, and fill in your project URL and keys.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase
(Postgres + Auth).
