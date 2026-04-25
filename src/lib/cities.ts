export type City = {
  slug: string;
  name: string;
  center: { lat: number; lng: number };
  zoom: number;
  bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number };
};

export const chiangMai: City = {
  slug: "chiang-mai",
  name: "Chiang Mai",
  center: { lat: 18.7883, lng: 98.9853 },
  zoom: 11,
  // Roughly the city + ring road + Nimman + Old City. Generous so suburb
  // pins still count.
  bbox: { minLat: 18.65, minLng: 98.85, maxLat: 18.92, maxLng: 99.12 },
};

export const cities: Record<string, City> = {
  [chiangMai.slug]: chiangMai,
};
