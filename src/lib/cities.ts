// Cities surfaced on the home page. `status='open'` cities link to the full
// product; `status='building'` cities show their pin density + an inline
// subscribe so we can see which one is the natural next launch (vision §6
// "看哪个城市自然冒头最多" derived in the front-end).
export type CityStatus = "open" | "building";

export type City = {
  slug: string;
  name: string;
  status: CityStatus;
  center: { lat: number; lng: number };
  zoom: number;
  bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number };
  // UTC offset in hours. None of our current 4 cities observe DST except
  // Lisbon, which is BUILDING and won't have intents until it opens — when
  // it does we'll switch to IANA timezone strings + Intl.DateTimeFormat.
  utcOffsetHours: number;
};

export const chiangMai: City = {
  slug: "chiang-mai",
  name: "Chiang Mai",
  status: "open",
  center: { lat: 18.7883, lng: 98.9853 },
  zoom: 11,
  // Roughly the city + ring road + Nimman + Old City. Generous so suburb
  // pins still count.
  bbox: { minLat: 18.65, minLng: 98.85, maxLat: 18.92, maxLng: 99.12 },
  utcOffsetHours: 7, // ICT
};

export const bangkok: City = {
  slug: "bangkok",
  name: "Bangkok",
  status: "building",
  center: { lat: 13.7563, lng: 100.5018 },
  zoom: 11,
  bbox: { minLat: 13.55, minLng: 100.4, maxLat: 13.95, maxLng: 100.75 },
  utcOffsetHours: 7, // ICT
};

export const lisbon: City = {
  slug: "lisbon",
  name: "Lisbon",
  status: "building",
  center: { lat: 38.7223, lng: -9.1393 },
  zoom: 12,
  bbox: { minLat: 38.62, minLng: -9.27, maxLat: 38.83, maxLng: -9.05 },
  utcOffsetHours: 0, // WET / WEST — placeholder, revisit when Lisbon opens.
};

export const bali: City = {
  slug: "bali",
  name: "Bali",
  status: "building",
  // Centered around Canggu / Berawa, nomad heartland; bbox covers Ubud too.
  center: { lat: -8.6481, lng: 115.137 },
  zoom: 10,
  bbox: { minLat: -8.85, minLng: 115.0, maxLat: -8.15, maxLng: 115.45 },
  utcOffsetHours: 8, // WITA
};

export const HOMEPAGE_CITIES: City[] = [chiangMai, bangkok, lisbon, bali];

export const cities: Record<string, City> = Object.fromEntries(
  HOMEPAGE_CITIES.map((c) => [c.slug, c]),
);

// Resolve a dropped GPS point to a known city by bbox. Used by the pin-drop
// funnel on the home page to branch its CTA: open city → cafe directory;
// building city → city-specific subscribe; outside coverage → generic subscribe.
// First match wins; bboxes don't overlap in practice.
export function findCityByLatLng(lat: number, lng: number): City | null {
  for (const c of HOMEPAGE_CITIES) {
    if (
      lat >= c.bbox.minLat &&
      lat <= c.bbox.maxLat &&
      lng >= c.bbox.minLng &&
      lng <= c.bbox.maxLng
    ) {
      return c;
    }
  }
  return null;
}
