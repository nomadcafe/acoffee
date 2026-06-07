import { describe, expect, it } from "vitest";
import {
  addDaysToWall,
  formatShortDate,
  formatSlot,
  isValidTimeZone,
  localDateInZone,
  nowWallInZone,
  wallInZone,
  zonedWallToInstant,
} from "@/lib/datetime";

// A fixed instant: 2026-06-12 08:00 UTC == 15:00 in Asia/Bangkok (UTC+7).
const ISO = "2026-06-12T08:00:00.000Z";

describe("addDaysToWall + wallInZone (weekly slot copy)", () => {
  it("keeps the wall-clock time across a spring-forward DST change", () => {
    // Lisbon springs forward on 2026-03-29 (WET→WEST). A 3pm slot on the
    // 25th copied +7 days must still read 3pm on Apr 1, even though the
    // absolute instant shifts an hour — a naive +7×24h would land at 4pm.
    const tz = "Europe/Lisbon";
    const start = zonedWallToInstant("2026-03-25T15:00", tz);
    const next = zonedWallToInstant(
      addDaysToWall(wallInZone(start!, tz), 7),
      tz,
    );
    expect(wallInZone(next!, tz)).toBe("2026-04-01T15:00");
  });

  it("rolls the date across month boundaries, keeping the time", () => {
    expect(addDaysToWall("2026-01-28T09:30", 7)).toBe("2026-02-04T09:30");
  });

  it("wallInZone inverts zonedWallToInstant", () => {
    const tz = "Asia/Bangkok";
    const inst = zonedWallToInstant("2026-06-12T15:00", tz);
    expect(wallInZone(inst!, tz)).toBe("2026-06-12T15:00");
  });
});

describe("localDateInZone", () => {
  it("returns the calendar date in the given zone", () => {
    // 08:00 UTC is 15:00 same-day in Bangkok.
    expect(localDateInZone(new Date(ISO), "Asia/Bangkok")).toBe("2026-06-12");
  });

  it("rolls to the next/prev day across the zone's midnight", () => {
    // 22:00 UTC on the 12th is already the 13th in Bangkok (UTC+7 → 05:00),
    // but still the 12th in Los Angeles (UTC-7 → 15:00). This cross-midnight
    // case is exactly what the city_until slot binding must get right.
    const lateUtc = "2026-06-12T22:00:00.000Z";
    expect(localDateInZone(new Date(lateUtc), "Asia/Bangkok")).toBe("2026-06-13");
    expect(localDateInZone(new Date(lateUtc), "America/Los_Angeles")).toBe(
      "2026-06-12",
    );
  });

  it("falls back to the UTC date for a null or invalid zone", () => {
    expect(localDateInZone(new Date(ISO), null)).toBe("2026-06-12");
    expect(localDateInZone(new Date(ISO), "Not/AZone")).toBe("2026-06-12");
  });
});

describe("formatSlot", () => {
  it("renders the instant in the given timezone, with the zone labelled", () => {
    const out = formatSlot(ISO, "Asia/Bangkok", "en");
    expect(out).toContain("Asia/Bangkok");
    expect(out).toMatch(/3:00/); // 15:00 Bangkok → 3:00 PM
  });

  it("shifts the wall-clock with the timezone", () => {
    // Same instant, different zone → different local hour.
    const bangkok = formatSlot(ISO, "Asia/Bangkok", "en");
    const utc = formatSlot(ISO, "UTC", "en");
    expect(bangkok).not.toBe(utc);
    expect(utc).toMatch(/8:00/); // 08:00 UTC
  });

  it("falls back unlabelled when timezone is null", () => {
    const out = formatSlot(ISO, null, "en");
    expect(out).not.toContain("·");
  });

  it("does not throw on an invalid timezone", () => {
    expect(() => formatSlot(ISO, "Not/AZone", "en")).not.toThrow();
  });

  it("returns empty string for an invalid date", () => {
    expect(formatSlot("not-a-date", "UTC", "en")).toBe("");
  });
});

describe("zonedWallToInstant", () => {
  it("anchors the wall-clock to the given zone (UTC+7)", () => {
    // 15:00 in Bangkok (UTC+7, no DST) == 08:00 UTC.
    const out = zonedWallToInstant("2026-06-12T15:00", "Asia/Bangkok");
    expect(out?.toISOString()).toBe("2026-06-12T08:00:00.000Z");
  });

  it("treats the wall-clock as literal in UTC", () => {
    const out = zonedWallToInstant("2026-06-12T15:00", "UTC");
    expect(out?.toISOString()).toBe("2026-06-12T15:00:00.000Z");
  });

  it("honours DST for the instant (New York in June = EDT, UTC-4)", () => {
    const out = zonedWallToInstant("2026-06-12T15:00", "America/New_York");
    expect(out?.toISOString()).toBe("2026-06-12T19:00:00.000Z");
  });

  it("honours standard time for the instant (New York in Jan = EST, UTC-5)", () => {
    const out = zonedWallToInstant("2026-01-12T15:00", "America/New_York");
    expect(out?.toISOString()).toBe("2026-01-12T20:00:00.000Z");
  });

  it("round-trips through formatSlot in the same zone", () => {
    const inst = zonedWallToInstant("2026-06-12T15:00", "Asia/Bangkok");
    const shown = formatSlot(inst!.toISOString(), "Asia/Bangkok", "en");
    expect(shown).toMatch(/3:00/);
    expect(shown).toContain("Asia/Bangkok");
  });

  it("returns null on an unparseable wall string", () => {
    expect(zonedWallToInstant("not-a-time", "UTC")).toBeNull();
  });

  it("returns null on an invalid zone", () => {
    expect(zonedWallToInstant("2026-06-12T15:00", "Not/AZone")).toBeNull();
  });
});

describe("formatShortDate", () => {
  it("renders month, day, and year", () => {
    const out = formatShortDate("2026-06-05T12:00:00.000Z", "en");
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/5/);
  });

  it("follows the app locale, not the runtime default (zh → zh-CN)", () => {
    const zh = formatShortDate("2026-06-05T12:00:00.000Z", "zh");
    // zh-CN renders the month with the 月 marker.
    expect(zh).toContain("月");
  });

  it("returns empty string for an invalid date", () => {
    expect(formatShortDate("not-a-date", "en")).toBe("");
  });
});

describe("isValidTimeZone", () => {
  it("accepts real IANA names", () => {
    expect(isValidTimeZone("Asia/Bangkok")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
  });

  it("rejects junk, empty, and over-long input", () => {
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone("x".repeat(65))).toBe(false);
  });
});

describe("nowWallInZone", () => {
  it("formats as YYYY-MM-DDTHH:mm", () => {
    expect(nowWallInZone("Asia/Bangkok")).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    );
  });

  it("does not throw on an invalid zone", () => {
    expect(() => nowWallInZone("Not/AZone")).not.toThrow();
  });
});
