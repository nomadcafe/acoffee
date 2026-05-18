import { Resend } from "resend";
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
}) {
  const cardUrl = `${siteUrl}/${args.handle}`;
  const tweetText = `My coffee chat page is live — invite me for a coffee ☕`;
  const tweetHref =
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}` +
    `&url=${encodeURIComponent(cardUrl)}`;
  await sendEmail({
    to: args.to,
    subject: `Welcome, @${args.handle} · your acoffee card is live`,
    text:
      `Welcome to ${siteName}, @${args.handle}.\n\n` +
      `Your card is live at ${cardUrl}.\n\n` +
      `Now the only thing standing between you and a coffee chat is your card sitting somewhere people can see it. Two clicks:\n\n` +
      `1. See your card: ${cardUrl}\n` +
      `2. Share to X with one tap: ${tweetHref}\n` +
      `   (composes a tweet that says "My coffee chat page is live — invite me for a coffee ☕" linked to your card)\n\n` +
      `Put the URL in your X / Twitter bio, your Slack signature, your email footer — wherever people who already know you scroll past every day. The first invites usually come from your existing graph.\n\n— ${siteName}`,
    html: `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55;max-width:540px;margin:0 auto;padding:24px">
<p style="font-size:16px;margin:0 0 14px">Welcome to <strong>${siteName}</strong>, <strong>@${args.handle}</strong>.</p>
<p style="font-size:15px;margin:0 0 16px">Your card is live at <a href="${cardUrl}" style="color:#b45309;font-weight:500">${cardUrl}</a>.</p>
<p style="font-size:14px;color:#555;margin:0 0 18px">Now the only thing between you and a coffee chat is your card sitting somewhere people can see it. Two clicks:</p>
<p style="margin:0 0 12px"><a href="${cardUrl}" style="display:inline-block;background:#b45309;color:#fff;padding:10px 18px;border-radius:14px;text-decoration:none;font-weight:500">See my card &rarr;</a></p>
<p style="margin:0 0 24px"><a href="${tweetHref}" style="display:inline-block;background:#fff;color:#1a1a1a;border:1px solid #ddd;padding:9px 17px;border-radius:14px;text-decoration:none;font-weight:500">Share to X &nearr;</a></p>
<p style="font-size:13px;color:#666;margin:0 0 18px">The Share button composes a tweet that says <em>"My coffee chat page is live — invite me for a coffee ☕"</em> linked to your card. Edit before posting if you want.</p>
<p style="font-size:13px;color:#666;margin:0 0 8px">Other places that work:</p>
<ul style="font-size:13px;color:#666;padding-left:20px;margin:0 0 24px">
  <li style="margin-bottom:4px">Your X / Twitter bio (literally one line)</li>
  <li style="margin-bottom:4px">Slack signature for the workspaces you&apos;re in</li>
  <li style="margin-bottom:4px">Email footer</li>
</ul>
<p style="font-size:12px;color:#888;border-top:1px dashed #ddd;padding-top:16px;margin:0">${siteName} &middot; You&apos;re receiving this because you just signed up. First invites usually come from your existing graph, so the more places the link sits, the better.</p>
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
}) {
  const cardUrl = `${siteUrl}/${args.hostHandle}`;
  await sendEmail({
    to: args.to,
    subject: `We sent your coffee invite to ${args.hostDisplayName}`,
    text:
      `Hi ${args.requesterName},\n\n` +
      `Your invite to ${args.hostDisplayName} is in their inbox. They'll either accept (you'll get an email with their contact channels) or decline (you'll get a polite note). Either way you'll hear back; if not, the invite expires after 7 days.\n\n` +
      `Their card: ${cardUrl}\n\n— ${siteName}`,
    html: `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55;max-width:540px;margin:0 auto;padding:24px">
<p style="font-size:15px;margin:0 0 14px">Hi ${escapeHtml(args.requesterName)},</p>
<p style="font-size:15px;margin:0 0 14px">Your invite to <strong>${escapeHtml(args.hostDisplayName)}</strong> is in their inbox.</p>
<p style="font-size:14px;color:#555;margin:0 0 18px">They&apos;ll either accept — you&apos;ll get an email with their contact channels — or decline, in which case you&apos;ll get a polite note. Either way you&apos;ll hear back; if not, the invite expires after 7 days.</p>
<p style="margin:0 0 24px"><a href="${cardUrl}" style="color:#b45309">See their card &rarr;</a></p>
<p style="font-size:12px;color:#888;border-top:1px dashed #ddd;padding-top:16px;margin:0">${siteName} &middot; You&apos;re receiving this because you filled the invite form on ${escapeHtml(args.hostDisplayName)}&apos;s card.</p>
</body></html>`,
  });
}

