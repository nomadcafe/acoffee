import { describe, expect, it } from "vitest";
import { deriveDisplayName, parseChatKinds, parseGender } from "@/lib/profile";

describe("deriveDisplayName", () => {
  it("title-cases underscore-separated handles", () => {
    expect(deriveDisplayName("alex_nomad")).toBe("Alex Nomad");
    expect(deriveDisplayName("bob")).toBe("Bob");
    expect(deriveDisplayName("user_a1b2")).toBe("User A1b2");
  });

  it("falls back to the raw handle when title-casing yields nothing", () => {
    expect(deriveDisplayName("___")).toBe("___");
  });
});

describe("parseChatKinds", () => {
  it("keeps only known kinds", () => {
    expect(parseChatKinds(["coffee", "hike", "bogus"])).toEqual([
      "coffee",
      "hike",
    ]);
  });

  it("returns [] for non-arrays", () => {
    expect(parseChatKinds(null)).toEqual([]);
    expect(parseChatKinds("coffee")).toEqual([]);
  });
});

describe("parseGender", () => {
  it("accepts the known values", () => {
    expect(parseGender("woman")).toBe("woman");
    expect(parseGender("man")).toBe("man");
  });

  it("coerces off-list / non-string values to null", () => {
    expect(parseGender("other")).toBeNull();
    expect(parseGender(null)).toBeNull();
    expect(parseGender(5)).toBeNull();
  });
});
