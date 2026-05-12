// Nominatim (OpenStreetMap) reverse-geocoding. Chosen over Mapbox/OpenCage
// because (a) we already use OSM data via OpenFreeMap tiles, (b) it's free
// with no signup, (c) usage at our scale is well under the 1-req/sec limit.
//
// Usage policy: requires a descriptive User-Agent identifying the
// application (https://operations.osmfoundation.org/policies/nominatim/).
// Heavy use without explicit permission is forbidden — for >1 req/sec
// we'd need to self-host. Below the 0-user threshold this is fine.
//
// Returns null on any failure (timeout, rate-limit, no city in response,
// coords over water/wilderness). Caller treats null as "leave city column
// empty" — the pin still inserts, just won't aggregate into the cities
// panel until backfilled.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "acoffee/1.0 (https://acoffee.com)";
const TIMEOUT_MS = 3_000;

type NominatimAddress = {
  city?: string;
  town?: string;
  municipality?: string;
  village?: string;
  county?: string;
  state?: string;
  country?: string;
};

type NominatimResponse = {
  address?: NominatimAddress;
};

// City field varies by region — urban areas use `city`, smaller settlements
// use `town` or `village`, some places only have `municipality` or
// `county`. Pick the most specific available so e.g. Chiang Mai resolves
// to "Chiang Mai" not "Chiang Mai Province".
function pickCityName(addr: NominatimAddress): string | null {
  return (
    addr.city ??
    addr.town ??
    addr.municipality ??
    addr.village ??
    addr.county ??
    null
  );
}

export async function reverseGeocodeCity(
  lat: number,
  lng: number,
): Promise<string | null> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "json");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  // zoom=10 ≈ city-scale resolution. Higher zooms return street-level
  // addresses (too granular); lower return country/region (too coarse).
  url.searchParams.set("zoom", "10");
  url.searchParams.set("addressdetails", "1");

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResponse;
    return data.address ? pickCityName(data.address) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
