import { Resend } from "resend";
import { type Locale, t, tmpl } from "./i18n/dict";
import { siteName, siteUrl } from "./site";
import type { CoffeeChatKind } from "./types";

// Two interchangeable send backends, picked by env so switching providers
// (or falling back) is a config change, never a code change:
//
//   • SMTP   — SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS. Any provider,
//              including the one already wired into Supabase's auth emails,
//              so the whole app can share one mailbox + one verified domain.
//              Sent via nodemailer, loaded lazily (see getSmtpTransport) as
//              an *optional* dependency — the Resend path never needs it.
//   • Resend — RESEND_API_KEY. The original backend, kept as a drop-in
//              alternative / fallback.
//
// EMAIL_FROM (e.g. "acoffee <hello@acoffee.com>") is required by both; the
// sending domain must be verified with whichever provider you point it at.
// EMAIL_PROVIDER ("smtp" | "resend") forces one; unset = auto-detect
// (prefer SMTP when SMTP_HOST is set, else Resend).
//
// Email is best-effort: not configured → skip; send failure → log + return
// a structured result, never throw, so a flaky provider can't block the
// underlying DB write. When both backends are configured, a primary
// failure automatically retries on the other one before giving up — so a
// single provider hiccup doesn't drop the message.

type Backend = "smtp" | "resend";

// Outcome of a send attempt. `ok:false` carries a short reason for logs /
// persistence — never shown verbatim to a visitor. Callers that don't care
// (welcome, notifications) can ignore it; the invite-accept path records it
// so a failed contact hand-off surfaces in the host's inbox.
export type SendResult = { ok: true } | { ok: false; error: string };

function pickBackend(): Backend | null {
  const forced = process.env.EMAIL_PROVIDER?.toLowerCase();
  if (forced === "smtp") return process.env.SMTP_HOST ? "smtp" : null;
  if (forced === "resend") return process.env.RESEND_API_KEY ? "resend" : null;
  if (process.env.SMTP_HOST) return "smtp";
  if (process.env.RESEND_API_KEY) return "resend";
  return null;
}

export function isEmailConfigured(): boolean {
  return !!process.env.EMAIL_FROM && pickBackend() !== null;
}

let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY!);
  return resendClient;
}

// The slice of nodemailer's transport we actually use. nodemailer is
// imported through a non-literal specifier so neither tsc nor the bundler
// hard-requires the package at build time — it's optional, pulled in only
// when the SMTP backend is selected at runtime. Until `npm i nodemailer`
// lands, the Resend backend keeps working untouched.
type MailTransport = {
  sendMail: (m: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
  }) => Promise<unknown>;
};

