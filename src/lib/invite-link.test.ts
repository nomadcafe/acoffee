import { describe, expect, it } from "vitest";
import {
  buildInviteQuery,
  EMPTY_INVITE,
  hasInvite,
  INVITE_LINK_LIMITS,
  parseInviteParams,
} from "@/lib/invite-link";

describe("parseInviteParams", () => {
  it("maps `with` onto `to` and passes the rest through", () => {
    expect(
      parseInviteParams({
        from: "Ada",
        with: "Grace",
        city: "Lisbon",
        topic: "compilers",
        kind: "coffee",
      }),
    ).toEqual({
      from: "Ada",
      to: "Grace",
      city: "Lisbon",
      topic: "compilers",
      kind: "coffee",
    });
  });

  it("returns empty strings for missing params", () => {
    expect(parseInviteParams({})).toEqual(EMPTY_INVITE);
  });

  it("takes the first value when a param repeats", () => {
    // ?from=Ada&from=Eve — URLSearchParams-shaped input can be an array.
    expect(parseInviteParams({ from: ["Ada", "Eve"] }).from).toBe("Ada");
  });

  it("collapses whitespace runs and pasted newlines", () => {
    expect(parseInviteParams({ topic: "  a\n\n  b  " }).topic).toBe("a b");
    expect(parseInviteParams({ city: "San   Francisco" }).city).toBe(
      "San Francisco",
    );
  });

  it("clamps each field to its own cap", () => {
    const long = "x".repeat(500);
    const d = parseInviteParams({
      from: long,
      with: long,
      city: long,
      topic: long,
    });
    expect(d.from).toHaveLength(INVITE_LINK_LIMITS.from);
    expect(d.to).toHaveLength(INVITE_LINK_LIMITS.to);
    expect(d.city).toHaveLength(INVITE_LINK_LIMITS.city);
    expect(d.topic).toHaveLength(INVITE_LINK_LIMITS.topic);
  });

  it("drops a kind that isn't one of ours", () => {
    expect(parseInviteParams({ kind: "brunch" }).kind).toBeNull();
    expect(parseInviteParams({ kind: "" }).kind).toBeNull();
    expect(parseInviteParams({ kind: "hike" }).kind).toBe("hike");
  });

  it("ignores non-string values", () => {
    // A hand-built object (or a JSON body) can carry anything.
    expect(
      parseInviteParams({ from: undefined, topic: undefined }).from,
    ).toBe("");
  });
});

describe("hasInvite", () => {
  it("is false only when every field is empty", () => {
    expect(hasInvite(EMPTY_INVITE)).toBe(false);
    expect(hasInvite({ ...EMPTY_INVITE, topic: "compilers" })).toBe(true);
    expect(hasInvite({ ...EMPTY_INVITE, from: "Ada" })).toBe(true);
  });

  it("ignores kind on its own — a bare ?kind= isn't an invitation", () => {
    expect(hasInvite({ ...EMPTY_INVITE, kind: "coffee" })).toBe(false);
  });
});

describe("buildInviteQuery", () => {
  it("omits empty fields", () => {
    expect(buildInviteQuery({ ...EMPTY_INVITE, from: "Ada" })).toBe(
      "from=Ada",
    );
  });

  it("keeps a stable key order regardless of the input", () => {
    const q = buildInviteQuery({
      from: "Ada",
      to: "Grace",
      city: "Lisbon",
      topic: "compilers",
      kind: "coffee",
    });
    expect(q).toBe("from=Ada&with=Grace&city=Lisbon&topic=compilers&kind=coffee");
  });

  it("round-trips through parseInviteParams", () => {
    const data = {
      from: "Ada",
      to: "Grace",
      city: "Lisbon",
      topic: "compilers & coffee",
      kind: "cowork" as const,
    };
    const parsed = Object.fromEntries(
      new URLSearchParams(buildInviteQuery(data)),
    );
    expect(parseInviteParams(parsed)).toEqual(data);
  });
});
