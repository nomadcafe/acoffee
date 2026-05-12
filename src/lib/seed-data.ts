// Seed locations to keep the world map from looking like a ghost town
// before real users arrive. Coordinates are city centres; per pin we add
// a small random jitter so clusters look organic, not stacked.

type SeedCity = { name: string; lat: number; lng: number; pins: number };

export const seedCities: SeedCity[] = [
  // SE Asia
  { name: "Chiang Mai", lat: 18.7883, lng: 98.9853, pins: 4 },
  { name: "Bangkok", lat: 13.7563, lng: 100.5018, pins: 3 },
  { name: "Bali (Canggu)", lat: -8.6478, lng: 115.1385, pins: 4 },
  { name: "Bali (Ubud)", lat: -8.5069, lng: 115.2625, pins: 2 },
  { name: "Ho Chi Minh City", lat: 10.7769, lng: 106.7009, pins: 2 },
  { name: "Hanoi", lat: 21.0285, lng: 105.8542, pins: 2 },
  { name: "Da Nang", lat: 16.0544, lng: 108.2022, pins: 2 },
  { name: "Kuala Lumpur", lat: 3.139, lng: 101.6869, pins: 2 },
  { name: "Singapore", lat: 1.3521, lng: 103.8198, pins: 2 },
  // East Asia
  { name: "Taipei", lat: 25.033, lng: 121.5654, pins: 3 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503, pins: 3 },
  { name: "Seoul", lat: 37.5665, lng: 126.978, pins: 2 },
  { name: "Hong Kong", lat: 22.3193, lng: 114.1694, pins: 2 },
  // Europe
  { name: "Lisbon", lat: 38.7223, lng: -9.1393, pins: 4 },
  { name: "Porto", lat: 41.1579, lng: -8.6291, pins: 2 },
  { name: "Madrid", lat: 40.4168, lng: -3.7038, pins: 2 },
  { name: "Barcelona", lat: 41.3851, lng: 2.1734, pins: 3 },
  { name: "Berlin", lat: 52.52, lng: 13.405, pins: 3 },
  { name: "Amsterdam", lat: 52.3676, lng: 4.9041, pins: 2 },
  { name: "Budapest", lat: 47.4979, lng: 19.0402, pins: 2 },
  { name: "Belgrade", lat: 44.7866, lng: 20.4489, pins: 2 },
  { name: "Tbilisi", lat: 41.7151, lng: 44.8271, pins: 2 },
  { name: "Istanbul", lat: 41.0082, lng: 28.9784, pins: 2 },
  { name: "Warsaw", lat: 52.2297, lng: 21.0122, pins: 1 },
  // Americas
  { name: "Mexico City", lat: 19.4326, lng: -99.1332, pins: 4 },
  { name: "Oaxaca", lat: 17.0732, lng: -96.7266, pins: 2 },
  { name: "Medellín", lat: 6.2476, lng: -75.5658, pins: 3 },
  { name: "Buenos Aires", lat: -34.6037, lng: -58.3816, pins: 2 },
  { name: "Rio de Janeiro", lat: -22.9068, lng: -43.1729, pins: 2 },
  { name: "Florianópolis", lat: -27.5954, lng: -48.548, pins: 1 },
  { name: "New York", lat: 40.7128, lng: -74.006, pins: 3 },
  { name: "Austin", lat: 30.2672, lng: -97.7431, pins: 2 },
  { name: "San Francisco", lat: 37.7749, lng: -122.4194, pins: 2 },
  { name: "Vancouver", lat: 49.2827, lng: -123.1207, pins: 1 },
  // Africa & Middle East
  { name: "Cape Town", lat: -33.9249, lng: 18.4241, pins: 3 },
  { name: "Marrakech", lat: 31.6295, lng: -7.9811, pins: 2 },
  { name: "Tenerife", lat: 28.2916, lng: -16.6291, pins: 2 },
  { name: "Dubai", lat: 25.2048, lng: 55.2708, pins: 2 },
  // Oceania
  { name: "Sydney", lat: -33.8688, lng: 151.2093, pins: 1 },
];

// Deterministic-ish jitter so seeds don't shift between renders.
function jitter(seed: number): number {
  // Returns ~ -0.012..0.012 degrees (~ ±1.3km)
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return ((x - Math.floor(x)) - 0.5) * 0.024;
}

export type SeedPin = {
  lat: number;
  lng: number;
  nickname: string | null;
  city: string;
};

export function buildSeedPins(): SeedPin[] {
  const out: SeedPin[] = [];
  let i = 0;
  for (const city of seedCities) {
    for (let n = 0; n < city.pins; n++) {
      i++;
      out.push({
        lat: city.lat + jitter(i * 2),
        lng: city.lng + jitter(i * 2 + 1),
        nickname: null,
        city: city.name,
      });
    }
  }
  return out;
}

// Small subset of Phase 1's full 30-row Chiang Mai seed (see
// supabase/seed_chiang_mai_cafes.sql). Used in dev mode without Supabase so
// /chiang-mai/cafes isn't empty. Two per neighborhood, varied tags.
export type SeedCafe = {
  slug: string;
  name: string;
  city: string;
  neighborhood: string;
  lat: number;
  lng: number;
  hasWifi: boolean;
  hasOutlets: boolean;
  laptopFriendly: boolean;
};

export const seedCafes: SeedCafe[] = [
  { slug: "camp-maya-mall",        name: "CAMP @ Maya Mall",          city: "chiang-mai", neighborhood: "Nimman",    lat: 18.8021, lng: 98.9678, hasWifi: true, hasOutlets: true,  laptopFriendly: true },
  { slug: "my-secret-cafe-in-town",name: "My Secret Cafe in Town",    city: "chiang-mai", neighborhood: "Nimman",    lat: 18.7977, lng: 98.9667, hasWifi: true, hasOutlets: true,  laptopFriendly: true },
  { slug: "graph-cafe",            name: "Graph Café",                city: "chiang-mai", neighborhood: "Old City",  lat: 18.7892, lng: 98.9858, hasWifi: true, hasOutlets: false, laptopFriendly: false },
  { slug: "free-bird-cafe",        name: "Free Bird Café",            city: "chiang-mai", neighborhood: "Old City",  lat: 18.7949, lng: 98.9849, hasWifi: true, hasOutlets: true,  laptopFriendly: true },
  { slug: "akha-ama-santitham",    name: "Akha Ama Coffee (Santitham)", city: "chiang-mai", neighborhood: "Santitham", lat: 18.7995, lng: 98.9842, hasWifi: true, hasOutlets: true,  laptopFriendly: true },
  { slug: "bart-coffee",           name: "Bart Coffee",               city: "chiang-mai", neighborhood: "Santitham", lat: 18.8030, lng: 98.9819, hasWifi: true, hasOutlets: true,  laptopFriendly: true },
  { slug: "khagee",                name: "Khagee Cafe",               city: "chiang-mai", neighborhood: "East Bank", lat: 18.7837, lng: 98.9981, hasWifi: true, hasOutlets: false, laptopFriendly: false },
  { slug: "woo-cafe",              name: "Woo Cafe",                  city: "chiang-mai", neighborhood: "East Bank", lat: 18.7898, lng: 99.0001, hasWifi: true, hasOutlets: true,  laptopFriendly: true },
];
