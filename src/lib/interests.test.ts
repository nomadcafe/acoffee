import { describe, expect, it } from "vitest";
import {
  MAX_INTERESTS,
  normaliseInterest,
  parseInterests,
  validateInterests,
} from "@/lib/interests";

describe("normaliseInterest", () => {
  it("lowercases and hyphenates whitespace", () => {
    expect(normaliseInterest("Trail Running")).toBe("trail-running");
    expect(normaliseInterest("  Web3  ")).toBe("web3");
  });

  it("strips a leading hash and underscores", () => {
    expect(normaliseInterest("#AI")).toBe("ai");
    expect(normaliseInterest("machine_learning")).toBe("machine-learning");
  });

  it("collapses hyphen runs and trims edge hyphens", () => {
    expect(normaliseInterest("--web--3--")).toBe("web-3");
  });

  it("drops disallowed characters", () => {
    expect(normaliseInterest("design!!")).toBe("design");
  });

  it("rejects too-short / too-long / empty results", () => {
    expect(normaliseInterest("a")).toBeNull();
    expect(normaliseInterest("x".repeat(25))).toBeNull();
    expect(normaliseInterest("!!!")).toBeNull();
    expect(normaliseInterest("   ")).toBeNull();
  });

  it("rejects non-strings", () => {
    expect(normaliseInterest(123)).toBeNull();
    expect(normaliseInterest(null)).toBeNull();
    expect(normaliseInterest(undefined)).toBeNull();
  });
});

describe("parseInterests", () => {
  it("normalises, dedupes (case-insensitive), preserves order", () => {
    expect(parseInterests(["AI", "ai", "Design"])).toEqual(["ai", "design"]);
  });

  it("drops unusable entries", () => {
    expect(parseInterests([" ", "x", "ok"])).toEqual(["ok"]);
  });

  it("returns [] for non-arrays", () => {
    expect(parseInterests("ai")).toEqual([]);
    expect(parseInterests(null)).toEqual([]);
  });

  it("caps at MAX_INTERESTS", () => {
    const many = ["aa", "bb", "cc", "dd", "ee", "ff", "gg"];
    expect(parseInterests(many)).toHaveLength(MAX_INTERESTS);
  });
});

describe("validateInterests", () => {
  it("accepts a clean list", () => {
    expect(validateInterests(["ai", "design"])).toEqual({
      ok: true,
      interests: ["ai", "design"],
    });
  });

  it("silently drops empty rows and dedupes", () => {
    expect(validateInterests(["", "ai", "AI"])).toEqual({
      ok: true,
      interests: ["ai"],
    });
  });

  it("rejects non-arrays and non-string elements", () => {
    expect(validateInterests("ai").ok).toBe(false);
    expect(validateInterests([123]).ok).toBe(false);
  });

  it("rejects an unusable tag with a message", () => {
    const r = validateInterests(["a"]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/usable tag/);
  });

  it("rejects more than MAX_INTERESTS distinct tags", () => {
    const seven = ["aa", "bb", "cc", "dd", "ee", "ff", "gg"];
    const r = validateInterests(seven);
    expect(r.ok).toBe(false);
  });
});
