/**
 * One-shot backfill: for every pin where city IS NULL, reverse-geocode
 * via Nominatim and write the result back. Rate-limited at 1 request /
 * 1.1s to stay under Nominatim's public-API ceiling and politeness rules.
 *
 * Usage (Node 20+):
 *   pnpm dlx tsx --env-file=.env.local scripts/backfill-pin-cities.ts
 *
 * Requires in env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY     (so we bypass RLS — anon can't update)
 *
 * Safe to re-run: the WHERE clause filters out pins that already have a
 * city, and the UPDATE is idempotent.
 */
import { createClient } from "@supabase/supabase-js";
import { reverseGeocodeCity } from "../src/lib/reverse-geo";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing env: need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Either add them to .env.local and re-run with --env-file=.env.local, " +
      "or export them in your shell first.",
  );
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data: rows, error } = await sb
    .from("pins")
    .select("id, lat, lng")
    .is("city", null);
  if (error) {
    console.error("Fetch failed:", error);
    process.exit(1);
  }
  const pins = rows ?? [];
  if (pins.length === 0) {
    console.log("Nothing to backfill — every pin already has a city.");
    return;
  }
  console.log(`Backfilling ${pins.length} pin(s)…`);

  let resolved = 0;
  let skipped = 0;
  for (const [i, p] of pins.entries()) {
    const city = await reverseGeocodeCity(
      p.lat as number,
      p.lng as number,
    );
    if (city) {
      const { error: updErr } = await sb
        .from("pins")
        .update({ city })
        .eq("id", p.id as string);
      if (updErr) {
        console.error(`  [${i + 1}/${pins.length}] ${p.id} → update failed:`, updErr.message);
        skipped += 1;
      } else {
        resolved += 1;
        console.log(`  [${i + 1}/${pins.length}] ${p.id} → ${city}`);
      }
    } else {
      skipped += 1;
      console.log(
        `  [${i + 1}/${pins.length}] ${p.id} → (no city — ocean / wilderness / API failed)`,
      );
    }
    // Nominatim public API: max 1 req/sec, with a politeness buffer.
    await new Promise((r) => setTimeout(r, 1_100));
  }

  console.log(
    `\nDone. Resolved: ${resolved} · Skipped: ${skipped} · Total: ${pins.length}`,
  );
}

main().catch((e) => {
  console.error("Backfill threw:", e);
  process.exit(1);
});
