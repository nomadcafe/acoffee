import { Resend } from "resend";
import { INTENT_KIND_LABEL } from "./intent-labels";
import { siteName, siteUrl } from "./site";
import type { IntentKind } from "./types";

// Email is best-effort. RESEND_API_KEY + EMAIL_FROM missing → skip; send
// failure → log only, never throw. We don't want a flaky email provider
// blocking the underlying DB write (intent response / accept).
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

// "Someone responded to your intent." Sent to the intent owner after a
// responder taps "I'm in" on /meet or the cafe roster. Drives them back to
// /meet to accept or decline.
export async function emailIntentResponse(args: {
  to: string;
  responderHandle: string;
  intentKind: IntentKind;
}) {
  const kind = INTENT_KIND_LABEL[args.intentKind];
  const url = `${siteUrl}/chiang-mai/meet`;
  await sendEmail({
    to: args.to,
    subject: `@${args.responderHandle} responded to your ${kind} on ${siteName}`,
    text:
      `@${args.responderHandle} is in for ${kind}.\n\n` +
      `Accept or decline on ${siteName}: ${url}\n\n— ${siteName}`,
    html: emailShell(
      `@${args.responderHandle} is in for <strong>${kind}</strong>.`,
      url,
      "Open acoffee to accept or decline →",
    ),
  });
}

// "Your match accepted you." Sent to the responder when the host taps Accept.
// THE magic-moment email — should land within a minute of the accept and
// click straight into the contact reveal.
export async function emailIntentAccepted(args: {
  to: string;
  hostHandle: string;
  intentKind: IntentKind;
}) {
  const kind = INTENT_KIND_LABEL[args.intentKind];
  const url = `${siteUrl}/chiang-mai/meet`;
  await sendEmail({
    to: args.to,
    subject: `🎉 @${args.hostHandle} accepted you for ${kind} on ${siteName}`,
    text:
      `@${args.hostHandle} accepted you for ${kind}. Their contact channels are now revealed.\n\n` +
      `Open ${siteName} to message them: ${url}\n\n— ${siteName}`,
    html: emailShell(
      `🎉 <strong>@${args.hostHandle}</strong> accepted you for <strong>${kind}</strong>.<br/><br/>Their contact channels (Telegram / WhatsApp) are now revealed.`,
      url,
      "Open acoffee to message them →",
    ),
  });
}

// Minimal HTML shell — plain inline styles only, no external CSS. Loud
// branded shells get spam-filtered; this stays close to plain text so it
// lands in the inbox and reads cleanly on dark mode clients.
function emailShell(bodyHtml: string, ctaHref: string, ctaText: string): string {
  return `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.5;max-width:520px;margin:0 auto;padding:24px">
<p style="font-size:16px;margin:0 0 16px">${bodyHtml}</p>
<p style="margin:0 0 32px"><a href="${ctaHref}" style="display:inline-block;background:#b45309;color:#fff;padding:10px 18px;border-radius:9999px;text-decoration:none;font-weight:500">${ctaText}</a></p>
<p style="font-size:12px;color:#888;border-top:1px dashed #ddd;padding-top:16px;margin:0">${siteName} · You're receiving this because you're signed up on acoffee.</p>
</body></html>`;
}
