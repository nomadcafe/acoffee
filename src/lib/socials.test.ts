import { describe, expect, it } from "vitest";
import {
  PLATFORMS,
  parseSocialLinks,
  validateSocialLinks,
} from "@/lib/socials";

describe("parseSocialLinks", () => {
  it("keeps recognised rows and trims values", () => {
    expect(
      parseSocialLinks([{ platform: "x", value: "  @bob  " }]),
    ).toEqual([{ platform: "x", value: "@bob" }]);
  });

  it("drops unknown platforms, empty values, and non-objects", () => {
    expect(
      parseSocialLinks([
        { platform: "myspace", value: "x" },
        { platform: "x", value: "  " },
        "nope",
        { platform: "github", value: "octocat" },
      ]),
    ).toEqual([{ platform: "github", value: "octocat" }]);
  });

  it("returns [] for non-arrays", () => {
    expect(parseSocialLinks(null)).toEqual([]);
  });
});

describe("validateSocialLinks", () => {
  it("accepts valid rows", () => {
    const r = validateSocialLinks([{ platform: "x", value: "@bob" }]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.links).toEqual([{ platform: "x", value: "@bob" }]);
  });

  it("rejects a value that fails the platform pattern", () => {
    // x usernames cap at 15 chars
    const r = validateSocialLinks([
      { platform: "x", value: "abcdefghijklmnop" },
    ]);
    expect(r.ok).toBe(false);
  });

  it("rejects unsupported platforms and non-arrays", () => {
    expect(validateSocialLinks([{ platform: "myspace", value: "x" }]).ok).toBe(
      false,
    );
    expect(validateSocialLinks("nope").ok).toBe(false);
  });

  it("silently drops empty rows", () => {
    const r = validateSocialLinks([
      { platform: "x", value: "" },
      { platform: "github", value: "octocat" },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.links).toEqual([{ platform: "github", value: "octocat" }]);
  });

  it("rejects a website that isn't a URL", () => {
    expect(validateSocialLinks([{ platform: "website", value: "notaurl" }]).ok).toBe(
      false,
    );
    expect(
      validateSocialLinks([{ platform: "website", value: "https://a.dev" }]).ok,
    ).toBe(true);
  });
});

describe("PLATFORMS url + label composition", () => {
  it("builds canonical URLs from usernames", () => {
    expect(PLATFORMS.x.urlFor("@bob")).toBe("https://x.com/bob");
    expect(PLATFORMS.github.urlFor("octocat")).toBe(
      "https://github.com/octocat",
    );
    expect(PLATFORMS.substack.urlFor("foo")).toBe("https://foo.substack.com");
  });

  it("passes through full URLs for url-based platforms", () => {
    expect(PLATFORMS.website.urlFor("https://a.dev")).toBe("https://a.dev");
    expect(PLATFORMS.website.displayLabel("https://www.a.dev/x")).toBe("a.dev");
  });

  it("reduces a mastodon profile URL to @user@instance", () => {
    expect(
      PLATFORMS.mastodon.displayLabel("https://mastodon.social/@me"),
    ).toBe("@me@mastodon.social");
  });
});