let smtpTransport: MailTransport | null = null;
async function getSmtpTransport(): Promise<MailTransport> {
  if (!smtpTransport) {
    // Literal specifier (not a variable) so Next's output-file-tracing
    // bundles nodemailer into the serverless function. It's still a lazy
    // import — only the SMTP backend pulls it in — and `nodemailer` is in
    // serverExternalPackages so Next keeps it external instead of trying
    // to bundle its Node-built-in internals.
    const nm = (await import("nodemailer")) as {
      createTransport: (opts: unknown) => MailTransport;
    };
    const port = Number(process.env.SMTP_PORT ?? 587);
    smtpTransport = nm.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // 465 = implicit TLS; 587 / 2525 = STARTTLS (secure:false, upgraded).
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return smtpTransport;
}

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

// Single attempt on one backend. Normalises both failure shapes (a thrown
// transport error and Resend's non-throwing `res.error`) into a SendResult
// so the caller can decide whether to fall back.
async function sendVia(
  backend: Backend,
  from: string,
  opts: EmailPayload,
): Promise<SendResult> {
  try {
    if (backend === "smtp") {
      const tx = await getSmtpTransport();
      await tx.sendMail({ from, ...opts });
      return { ok: true };
    }
    const res = await getResend().emails.send({ from, ...opts });
    if (res.error) {
      return { ok: false, error: res.error.message ?? String(res.error) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// The other backend, but only if it's independently configured (has its
// own credentials) — never "fall back" to a provider that isn't set up.
function altBackend(primary: Backend): Backend | null {
  if (primary === "smtp") return process.env.RESEND_API_KEY ? "resend" : null;
  return process.env.SMTP_HOST ? "smtp" : null;
}

async function sendEmail(opts: EmailPayload): Promise<SendResult> {
  const from = process.env.EMAIL_FROM;
  const backend = pickBackend();
  if (!from || !backend) {
    console.warn("[email] not configured — skip", {
      to: opts.to,
      subject: opts.subject,
    });
    return { ok: false, error: "email not configured" };
  }

  const primary = await sendVia(backend, from, opts);
  if (primary.ok) return primary;
  console.error(`[email] ${backend} send failed`, primary.error);

  // Retry on the alternate provider if one is configured — turns a single
  // provider outage into a recoverable blip instead of a dropped message.
  const alt = altBackend(backend);
  if (!alt) return primary;
  const fallback = await sendVia(alt, from, opts);
  if (fallback.ok) {
    console.warn(`[email] recovered via ${alt} after ${backend} failure`);
    return fallback;
  }
  console.error(`[email] ${alt} fallback also failed`, fallback.error);
  return {
    ok: false,
    error: `${backend}: ${primary.error}; ${alt}: ${fallback.error}`,
  };
}

// First email after a user finishes onboarding (picks a real handle). Fires
// once — guarded by the auto-handle → real-handle transition in
// updateProfile. Aim: re-engage anyone who signs up, gets distracted, and
// would otherwise never come back. Two concrete next actions, not a wall of
// feature copy.
export async function emailWelcome(args: {
  to: string;
  handle: string;
  locale: Locale;
}) {
  const cardUrl = `${siteUrl}/${args.handle}`;
  const tweetText = t(args.locale, "share.tweet.text");
  const tweetHref =
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}` +
    `&url=${encodeURIComponent(cardUrl)}`;
  const v = { handle: args.handle, url: cardUrl, tweet: tweetText };
  await sendEmail({
    to: args.to,
    subject: tmpl(t(args.locale, "email.welcome.subject"), v),
    text:
      `${tmpl(t(args.locale, "email.welcome.h1"), v)}\n\n` +
      `${tmpl(t(args.locale, "email.welcome.cardLive"), v)}\n\n` +
      `${t(args.locale, "email.welcome.tagline")}\n\n` +
      `1. ${t(args.locale, "email.welcome.cta.view")}: ${cardUrl}\n` +
      `2. ${t(args.locale, "email.welcome.cta.share")}: ${tweetHref}\n\n` +
      `${tmpl(t(args.locale, "email.welcome.tweetNote"), v)}\n\n` +
      `${t(args.locale, "email.welcome.placesHeader")}\n` +
      `  · ${t(args.locale, "email.welcome.place.bio")}\n` +
      `  · ${t(args.locale, "email.welcome.place.slack")}\n` +
      `  · ${t(args.locale, "email.welcome.place.email")}\n\n` +
      `${t(args.locale, "email.welcome.disclaimer")}\n\n` +
      `— ${t(args.locale, "email.welcome.signoff")}`,
    html: `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55;max-width:540px;margin:0 auto;padding:24px">
<p style="font-size:16px;margin:0 0 14px">${escapeHtml(tmpl(t(args.locale, "email.welcome.h1"), v))}</p>
<p style="font-size:15px;margin:0 0 16px">${escapeHtml(tmpl(t(args.locale, "email.welcome.cardLive"), { ...v, url: "" })).replace(": ", ": ")}<a href="${cardUrl}" style="color:#b45309;font-weight:500">${cardUrl}</a></p>
<p style="font-size:14px;color:#555;margin:0 0 18px">${escapeHtml(t(args.locale, "email.welcome.tagline"))}</p>
<p style="margin:0 0 12px"><a href="${cardUrl}" style="display:inline-block;background:#b45309;color:#fff;padding:10px 18px;border-radius:14px;text-decoration:none;font-weight:500">${escapeHtml(t(args.locale, "email.welcome.cta.view"))} &rarr;</a></p>
<p style="margin:0 0 24px"><a href="${tweetHref}" style="display:inline-block;background:#fff;color:#1a1a1a;border:1px solid #ddd;padding:9px 17px;border-radius:14px;text-decoration:none;font-weight:500">${escapeHtml(t(args.locale, "email.welcome.cta.share"))} &nearr;</a></p>
<p style="font-size:13px;color:#666;margin:0 0 18px">${escapeHtml(tmpl(t(args.locale, "email.welcome.tweetNote"), v))}</p>
<p style="font-size:13px;color:#666;margin:0 0 8px">${escapeHtml(t(args.locale, "email.welcome.placesHeader"))}</p>
<ul style="font-size:13px;color:#666;padding-left:20px;margin:0 0 24px">
  <li style="margin-bottom:4px">${escapeHtml(t(args.locale, "email.welcome.place.bio"))}</li>
  <li style="margin-bottom:4px">${escapeHtml(t(args.locale, "email.welcome.place.slack"))}</li>
  <li style="margin-bottom:4px">${escapeHtml(t(args.locale, "email.welcome.place.email"))}</li>
</ul>
<p style="font-size:13px;color:#555;margin:0 0 18px">${escapeHtml(t(args.locale, "email.welcome.disclaimer"))}</p>
<p style="font-size:12px;color:#888;font-style:italic;border-top:1px dashed #ddd;padding-top:16px;margin:0">— ${escapeHtml(t(args.locale, "email.welcome.signoff"))}</p>
</body></html>`,
  });
}

// Confirmation email — sent to the visitor right after they submit the
// invite form. This is the entire AA2 anti-spam check: the host doesn't
// see the invite until the visitor clicks the link, proving they actually
// own the email address they typed. Bad emails bounce here, host inbox
// stays clean.
export async function emailInviteConfirm(args: {
  to: string;
  requesterName: string;
  hostDisplayName: string;
  hostHandle: string;
  confirmToken: string;
  locale: Locale;
}) {
  const confirmUrl = `${siteUrl}/invite/confirm/${args.confirmToken}`;
  const v = { name: args.requesterName, host: args.hostDisplayName };
  await sendEmail({
    to: args.to,
    subject: tmpl(t(args.locale, "email.confirm.subject"), v),
    text:
      `${tmpl(t(args.locale, "email.confirm.greeting"), v)}\n\n` +
      `${tmpl(t(args.locale, "email.confirm.intro"), v)}\n\n` +
      `${confirmUrl}\n\n` +
      `${t(args.locale, "email.confirm.disclaimer")}\n\n— ${siteName}`,
    html: `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55;max-width:540px;margin:0 auto;padding:24px">
<p style="font-size:15px;margin:0 0 14px">${escapeHtml(tmpl(t(args.locale, "email.confirm.greeting"), v))}</p>
<p style="font-size:15px;margin:0 0 18px">${escapeHtml(tmpl(t(args.locale, "email.confirm.intro"), v))}</p>
<p style="margin:0 0 24px"><a href="${confirmUrl}" style="display:inline-block;background:#b45309;color:#fff;padding:10px 18px;border-radius:14px;text-decoration:none;font-weight:500">${escapeHtml(t(args.locale, "email.confirm.cta"))} &rarr;</a></p>
<p style="font-size:12px;color:#888;border-top:1px dashed #ddd;padding-top:16px;margin:0">${siteName} &middot; ${escapeHtml(t(args.locale, "email.confirm.disclaimer"))}</p>
</body></html>`,
  });
}

// Legacy: previously sent to the visitor right after submit. v0.8.5
// replaced this with emailInviteConfirm (the click-to-confirm flow) —
// kept exported so we don't break callers in a rollback window; new
// code shouldn't reach for it.
export async function emailInviteReceived(args: {
  to: string;
  requesterName: string;
  hostDisplayName: string;
  hostHandle: string;
  locale: Locale;
}) {
  const cardUrl = `${siteUrl}/${args.hostHandle}`;
  const v = { name: args.requesterName, host: args.hostDisplayName };
  await sendEmail({
    to: args.to,
    subject: tmpl(t(args.locale, "email.received.subject"), v),
    text:
      `${tmpl(t(args.locale, "email.received.greeting"), v)}\n\n` +
      `${tmpl(t(args.locale, "email.received.intro"), v)}\n\n` +
      `${t(args.locale, "email.received.explanation")}\n\n` +
      `${cardUrl}\n\n— ${siteName}`,
    html: `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55;max-width:540px;margin:0 auto;padding:24px">
<p style="font-size:15px;margin:0 0 14px">${escapeHtml(tmpl(t(args.locale, "email.received.greeting"), v))}</p>
<p style="font-size:15px;margin:0 0 14px">${escapeHtml(tmpl(t(args.locale, "email.received.intro"), v))}</p>
<p style="font-size:14px;color:#555;margin:0 0 18px">${escapeHtml(t(args.locale, "email.received.explanation"))}</p>
<p style="margin:0 0 24px"><a href="${cardUrl}" style="color:#b45309">${escapeHtml(t(args.locale, "email.received.viewCard"))} &rarr;</a></p>
<p style="font-size:12px;color:#888;border-top:1px dashed #ddd;padding-top:16px;margin:0">${siteName} &middot; ${escapeHtml(tmpl(t(args.locale, "email.received.disclaimer"), v))}</p>
</body></html>`,
  });
}

// Sent to the host when a visitor submits the invite form. Designed to be
// actionable from the inbox preview pane — first line answers "who and
// what" without opening the email.
export async function emailNewInvite(args: {
  to: string;
  hostHandle: string;
  requesterName: string;
  requesterEmail: string;
  requesterTopic: string;
  kind: CoffeeChatKind;
  preferredTime: string | null;
  locale: Locale;
}) {
  const inboxUrl = `${siteUrl}/profile`;
  // Fills the `{modePhrase}` slot in the subject/heading templates with
  // an activity phrase ("a coffee", "a hike", …) derived from the kind
  // the visitor picked — which is always one the host advertised.
  const modePhrase = t(
    args.locale,
    `email.newInvite.kindPhrase.${args.kind}` as const,
  );
  const v = {
    name: args.requesterName,
    modePhrase,
    topic: truncate(args.requesterTopic, 60),
  };
  const headingV = { name: args.requesterName, modePhrase };
  await sendEmail({
    to: args.to,
    subject: tmpl(t(args.locale, "email.newInvite.subject"), v),
    text:
      `${tmpl(t(args.locale, "email.newInvite.heading"), headingV)}\n\n` +
      `${t(args.locale, "email.newInvite.field.topic")} ${args.requesterTopic}\n` +
      `${args.preferredTime ? `${t(args.locale, "email.newInvite.field.time")} ${args.preferredTime}\n` : ""}` +
      `${t(args.locale, "email.newInvite.field.email")} ${args.requesterEmail}\n\n` +
      `${t(args.locale, "email.newInvite.cta")}: ${inboxUrl}\n\n` +
      `${t(args.locale, "email.newInvite.disclaimer")}\n\n— ${siteName}`,
    html: `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55;max-width:540px;margin:0 auto;padding:24px">
<p style="font-size:16px;margin:0 0 12px">${escapeHtml(tmpl(t(args.locale, "email.newInvite.heading"), headingV))}</p>
<p style="font-size:14px;color:#555;margin:0 0 6px"><strong>${escapeHtml(t(args.locale, "email.newInvite.field.topic"))}</strong> ${escapeHtml(args.requesterTopic)}</p>
${args.preferredTime ? `<p style="font-size:14px;color:#555;margin:0 0 6px"><strong>${escapeHtml(t(args.locale, "email.newInvite.field.time"))}</strong> ${escapeHtml(args.preferredTime)}</p>` : ""}
<p style="font-size:14px;color:#555;margin:0 0 20px"><strong>${escapeHtml(t(args.locale, "email.newInvite.field.email"))}</strong> <a href="mailto:${escapeHtml(args.requesterEmail)}" style="color:#b45309">${escapeHtml(args.requesterEmail)}</a></p>
<p style="margin:0 0 24px"><a href="${inboxUrl}" style="display:inline-block;background:#b45309;color:#fff;padding:10px 18px;border-radius:14px;text-decoration:none;font-weight:500">${escapeHtml(t(args.locale, "email.newInvite.cta"))} &rarr;</a></p>
<p style="font-size:12px;color:#888;border-top:1px dashed #ddd;padding-top:16px;margin:0">${escapeHtml(t(args.locale, "email.newInvite.disclaimer"))}</p>
</body></html>`,
  });
}

// Sent to the requester when the host accepts. Includes whichever contact
// channels the host has filled in — this is the moment the v0.7 client-side
// reveal used to happen, except now it's gated by host approval.
export async function emailInviteAccepted(args: {
  to: string;
  requesterName: string;
  hostHandle: string;
  hostDisplayName: string;
  telegramHandle: string | null;
  emailContact: string | null;
  // v16 — already-formatted meeting time (host tz, visitor locale) when the
  // visitor booked a scheduling slot. null = no slot (free-form path).
  meetingTime?: string | null;
  locale: Locale;
}): Promise<SendResult> {
  const cardUrl = `${siteUrl}/${args.hostHandle}`;
  const v = { name: args.requesterName, host: args.hostDisplayName };
  const timeLine = args.meetingTime
    ? tmpl(t(args.locale, "email.accepted.time"), { time: args.meetingTime })
    : null;
  const channels: { label: string; href: string; display: string }[] = [];
  if (args.telegramHandle) {
    const h = args.telegramHandle.replace(/^@/, "");
    channels.push({
      label: "Telegram",
      href: `https://t.me/${h}`,
      display: `@${h}`,
    });
  }
  if (args.emailContact) {
    channels.push({
      label: "Email",
      href: `mailto:${args.emailContact}`,
      display: args.emailContact,
    });
  }

  const textChannels = channels
    .map((c) => `  ${c.label}: ${c.display}`)
    .join("\n");
  const htmlChannels = channels
    .map(
      (c) =>
        `<li style="margin-bottom:6px"><strong>${c.label}:</strong> <a href="${escapeHtml(c.href)}" style="color:#b45309">${escapeHtml(c.display)}</a></li>`,
    )
    .join("");

  return sendEmail({
    to: args.to,
    subject: tmpl(t(args.locale, "email.accepted.subject"), v),
    text:
      `${tmpl(t(args.locale, "email.accepted.greeting"), v)}\n\n` +
      `${tmpl(t(args.locale, "email.accepted.intro"), v)}\n${textChannels}\n\n` +
      `${timeLine ? `${timeLine}\n\n` : ""}` +
      `${cardUrl}\n\n— ${siteName}`,
    html: `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55;max-width:540px;margin:0 auto;padding:24px">
<p style="font-size:16px;margin:0 0 14px">${escapeHtml(tmpl(t(args.locale, "email.accepted.greeting"), v))}</p>
<p style="font-size:15px;margin:0 0 18px">${escapeHtml(tmpl(t(args.locale, "email.accepted.intro"), v))}</p>
<ul style="font-size:14px;padding-left:20px;margin:0 0 ${timeLine ? "14px" : "24px"}">${htmlChannels}</ul>
${timeLine ? `<p style="font-size:15px;margin:0 0 24px">${escapeHtml(timeLine)}</p>` : ""}
<p style="margin:0 0 24px"><a href="${cardUrl}" style="color:#b45309">${escapeHtml(t(args.locale, "email.accepted.viewCard"))} &rarr;</a></p>
<p style="font-size:12px;color:#888;border-top:1px dashed #ddd;padding-top:16px;margin:0">${escapeHtml(t(args.locale, "email.accepted.disclaimer"))}</p>
</body></html>`,
  });
}

// Sent to the requester when the host declines. Generic / no reason given
// (we don't ask the host for one — friction for them, awkward for the
// requester to read). Plain language so it lands as kindness not rejection.
export async function emailInviteDeclined(args: {
  to: string;
  requesterName: string;
  hostDisplayName: string;
  locale: Locale;
}) {
  const v = { name: args.requesterName, host: args.hostDisplayName };
  await sendEmail({
    to: args.to,
    subject: tmpl(t(args.locale, "email.declined.subject"), v),
    text:
      `${tmpl(t(args.locale, "email.declined.greeting"), v)}\n\n` +
      `${tmpl(t(args.locale, "email.declined.body"), v)}\n\n` +
      `${t(args.locale, "email.declined.footer")}\n\n— ${siteName}`,
    html: `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55;max-width:540px;margin:0 auto;padding:24px">
<p style="font-size:15px;margin:0 0 14px">${escapeHtml(tmpl(t(args.locale, "email.declined.greeting"), v))}</p>
<p style="font-size:15px;margin:0 0 14px">${escapeHtml(tmpl(t(args.locale, "email.declined.body"), v))}</p>
<p style="font-size:14px;color:#555;margin:0 0 24px">${escapeHtml(t(args.locale, "email.declined.footer"))}</p>
<p style="font-size:12px;color:#888;border-top:1px dashed #ddd;padding-top:16px;margin:0">${siteName}</p>
</body></html>`,
  });
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

// Minimal HTML escape so user-typed content (name, topic, contact strings)
// can't break out of the email template. Resend renders raw HTML — we send
// raw HTML — so this is on us.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
