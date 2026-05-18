import { Resend } from "resend";
import { siteName, siteUrl } from "./site";

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
  const profileUrl = `${siteUrl}/profile`;
  await sendEmail({
    to: args.to,
    subject: `Welcome, @${args.handle} · your acoffee card is live`,
    text:
      `Welcome to ${siteName}, @${args.handle}.\n\n` +
      `Your card is now live at ${cardUrl}.\n\n` +
      `Two quick things to do:\n\n` +
      `1. Fill the card — city, a one-line status, what you're up for: ${profileUrl}\n` +
      `2. Share the link in a Slack, a tweet, or DM to a friend in your next city.\n\n` +
      `When someone clicks "Invite for coffee", they get your contact channels.\n\n— ${siteName}`,
    html: `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55;max-width:540px;margin:0 auto;padding:24px">
<p style="font-size:16px;margin:0 0 18px">Welcome to <strong>${siteName}</strong>, <strong>@${args.handle}</strong>.</p>
<p style="font-size:14px;color:#555;margin:0 0 12px">Your card is now live:</p>
<p style="font-size:15px;margin:0 0 18px"><a href="${cardUrl}" style="color:#b45309;font-weight:500">${cardUrl} &rarr;</a></p>
<p style="font-size:14px;color:#555;margin:0 0 12px">Two quick things to do:</p>
<ol style="font-size:14px;padding-left:20px;margin:0 0 24px">
  <li style="margin-bottom:8px">Fill the card &mdash; city, a one-line status, what you're up for &mdash; <a href="${profileUrl}" style="color:#b45309">edit your card &rarr;</a></li>
  <li style="margin-bottom:8px">Share the link in a Slack, a tweet, or DM to a friend in your next city.</li>
</ol>
<p style="margin:0 0 28px"><a href="${cardUrl}" style="display:inline-block;background:#b45309;color:#fff;padding:10px 18px;border-radius:14px;text-decoration:none;font-weight:500">See my card &rarr;</a></p>
<p style="font-size:12px;color:#888;border-top:1px dashed #ddd;padding-top:16px;margin:0">${siteName} &middot; You're receiving this because you just signed up.</p>
</body></html>`,
  });
}