const MODE_PHRASE: Record<InviteMode, string> = {
  online: "an online coffee chat",
  in_person: "an in-person coffee",
  either: "a coffee chat (online or in person)",
};

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
}) {
  const inboxUrl = `${siteUrl}/profile`;
  const modePhrase = MODE_PHRASE[args.mode];
  const timeLine = args.preferredTime
    ? `\nPreferred time: ${args.preferredTime}`
    : "";
  await sendEmail({
    to: args.to,
    subject: `${args.requesterName} wants ${modePhrase} — re: ${truncate(args.requesterTopic, 60)}`,
    text:
      `${args.requesterName} (${args.requesterEmail}) just sent you a coffee invite on ${siteName}.\n\n` +
      `Mode: ${modePhrase}\n` +
      `Topic: ${args.requesterTopic}${timeLine}\n\n` +
      `Open your inbox to accept or decline: ${inboxUrl}\n\n` +
      `On accept, ${siteName} emails your contact channels to them.\n` +
      `On decline, they get a polite "booked up" note. Pending invites expire after 7 days.\n\n— ${siteName}`,
    html: `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55;max-width:540px;margin:0 auto;padding:24px">
<p style="font-size:16px;margin:0 0 12px"><strong>${escapeHtml(args.requesterName)}</strong> wants ${escapeHtml(modePhrase)} with you on ${siteName}.</p>
<p style="font-size:14px;color:#555;margin:0 0 6px"><strong>Topic:</strong> ${escapeHtml(args.requesterTopic)}</p>
${args.preferredTime ? `<p style="font-size:14px;color:#555;margin:0 0 6px"><strong>Preferred time:</strong> ${escapeHtml(args.preferredTime)}</p>` : ""}
<p style="font-size:14px;color:#555;margin:0 0 20px"><strong>Email:</strong> <a href="mailto:${escapeHtml(args.requesterEmail)}" style="color:#b45309">${escapeHtml(args.requesterEmail)}</a></p>
<p style="margin:0 0 24px"><a href="${inboxUrl}" style="display:inline-block;background:#b45309;color:#fff;padding:10px 18px;border-radius:14px;text-decoration:none;font-weight:500">Open inbox &rarr;</a></p>
<p style="font-size:12px;color:#888;border-top:1px dashed #ddd;padding-top:16px;margin:0">On accept we email your contact channels to them. On decline they get a polite note. Pending invites expire after 7 days.</p>
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
}) {
  const cardUrl = `${siteUrl}/${args.hostHandle}`;
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
    subject: `${args.hostDisplayName} said yes — here's how to reach them`,
    text:
      `Hi ${args.requesterName},\n\n` +
      `${args.hostDisplayName} accepted your coffee invite on ${siteName}.\n\n` +
      `Pick a channel and say hi:\n${textChannels}\n\n` +
      `Their card: ${cardUrl}\n\n— ${siteName}`,
    html: `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55;max-width:540px;margin:0 auto;padding:24px">
<p style="font-size:16px;margin:0 0 14px">Hi ${escapeHtml(args.requesterName)},</p>
<p style="font-size:15px;margin:0 0 18px"><strong>${escapeHtml(args.hostDisplayName)}</strong> accepted your coffee invite on ${siteName}. Pick a channel and say hi:</p>
<ul style="font-size:14px;padding-left:20px;margin:0 0 24px">${htmlChannels}</ul>
<p style="margin:0 0 24px"><a href="${cardUrl}" style="color:#b45309">See their card &rarr;</a></p>
<p style="font-size:12px;color:#888;border-top:1px dashed #ddd;padding-top:16px;margin:0">${siteName} hands you off here. We don't read your conversation; the rest is between the two of you.</p>
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
}) {
  await sendEmail({
    to: args.to,
    subject: `${args.hostDisplayName} is booked up — but thanks for reaching out`,
    text:
      `Hi ${args.requesterName},\n\n` +
      `Thanks for reaching out via ${siteName}. ${args.hostDisplayName} can't take your coffee invite right now — schedules are tight or the timing's off.\n\n` +
      `No reply expected. If something changes you're welcome to reach out again.\n\n— ${siteName}`,
    html: `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55;max-width:540px;margin:0 auto;padding:24px">
<p style="font-size:15px;margin:0 0 14px">Hi ${escapeHtml(args.requesterName)},</p>
<p style="font-size:15px;margin:0 0 14px">Thanks for reaching out via ${siteName}. <strong>${escapeHtml(args.hostDisplayName)}</strong> can't take your coffee invite right now — schedules are tight or the timing's off.</p>
<p style="font-size:14px;color:#555;margin:0 0 24px">No reply expected. If something changes you're welcome to reach out again.</p>
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
