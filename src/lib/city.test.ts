import { describe, expect, it } from "vitest";
import {
  cityDisplayFromSlug,
  cityHrefSlug,
  formatCityUntil,
} from "@/lib/city";

describe("cityHrefSlug", () => {
  it("leaves plain ascii slugs intact", () => {
    expect(cityHrefSlug("chiang-mai")).toBe("chiang-mai");
  });

  it("URL-encodes non-ascii slugs reversibly", () => {
    const slug = "東京";
    const href = cityHrefSlug(slug);
    expect(href).not.toBe(slug); // actually encoded
    expect(decodeURIComponent(href)).toBe(slug); // round-trips
  });
});

describe("cityDisplayFromSlug", () => {
  it("title-cases hyphenated slugs", () => {
    expect(cityDisplayFromSlug("chiang-mai")).toBe("Chiang Mai");
    expect(cityDisplayFromSlug("new-york")).toBe("New York");
  });
});

describe("formatCityUntil", () => {
  const thisYear = new Date().getFullYear();

  it("omits the year for a same-year date", () => {
    const out = formatCityUntil(`${thisYear}-06-12`, "en");
    expect(out).not.toContain(String(thisYear));
    expect(out).toContain("12");
  });

  it("includes the year across a year boundary", () => {
    const next = thisYear + 1;
    const out = formatCityUntil(`${next}-06-12`, "en");
    expect(out).toContain(String(next));
  });

  it("keeps the typed calendar day (no UTC shift)", () => {
    // Parsed as local components, so the day never drifts to the 11th/13th.
    expect(formatCityUntil(`${thisYear}-06-12`, "en")).toContain("12");
  });
});
