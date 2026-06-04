import { describe, expect, it } from "vitest";
import { formatSlot } from "@/lib/datetime";

// A fixed instant: 2026-06-12 08:00 UTC == 15:00 in Asia/Bangkok (UTC+7).
const ISO = "2026-06-12T08:00:00.000Z";

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
