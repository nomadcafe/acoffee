import { Resend } from "resend";
import { type Locale, t, tmpl } from "./i18n/dict";
import { siteName, siteUrl } from "./site";
import type { InviteMode } from "./types";

// Email is best-effort. RESEND_API_KEY + EMAIL_FROM missing → skip; send
// failure → log only, never throw. We don't want a flaky email provider
// blocking the underlying DB write.
//
// EMAIL_FROM example: "acoffee <hello@acoffee.com>". Verify the domain in
// Resend dashboard before setting; un-verified domains will 403.
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export function isEmailConfigured(): boolean {
  return !!resend && !!process.env.EMAIL_FROM;
}

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  if (!resend || !process.env.EMAIL_FROM) {
    console.warn("[email] not configured — skip", {
      to: opts.to,
      subject: opts.subject,
    });
    return;
  }
  try {
    const res = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (res.error) {
      console.error("[email] send returned error", res.error);
    }
  } catch (e) {
    console.error("[email] send threw", e);
  }
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
      `${t(args.locale, "email.welcome.disclaimer")}\n\n— ${siteName}`,
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
<p style="font-size:12px;color:#888;border-top:1px dashed #ddd;padding-top:16px;margin:0">${siteName} &middot; ${escapeHtml(t(args.locale, "email.welcome.disclaimer"))}</p>
</body></html>`,
  });
}

// Sent to the visitor right after they submit the invite form on /[handle].
// Closes the loop ("we got it") and primes them on the 7-day expectation —
// otherwise a slow host means the visitor wonders if anything happened. A
// bonus: bad emails bounce here, so we don't waste the host's time later.
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
  mode: InviteMode;
  preferredTime: string | null;
  locale: Locale;
}) {
  const inboxUrl = `${siteUrl}/profile`;
  const modePhrase = t(
    args.locale,
    `email.newInvite.modePhrase.${args.mode}` as const,
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
  whatsappNumber: string | null;
  emailContact: string | null;
  locale: Locale;
}) {
  const cardUrl = `${siteUrl}/${args.hostHandle}`;
  const v = { name: args.requesterName, host: args.hostDisplayName };
  const channels: { label: string; href: string; display: string }[] = [];
  if (args.telegramHandle) {
    const h = args.telegramHandle.replace(/^@/, "");
    channels.push({
      label: "Telegram",
      href: `https://t.me/${h}`,
      display: `@${h}`,
    });
  }
  if (args.whatsappNumber) {
    channels.push({
      label: "WhatsApp",
      href: `https://wa.me/${args.whatsappNumber.replace(/^\+/, "")}`,
      display: args.whatsappNumber,
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

  await sendEmail({
    to: args.to,
    subject: tmpl(t(args.locale, "email.accepted.subject"), v),
    text:
      `${tmpl(t(args.locale, "email.accepted.greeting"), v)}\n\n` +
      `${tmpl(t(args.locale, "email.accepted.intro"), v)}\n${textChannels}\n\n` +
      `${cardUrl}\n\n— ${siteName}`,
    html: `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55;max-width:540px;margin:0 auto;padding:24px">
<p style="font-size:16px;margin:0 0 14px">${escapeHtml(tmpl(t(args.locale, "email.accepted.greeting"), v))}</p>
<p style="font-size:15px;margin:0 0 18px">${escapeHtml(tmpl(t(args.locale, "email.accepted.intro"), v))}</p>
<ul style="font-size:14px;padding-left:20px;margin:0 0 24px">${htmlChannels}</ul>
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
