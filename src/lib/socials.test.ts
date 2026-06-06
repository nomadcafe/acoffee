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

  it("accepts the handle-based platforms added in v17", () => {
    const r = validateSocialLinks([
      { platform: "threads", value: "@maker" },
      { platform: "facebook", value: "mia.makes" },
      { platform: "reddit", value: "u/mia" },
      { platform: "twitch", value: "miastream" },
    ]);
    expect(r.ok).toBe(true);
  });

  it("rejects free URLs (no platform accepts an arbitrary URL anymore)", () => {
    // The retired website/mastodon free-URL platforms are gone, and the
    // remaining handle fields reject anything URL-shaped.
    expect(
      validateSocialLinks([{ platform: "website", value: "https://a.dev" }]).ok,
    ).toBe(false);
    expect(
      validateSocialLinks([{ platform: "facebook", value: "https://evil.example" }]).ok,
    ).toBe(false);
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

});

describe("PLATFORMS url + label composition", () => {
  it("builds canonical URLs from usernames", () => {
    expect(PLATFORMS.x.urlFor("@bob")).toBe("https://x.com/bob");
    expect(PLATFORMS.github.urlFor("octocat")).toBe(
      "https://github.com/octocat",
    );
    expect(PLATFORMS.substack.urlFor("foo")).toBe("https://foo.substack.com");
  });

  it("composes the v17 handle platforms (incl. reddit u/ prefix)", () => {
    expect(PLATFORMS.threads.urlFor("@mia")).toBe("https://www.threads.com/@mia");
    expect(PLATFORMS.facebook.urlFor("mia.makes")).toBe(
      "https://facebook.com/mia.makes",
    );
    // A pasted `u/` prefix is stripped before composing.
    expect(PLATFORMS.reddit.urlFor("u/mia")).toBe("https://reddit.com/user/mia");
    expect(PLATFORMS.reddit.displayLabel("mia")).toBe("u/mia");
    expect(PLATFORMS.twitch.urlFor("@miastream")).toBe(
      "https://twitch.tv/miastream",
    );
  });

  it("composes the regional + creator platforms", () => {
    expect(PLATFORMS.note.urlFor("mia")).toBe("https://note.com/mia");
    expect(PLATFORMS.zenn.urlFor("mia")).toBe("https://zenn.dev/mia");
    expect(PLATFORMS.zhihu.urlFor("mia-zhang")).toBe(
      "https://www.zhihu.com/people/mia-zhang",
    );
    expect(PLATFORMS.douban.urlFor("mia")).toBe(
      "https://www.douban.com/people/mia/",
    );
    expect(PLATFORMS.medium.urlFor("@mia")).toBe("https://medium.com/@mia");
    expect(PLATFORMS.behance.urlFor("mia")).toBe("https://www.behance.net/mia");
    expect(PLATFORMS.soundcloud.urlFor("mia")).toBe("https://soundcloud.com/mia");
  });
});
