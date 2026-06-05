// Google Safe Browsing lookup for user-supplied URLs — the `website` and
// `mastodon` social links are the only card fields that accept an arbitrary
// URL, so a card could otherwise point at a known phishing/malware page.
//
// Gated on GOOGLE_SAFE_BROWSING_API_KEY: with no key set it's a no-op that
// reports everything safe, so local dev / unconfigured envs aren't blocked.
// It also fails OPEN on API errors / timeouts — a Safe Browsing outage
// shouldn't stop people editing their card. The always-on baseline stays
// the https-only validation (lib/socials.ts) + rel="nofollow ugc" on render;
// this is an extra net that catches *known* bad URLs, not a hard guarantee.

const ENDPOINT =
  "https://safebrowsing.googleapis.com/v4/threatMatches:find";

export async function checkUrlsSafe(
  urls: string[],
): Promise<{ safe: true } | { safe: false; flagged: string[] }> {
  const key = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  // Only http(s) URLs are checkable; dedupe to keep the request minimal.
  const targets = [...new Set(urls.filter((u) => /^https?:\/\//i.test(u)))];
  if (!key || targets.length === 0) return { safe: true };

  try {
    const res = await fetch(`${ENDPOINT}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: { clientId: "acoffee", clientVersion: "1.0" },
        threatInfo: {
          threatTypes: [
            "MALWARE",
            "SOCIAL_ENGINEERING",
            "UNWANTED_SOFTWARE",
            "POTENTIALLY_HARMFUL_APPLICATION",
          ],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: targets.map((url) => ({ url })),
        },
      }),
      // Don't let a slow API hang the profile-save path.
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { safe: true }; // fail open on API error
    const data = (await res.json()) as {
      matches?: { threat?: { url?: string } }[];
    };
    const matches = data.matches ?? [];
    if (matches.length === 0) return { safe: true };
    const flagged = [
      ...new Set(
        matches
          .map((m) => m.threat?.url)
          .filter((u): u is string => typeof u === "string"),
      ),
    ];
    return { safe: false, flagged };
  } catch {
    return { safe: true }; // fail open on network error / timeout
  }
}
