import { describe, expect, it } from "vitest";
import { isOwnAvatarUrl } from "@/lib/avatar";

// The shape AvatarUpload actually writes: getPublicUrl() for
// `{userId}/avatar.webp`, plus the `?v=` cache-bust it appends.
const SUPABASE = "https://abcdefghijklmnop.supabase.co";
const OWNER = "11111111-2222-3333-4444-555555555555";
const OTHER = "99999999-8888-7777-6666-555555555555";
const ok = `${SUPABASE}/storage/v1/object/public/avatars/${OWNER}/avatar.webp`;

describe("isOwnAvatarUrl", () => {
  it("accepts the URL the uploader writes", () => {
    expect(isOwnAvatarUrl(ok, OWNER, SUPABASE)).toBe(true);
  });

  it("accepts the cache-busting query the uploader appends", () => {
    expect(isOwnAvatarUrl(`${ok}?v=1750000000000`, OWNER, SUPABASE)).toBe(true);
  });

  it("rejects another origin", () => {
    // The one that matters: opengraph-image renders this as <img src> inside
    // an ImageResponse, so the server fetches whatever is here.
    expect(
      isOwnAvatarUrl(
        `https://evil.example/storage/v1/object/public/avatars/${OWNER}/avatar.webp`,
        OWNER,
        SUPABASE,
      ),
    ).toBe(false);
  });

  it("rejects a lookalike host that merely ends with ours", () => {
    expect(
      isOwnAvatarUrl(
        `https://abcdefghijklmnop.supabase.co.evil.example/storage/v1/object/public/avatars/${OWNER}/avatar.webp`,
        OWNER,
        SUPABASE,
      ),
    ).toBe(false);
  });

  it("rejects http when the project is https", () => {
    expect(isOwnAvatarUrl(ok.replace("https:", "http:"), OWNER, SUPABASE)).toBe(
      false,
    );
  });

  it("rejects another user's folder on our own origin", () => {
    // Cheap impersonation: point your card at someone else's photo. Storage
    // RLS can't see this — the write is to `profiles`, not to the bucket.
    expect(
      isOwnAvatarUrl(
        `${SUPABASE}/storage/v1/object/public/avatars/${OTHER}/avatar.webp`,
        OWNER,
        SUPABASE,
      ),
    ).toBe(false);
  });

  it("rejects a folder that only starts with the owner id", () => {
    expect(
      isOwnAvatarUrl(
        `${SUPABASE}/storage/v1/object/public/avatars/${OWNER}-x/avatar.webp`,
        OWNER,
        SUPABASE,
      ),
    ).toBe(false);
  });

  it("rejects another bucket or a non-public storage path", () => {
    expect(
      isOwnAvatarUrl(
        `${SUPABASE}/storage/v1/object/public/private-bucket/${OWNER}/a.webp`,
        OWNER,
        SUPABASE,
      ),
    ).toBe(false);
    expect(
      isOwnAvatarUrl(
        `${SUPABASE}/storage/v1/object/sign/avatars/${OWNER}/a.webp`,
        OWNER,
        SUPABASE,
      ),
    ).toBe(false);
  });

  it("rejects an object sitting directly in the bucket root", () => {
    expect(
      isOwnAvatarUrl(
        `${SUPABASE}/storage/v1/object/public/avatars/avatar.webp`,
        OWNER,
        SUPABASE,
      ),
    ).toBe(false);
  });

  it("does not let traversal or encoding fake the owner folder", () => {
    // `..` is normalised away by URL parsing before we look at the segment.
    expect(
      isOwnAvatarUrl(
        `${SUPABASE}/storage/v1/object/public/avatars/${OTHER}/../${OWNER}x/a.webp`,
        OWNER,
        SUPABASE,
      ),
    ).toBe(false);
    // A percent-encoded separator stays encoded in `pathname`, so it can't
    // split the segment we compare.
    expect(
      isOwnAvatarUrl(
        `${SUPABASE}/storage/v1/object/public/avatars/${OWNER}%2f..%2f${OTHER}/a.webp`,
        OWNER,
        SUPABASE,
      ),
    ).toBe(false);
  });

  it("rejects non-http schemes and unparseable values", () => {
    expect(isOwnAvatarUrl("javascript:alert(1)", OWNER, SUPABASE)).toBe(false);
    expect(isOwnAvatarUrl("data:image/svg+xml,<svg/>", OWNER, SUPABASE)).toBe(
      false,
    );
    expect(isOwnAvatarUrl("/avatars/me.webp", OWNER, SUPABASE)).toBe(false);
    expect(isOwnAvatarUrl("not a url", OWNER, SUPABASE)).toBe(false);
  });

  it("rejects everything when an argument is missing", () => {
    expect(isOwnAvatarUrl("", OWNER, SUPABASE)).toBe(false);
    expect(isOwnAvatarUrl(ok, "", SUPABASE)).toBe(false);
    // No configured project URL — the caller can't know what "ours" means,
    // so nothing is ours.
    expect(isOwnAvatarUrl(ok, OWNER, "")).toBe(false);
  });
});
