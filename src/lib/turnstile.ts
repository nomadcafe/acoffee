// Cloudflare Turnstile — the invite form's bot gate.
//
// Sign-in already puts a Turnstile challenge in front of the magic link,
// but that one is verified by Supabase: GoTrue holds the secret and checks
// the token itself, so the app only ever needs the public site key (see
// auth/actions.ts). The invite form has no such backstop. It's an
// unauthenticated endpoint that sends mail to a visitor-supplied address
// with visitor-supplied text in the subject and body — which is precisely
// what makes it worth abusing, and the only thing standing in front of it
// today is an in-memory per-IP counter that resets with every new
// serverless instance. Verifying the token is ours to do here, and that
// needs the secret half of the pair.
//
// Both halves or nothing: with only the site key set we would render a
// widget nobody checks, which is worse than no widget at all — it reads as
// protection from the outside while costing an attacker one skipped form
// field. `inviteCaptchaSiteKey()` returns undefined in that case (and says
// so once in the logs), so the form degrades to the rate-limit-only
// behaviour it had before rather than pretending.

const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Cloudflare's siteverify is fast and highly available; if it hasn't
// answered in this long something is wrong and we'd rather say so than
// hang the visitor's submit.
const VERIFY_TIMEOUT_MS = 5000;

let warnedNoSecret = false;

/**
 * The public site key to hand the invite form's widget — or undefined when
 * the invite CAPTCHA isn't fully configured, which the form reads as "don't
 * render a challenge" and the action reads as "don't require one".
 */
export function inviteCaptchaSiteKey(): string | undefined {
  const site = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!site) return undefined;
  if (!process.env.TURNSTILE_SECRET_KEY) {
    if (!warnedNoSecret) {
      warnedNoSecret = true;
      console.warn(
        "[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY is set but " +
          "TURNSTILE_SECRET_KEY is not — the invite form's CAPTCHA stays " +
          "off, because a challenge nobody verifies protects nothing. " +
          "Sign-in is unaffected: Supabase verifies that one.",
      );
    }
    return undefined;
  }
  return site;
}

export type CaptchaVerdict = { ok: true } | { ok: false; error: string };

/**
 * Verify a solved Turnstile token with Cloudflare.
 *
 * Fails closed — a network error, a timeout, or a malformed response all
 * come back `ok: false`. The alternative is that anyone who can make
 * siteverify unreachable also turns the gate off, which is the one failure
 * mode a bot gate must not have. The caller distinguishes this from a
 * rejected token only in the logs; the visitor gets "try again" either way.
 */
export async function verifyTurnstile(
  token: string,
  ip?: string | null,
): Promise<CaptchaVerdict> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, error: "secret not configured" };

  const body = new URLSearchParams({ secret, response: token });
  // remoteip is optional and only sharpens Cloudflare's scoring. "unknown"
  // is what ipFromHeaders returns when no forwarding header is present —
  // sending that would be worse than sending nothing.
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, error: `siteverify HTTP ${res.status}` };
    }
    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (data.success === true) return { ok: true };
    return {
      ok: false,
      error: (data["error-codes"] ?? ["rejected"]).join(","),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
