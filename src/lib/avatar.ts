// Where an avatar URL is allowed to point.
//
// `profiles.avatar_url` is one of the few columns the browser writes
// directly: AvatarUpload uploads to storage and then PATCHes the column with
// the public URL, under `profiles_write_own`. RLS filters rows, not values —
// so the policy checks *whose* row is being written, and has nothing to say
// about what goes in the column. Until v0.21 the answer was "any string".
//
// Two things read it back and act on it, and the second is the one that
// matters:
//
//   • the card and nav render it as an <img src>;
//   • `[handle]/opengraph-image.tsx` renders it inside an ImageResponse,
//     which means the *server* fetches it — and that route is public, so
//     anyone hitting /{handle}/opengraph-image makes our runtime issue a
//     request to a URL a user chose. That's a blind SSRF with a free
//     trigger, not a broken image.
//
// The bucket's own RLS already scopes what a user can upload to
// `{their uid}/…`, so the honest shape of a legitimate value is fully
// determined: our Supabase origin, the public-avatars prefix, and the
// owner's own folder. Checking all three also closes a smaller thing the
// bucket policy can't — one user pointing their card at another user's
// uploaded photo, which is cheap impersonation on a site whose whole
// premise is "this is who you're meeting".
//
// This is the read-side half. The write side is a CHECK constraint in
// schema_v21.sql, which stops the value being stored at all. Both exist
// because they fail differently: the constraint can't be applied to a
// database that isn't ours to migrate, and a constraint added tomorrow
// doesn't sanitise a row written yesterday.

const AVATAR_PREFIX = "/storage/v1/object/public/avatars/";

/**
 * Is `raw` a public URL for an object in `ownerId`'s own avatar folder on
 * the Supabase project at `supabaseUrl`?
 *
 * Takes the origin as an argument rather than reading the environment so it
 * stays pure and testable; `safeAvatarUrl` is the wrapper app code calls.
 *
 * Deliberately permissive about the file name — storage RLS already governs
 * what the owner may put in their folder, and pinning "avatar.webp" here
 * would silently blank every card the day that constant changes.
 */
export function isOwnAvatarUrl(
  raw: string,
  ownerId: string,
  supabaseUrl: string,
): boolean {
  if (!raw || !ownerId || !supabaseUrl) return false;

  let url: URL;
  let base: URL;
  try {
    url = new URL(raw);
    base = new URL(supabaseUrl);
  } catch {
    // Not absolute, not parseable. A relative path would resolve against
    // our own origin in an <img>, which is harmless but never something we
    // wrote — treat it as junk either way.
    return false;
  }

  // Origin, not hostname: protocol and port count. `new URL` has already
  // normalised away the tricks (case, default ports, `..` segments,
  // userinfo), which is the reason to compare parsed URLs rather than
  // string-prefix the raw value.
  if (url.origin !== base.origin) return false;
  if (!url.pathname.startsWith(AVATAR_PREFIX)) return false;

  // First path segment after the prefix is the owner folder. Percent-encoded
  // input stays encoded in `pathname`, so a smuggled separator can't match a
  // bare uuid here.
  const rest = url.pathname.slice(AVATAR_PREFIX.length);
  const slash = rest.indexOf("/");
  if (slash <= 0) return false;
  return rest.slice(0, slash) === ownerId;
}

/**
 * The stored avatar URL if it's one we could have written for this owner,
 * otherwise null — which every consumer already renders as the initials
 * chip, so a rejected value degrades to the same thing as "no photo yet".
 *
 * Call this at the boundary where a row becomes app data, not at each
 * render: the components take a nullable `src` and there are more of them
 * than there are queries.
 */
export function safeAvatarUrl(
  raw: string | null | undefined,
  ownerId: string,
): string | null {
  if (!raw) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  return isOwnAvatarUrl(raw, ownerId, supabaseUrl) ? raw : null;
}
