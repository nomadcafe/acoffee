// Strings for the public-facing pages translated into the supported
// locales. This file is pure (no Node/Edge-only deps) so it's safe to
// import from both server and client components. The `t()` helper at
// the bottom falls back to `en` for any missing key, so new English
// copy lands first and the other locales catch up later.

export const LOCALES = ["en", "zh", "ja"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  ja: "日本語",
};

export function isLocale(v: string | undefined | null): v is Locale {
  return v === "en" || v === "zh" || v === "ja";
}
export const en = {
  // Hero — home page top
  "hero.eyebrow": "Meet builders, nomads & interesting people",
  "hero.h1": "Coffee in bio.",
  "hero.sub.pre": "Your friendly coffee chat page at ",
  "hero.sub.post":
    ". Share your link once — get invited for coffee, online or in person, by builders, nomads, and interesting people.",
  "hero.cta.makeCard": "Make your card",
  "hero.cta.howItWorks": "How it works",

  // How it works — home page section
  "how.eyebrow": "How it works",
  "how.h2": "Three steps. One card. No swiping.",
  "how.step1.title": "Claim your handle",
  "how.step1.body.pre":
    "Sign in once. Pick the URL others will recognise you by — ",
  "how.step1.body.post": ". That's your card forever.",
  "how.step2.title": "Fill your card",
  "how.step2.body":
    "Your city, a line about what you're doing, what you're up for. Add Telegram or email so invites actually land — and times you're free, if you'd like people to book a slot.",
  "how.step3.title": "Share & get invited",
  "how.step3.body.pre":
    "Drop your card link in a Slack, a tweet, a co-working board. Whoever you share it with clicks ",
  "how.step3.body.quoted": "“Invite for coffee”",
  "how.step3.body.post": " and you're talking by tonight.",

  // Home page "Why this exists" — personal narrative section between
  // the hero and How-it-works. First-person voice; gives the product a
  // reason instead of just a feature pitch.
  "home.why.eyebrow": "Why",
  "home.why.body":
    "With acoffee, you might meet a few new people. You can also share when you're free and let others book a coffee with you.",

  "home.proof": "{count} builders & nomads with a coffee card",

  // Home page signature footer
  "homeFooter.signature":
    "Made between cafés. If you're reading this from a new city, welcome — make a card so the next person doesn't feel so alone.",

  // Global site footer
  "siteFooter.privacy": "Privacy",
  "siteFooter.terms": "Terms",
  "siteFooter.openSource": "Open source",

  // Sign in page
  "signin.eyebrow": "Sign in to acoffee",
  "signin.h1": "One tap, no password.",
  "signin.sub":
    "Enter your email — we'll send you a link that signs you in on the device you opened it from.",
  "signin.google": "Continue with Google",
  "signin.google.pending": "Redirecting…",
  "signin.or": "or",
  "signin.captcha.failed":
    "Couldn't load the verification widget. Disable any ad/script blocker and retry, or use Google sign-in above.",
  "signin.email.label": "Email",
  "signin.button": "Send sign-in link",
  "signin.button.pending": "Sending…",
  "signin.sent.sub": "The link opens you back here, signed in.",
  "signin.sent.wrongEmail": "Wrong email? Send to another →",

  // 404
  "notfound.eyebrow": "404 · Lost in transit",
  "notfound.h1": "That page or card doesn't exist.",
  "notfound.sub":
    "Maybe the handle is unclaimed, maybe a link broke, maybe someone fat-fingered the URL. Wherever you meant to go, head back to the front page — or make your own coffee card while you're here.",
  "notfound.cta.home": "Back to home",
  "notfound.cta.make": "Make your card",

  // Public card page — owner self-view + no-contact empty state
  "card.owner.note.invitable":
    "This is your card · visitors see an Invite button here.",
  "card.owner.note.noContact":
    "This is your card · add a contact channel to enable invites.",
  "card.noContact":
    "{name} hasn't added a contact channel yet — invites are disabled until they do.",

  // InviteForm — gate (button visible before form opens)
  "invite.gate.text": "Contact unlocks on accepted invite",
  "invite.gate.cta": "Invite for coffee",

  // CardBody — meta strings reused across SampleCard / LiveCardPreview / real card
  "card.noStatus": "No status yet.",

  // /[handle] page chrome — breadcrumb, owner incomplete-card nudge,
  // and the page-footer CTAs (owner edit vs visitor "make your own").
  "card.breadcrumb": "Coffee card",
  "card.nudge.eyebrow": "Almost there",
  "card.nudge.title": "This is your card — it's looking sparse.",
  "card.nudge.body.both":
    "Add a one-line status and a contact channel — that's what makes the card worth sharing.",
  "card.nudge.body.status":
    "Add a one-line status so visitors see what you're up to.",
  "card.nudge.body.contact":
    "Add at least one contact channel (Telegram or email) — otherwise no one can actually invite you.",
  "card.nudge.cta": "Finish your card",
  "card.owner.footer.note": "Your card lives here. Come back to edit it anytime.",
  "card.owner.footer.cta": "Edit my card",
  "card.visitor.footer.note":
    "Like this card? Make your own — share what you're working on, get invited for coffee in your next city.",

  // SampleCard on the home hero
  "sample.live": "Live preview",
  "sample.badge": "Sample",
  "sample.contactUnlock": "Contact unlocks on invite",

  // LiveCardPreview on /profile
  "preview.badge": "Preview",
  "preview.noContact": "Add a contact channel — otherwise no one can invite you",

  // SiteNav signed-out CTA + pending-invite tooltip
  "nav.signIn": "Sign in",
  "nav.invitesPending": "{n} pending invite{plural}",

  // InviteForm — open form
  "invite.form.title": "Invite {name} for coffee",
  "invite.form.cancel": "Cancel",
  "invite.form.name.label": "Your name",
  "invite.form.name.placeholder": "Alex",
  "invite.form.email.label": "Your email",
  "invite.form.email.placeholder": "alex@example.com",
  "invite.form.email.hint": "{name} will reply here if they accept.",
  "invite.form.topic.label": "What you'd like to chat about",
  "invite.form.topic.placeholder":
    "I'm starting a domains-focused newsletter and would love to swap notes — saw your card via your tweet.",
  "invite.form.kind.legend": "What would you like to do with {name}?",
  "invite.form.time.label": "Preferred time (optional)",
  "invite.form.time.placeholder":
    "Tue / Thu afternoons · or any morning next week",
  "invite.form.time.hint":
    "Free-form — both sides nail down the exact slot after accept.",
  // v16 — slot picker shown instead of the free-form time when the host
  // has scheduling on and has open slots.
  "invite.form.slot.legend": "Pick a time",
  "invite.form.slot.presence": "Only in {city} until {date} — grab a time before then.",
  "invite.form.slot.hint":
    "Times in {tz}. {name} confirms when they accept.",
  "invite.form.slot.none":
    "No open times right now — suggest one below instead.",
  "invite.form.submit": "Send invite",
  "invite.form.submit.pending": "Sending…",
  "invite.form.note": "No account needed — your email is just for the reply.",

  // InviteForm — sent state
  "invite.sent.title": "Invite sent ✓",
  "invite.sent.body":
    "{name} will get your invite by email. We just sent you a confirmation too. If they accept, their contact channels land in your inbox; if not, you'll get a polite note.",
  "invite.sent.ttl": "Pending invites expire after 7 days.",
  "invite.sent.sendAnother": "Send another invite to {name} →",

  // Profile page header
  "profile.header.welcome.eyebrow": "Welcome to acoffee",
  "profile.header.welcome.h1": "Pick how others see you.",
  "profile.header.welcome.sub":
    "One-time setup. Pick a handle others can recognize you by, then add Telegram or email so invites actually land.",
  "profile.header.normal.eyebrow": "Your acoffee card",
  "profile.header.normal.h1": "How others see you.",
  "profile.header.normal.sub":
    "Edit your card below. Contact channels stay hidden until someone invites you for coffee.",
  "profile.signin.h1": "Sign in to edit your profile.",
  "profile.signin.cta": "Sign in",

  // ProfileForm fieldsets + chips
  "profile.identity.legend": "Identity",
  "profile.upFor.legend": "What you're up for",
  "profile.upFor.hint":
    "Pick any — they show up as chips on your public card.",
  "profile.field.gender.label": "Gender",
  "profile.field.gender.hint":
    "Optional · shown as a small soft signal on your card. Skip if you'd rather not say.",
  "profile.field.gender.opt.unset": "Prefer not to say",
  "profile.field.gender.opt.woman": "♀ Woman",
  "profile.field.gender.opt.man": "♂ Man",

  "profile.socials.legend": "Socials · public on your card",
  "profile.socials.hint":
    "Links anyone visiting your card can click. Already public on the platforms, so no invite-accept needed.",
  "profile.socials.empty": "No links yet — add one to surface on your card.",
  "profile.socials.add": "Add link",
  "profile.socials.remove": "Remove this link",
  "profile.socials.platformLabel": "Platform",
  "profile.socials.max": "Max links reached.",
  "profile.interests.legend": "Interests · public on your card",
  "profile.interests.hint":
    "A few tags for what you're into — gives someone a reason to say hi, and helps people find you on Browse.",
  "profile.interests.placeholder": "Add an interest (e.g. design, ai)",
  "profile.interests.add": "Add",
  "profile.interests.empty":
    "No tags yet — add a few so people know what you're into.",
  "profile.interests.max": "Max tags reached.",
  "profile.interests.suggested": "Suggestions",
  "profile.interests.remove": "Remove",

  "profile.contact.legend": "Contact · revealed only after invite",
  "profile.kind.coffee": "Coffee",
  "profile.kind.cowork": "Cowork",
  "profile.kind.dinner": "Dinner",
  "profile.kind.hike": "Hike",
  "profile.kind.work_talk": "Work talk",

  // v16 — opt-in coffee scheduling editor (AvailabilityEditor)
  "profile.scheduling.legend": "Coffee scheduling",
  "profile.scheduling.hint":
    "Offer specific times. Visitors book one when they invite you, instead of a free-form “when works”.",
  "profile.scheduling.toggle": "Let visitors book a specific time",
  "profile.scheduling.tzLabel": "Timezone",
  "profile.scheduling.tzDetected": "Detected {tz} — use it",
  "profile.scheduling.add": "Add time",
  "profile.scheduling.tzNote":
    "Times shown in {tz} — visitors see them in this zone too.",
  "profile.scheduling.empty": "No times yet — add one above.",
  "profile.scheduling.booked": "Booked",
  "profile.scheduling.remove": "Remove time",
  "profile.scheduling.invalid": "Pick a valid date and time.",

  // ProfileForm fields
  "profile.field.handle.label": "Handle",
  "profile.field.handle.placeholder": "pick one · e.g. alex_nomad",
  "profile.field.handle.hint.auto":
    "Currently auto-assigned · 3–20 chars · a–z, 0–9, _",
  "profile.field.handle.hint.normal": "3–20 chars · a–z, 0–9, _",
  "profile.field.handle.available": "Available ✓ · acoffee.com/{handle}",
  "profile.field.handle.yours": "That's your current handle.",
  "profile.field.handle.checking": "Checking…",
  "profile.field.handle.taken": "That handle is taken — try another.",
  "profile.field.handle.reserved":
    "That handle is reserved — try another.",
  "profile.field.handle.tooShort": "Needs at least 3 characters.",
  "profile.field.handle.fallbackName": "Your name",
  "profile.field.handle.badFormat":
    "Lowercase letters, digits, and _ only.",
  "profile.field.city.label": "City",
  "profile.field.city.placeholder": "Chiang Mai",
  "profile.field.city.hint":
    "Where you want to be found — leave blank if you're between cities",
  "profile.field.cityUntil.label": "Until (optional)",
  "profile.field.cityUntil.hint":
    "Add a date if you're just passing through — leave blank if you live here.",
  "presence.banner": "In {city} until {date}",
  "profile.field.status.label": "Status",
  "profile.field.status.hint":
    "One line · what you're doing, what you're up for",
  "profile.field.telegram.label": "Telegram",
  "profile.field.telegram.placeholder": "@yourhandle",
  "profile.field.telegram.hint":
    "Recommended · username only, no phone number shared",
  "profile.field.email.label": "Email",
  "profile.field.email.placeholder": "you@example.com",
  "profile.field.email.hint":
    "Optional · a public contact email — can differ from sign-in",

  // Save
  "profile.save": "Save",
  "profile.save.continue": "Save & continue",
  "profile.save.pending": "Saving…",
  "profile.save.saved": "Saved.",

  // LiveCardPreview
  "profile.preview.label": "Live preview",
  "profile.preview.updates.pre":
    "Updates as you type. This is what visitors see at ",
  "profile.preview.updates.post": ".",

  // AvatarUpload
  "avatar.upload": "Upload photo",
  "avatar.change": "Change photo",
  "avatar.uploading": "Uploading…",
  "avatar.remove": "Remove",
  "avatar.removing": "Removing…",
  "avatar.hint":
    "PNG / JPG / WebP / GIF. Auto-cropped square and resized to 256×256.",
  "avatar.error.notImage": "Pick an image — JPG, PNG, WebP, or GIF.",
  "avatar.error.tooBig": "Too big — keep it under 8 MB.",

  // OnboardingBanner — keeps nudging the user to pick a real handle as
  // long as the auto-generated `user_<hex>` one is still in place.
  "onboarding.banner.text":
    "You're showing up as {handle} — pick a real handle so others can find you.",
  "onboarding.banner.cta": "Pick a handle →",

  // CardSharePanel
  "share.eyebrow": "Your card is live",
  "share.h2": "Share it — that's how the invites start.",
  "share.copy": "Copy",
  "share.copied": "Copied",
  "share.copy.ariaIdle": "Copy card URL to clipboard",
  "share.copy.ariaCopied": "Card URL copied to clipboard",
  "share.live.announcement": "Card URL copied to clipboard.",
  "share.viewMyCard": "View my card",
  "share.shareOnX": "Share on X",
  "share.native": "Share",
  "share.channelAria": "Share on {channel}",

  // Account section
  "account.eyebrow": "Account",
  "account.yourCard": "Your card:",
  "account.joined": "Joined {date}",
  "account.signedInAs": "Signed in as ",
  "account.signOut": "Sign out",

  // Avatar dropdown in the top nav
  "nav.menu.viewCard": "View your card",
  "nav.menu.editProfile": "Edit profile",

  // Danger zone
  "danger.eyebrow": "Danger zone",
  "danger.deleteButton": "Delete account",
  "danger.confirm.intro":
    "This wipes your card, avatar, and sign-in — and can't be undone. The handle becomes available for someone else to claim.",
  "danger.confirm.typePre": "Type ",
  "danger.confirm.typePost": " to confirm.",
  "danger.confirm.yes": "Yes, delete everything",
  "danger.confirm.no": "Cancel",
  "danger.confirm.deleting": "Deleting…",

  // InviteInbox
  "inbox.eyebrow": "Inbox",
  "inbox.expireNote": "Pending invites expire after 7 days",
  "inbox.tab.pending": "Pending",
  "inbox.tab.history": "History",
  "inbox.empty.both":
    "No invites yet. When someone fills your invite form on acoffee.com/{handle} they'll show up here for you to accept or decline.",
  "inbox.empty.pending":
    "Nothing to decide right now. Past invites are in the History tab.",
  "inbox.empty.history":
    "No past invites yet. Once you accept or decline a few they'll live here.",
  "inbox.row.email": "Email:",
  "inbox.row.when": "When:",
  "inbox.action.accept": "Accept",
  "inbox.action.decline": "Decline",
  "inbox.confirm.accepted":
    "Accepted — emailing your contact channels to {name}.",
  "inbox.confirm.declined":
    "Declined — emailing a polite note to {name}.",
  "inbox.status.accepted": "Accepted ✓",
  "inbox.status.declined": "Declined",
  "inbox.status.expired": "Expired",
  "inbox.delivery.failed":
    "Couldn't email your contact to {name}. They haven't received it — resend?",
  "inbox.delivery.acceptedWarn":
    "Accepted — but the email to {name} didn't go through. Resend it below.",
  "inbox.delivery.resend": "Resend contact",
  "inbox.delivery.resending": "Sending…",
  "inbox.delivery.resent": "Sent ✓",

  // Relative-time helpers
  "time.justNow": "just now",
  "time.minutesAgo": "{n}m ago",
  "time.hoursAgo": "{n}h ago",
  "time.daysAgo": "{n}d ago",

  // Tweet text the CardSharePanel + welcome email pre-fill into a
  // Twitter intent URL. Translated so visitors who flipped to zh/ja can
  // share in their own language by default; they can still edit before
  // posting.
  "share.tweet.text":
    "My coffee chat page is live — invite me for a coffee ☕",

  // Visitor-facing emails — sent in the locale the requester was
  // browsing in when they submitted the invite (stored on the row).
  "email.received.subject": "We sent your coffee invite to {host}",
  "email.received.greeting": "Hi {name},",
  "email.received.intro": "Your invite to {host} is in their inbox.",
  "email.received.explanation":
    "They'll either accept — you'll get an email with their contact channels — or decline, in which case you'll get a polite note. Either way you'll hear back; if not, the invite expires after 7 days.",
  "email.received.viewCard": "See their card",
  "email.received.disclaimer":
    "You're receiving this because you filled the invite form on {host}'s card.",

  "email.accepted.subject":
    "{host} said yes — here's how to reach them",
  "email.accepted.greeting": "Hi {name},",
  "email.accepted.intro":
    "{host} accepted your coffee invite on acoffee. Pick a channel and say hi:",
  "email.accepted.viewCard": "See their card",
  // v16 — the booked slot, already formatted in the host's tz + visitor's
  // locale. Only present when the visitor picked a scheduling slot.
  "email.accepted.time": "Your time: {time}",
  "email.accepted.disclaimer":
    "acoffee hands you off here. We don't read your conversation; the rest is between the two of you.",

  "email.declined.subject":
    "{host} is booked up — but thanks for reaching out",
  "email.declined.greeting": "Hi {name},",
  "email.declined.body":
    "Thanks for reaching out via acoffee. {host} can't take your coffee invite right now — schedules are tight or the timing's off.",
  "email.declined.footer":
    "No reply expected. If something changes you're welcome to reach out again.",

  // Welcome email — sent to the host after they finish onboarding
  // (auto handle → real handle). Locale = the host's request locale
  // at the moment they save the form.
  "email.welcome.subject": "Welcome, @{handle} · your acoffee card is live",
  "email.welcome.h1": "Hey @{handle} — welcome to acoffee.",
  "email.welcome.cardLive": "Your card is live at {url}.",
  "email.welcome.tagline":
    "The card is the whole product — once it's somewhere people can see it, the rest takes care of itself. Two things to do today:",
  "email.welcome.cta.view": "See my card",
  "email.welcome.cta.share": "Share to X",
  "email.welcome.tweetNote":
    "The Share button composes a tweet (\"{tweet}\") linked to your card — edit before posting if you like.",
  "email.welcome.placesHeader": "Other places the link works:",
  "email.welcome.place.bio": "Your X / Twitter bio",
  "email.welcome.place.slack":
    "Slack signatures for the workspaces you're already in",
  "email.welcome.place.email": "Email footer",
  "email.welcome.disclaimer":
    "First invites usually come from people who already know you. The next one shows up from somewhere unexpected — that's the part I'm hoping for too.",
  "email.welcome.signoff": "Made between cafés.",

  // New-invite email — sent to the host when a visitor submits the
  // invite form. Locale = host's profiles.locale.
  "email.newInvite.subject":
    "{name} wants {modePhrase} — re: {topic}",
  // {modePhrase} is filled with one of these activity phrases, keyed by
  // the kind the visitor picked (always one the host advertised).
  "email.newInvite.kindPhrase.coffee": "a coffee",
  "email.newInvite.kindPhrase.cowork": "a coworking session",
  "email.newInvite.kindPhrase.dinner": "dinner",
  "email.newInvite.kindPhrase.hike": "a hike",
  "email.newInvite.kindPhrase.work_talk": "a work chat",
  "email.newInvite.heading":
    "{name} wants {modePhrase} with you on acoffee.",
  "email.newInvite.field.topic": "Topic:",
  "email.newInvite.field.time": "Preferred time:",
  "email.newInvite.field.email": "Email:",
  "email.newInvite.cta": "Open inbox",
  "email.newInvite.disclaimer":
    "On accept we email your contact channels to them. On decline they get a polite note. Pending invites expire after 7 days.",

  // Confirmation email — sent to the visitor immediately after they
  // submit the invite form. Replaces the v0.8.4 "received" email; the
  // host is NOT notified until the visitor clicks this link, so a fake
  // email leaves the host's inbox alone.
  "email.confirm.subject": "Confirm your coffee invite to {host}",
  "email.confirm.greeting": "Hi {name},",
  "email.confirm.intro":
    "Click the link to send your coffee invite to {host}. Until you confirm, the invite is on hold — they won't see it.",
  "email.confirm.cta": "Confirm and send",
  "email.confirm.disclaimer":
    "If you didn't mean to do this, just ignore this email — nothing happens. The link expires in 7 days.",

  // InviteForm — success state after submit. Now points the visitor
  // back to their inbox instead of claiming the host already has the
  // invite.
  "invite.sent.check.title": "Check your email",
  "invite.sent.check.body":
    "We sent a confirmation link to {email}. Click it to send your invite to {name}. Nothing reaches them until you do.",
  "invite.sent.check.ttl": "Unconfirmed invites expire after 7 days.",
  "invite.sent.check.sendAnother": "Use a different email →",

  // Signed-in shortcut — visitor was already on acoffee, we skipped
  // the AA2 confirm round-trip and pushed straight to the host.
  "invite.sent.direct.title": "Sent",
  "invite.sent.direct.body":
    "{name} has your invite. They'll email you back if they accept.",

  // Sign-in nudge on the gate (closed-form state) — invites acoffee
  // users to sign in for the streamlined path.
  "invite.gate.signinPrompt": "Already on acoffee?",
  "invite.gate.signinLink": "Sign in to skip email confirm →",
  "invite.gate.signedInAs":
    "Sending as @{handle} · contact unlocks on accept",
  // Handle-less variant for a signed-in viewer who hasn't claimed a real
  // handle yet (so we don't surface the auto `user_…` placeholder).
  "invite.gate.signedInGeneric":
    "Sending from your account · contact unlocks on accept",

  // Banner inside the open form for signed-in visitors.
  "invite.form.signedIn":
    "Signed in as @{handle} — invite goes straight through, no email confirm needed.",
  "invite.form.signedInGeneric":
    "Signed in — your invite goes straight through, no email confirm needed.",
  "invite.form.email.locked": "Using your account email",

  // Confirm page — what the visitor sees after clicking the link.
  "confirm.success.title": "Your invite is on its way",
  "confirm.success.body":
    "{host} now has your invite. You'll get an email when they accept or decline.",
  "confirm.success.viewCard": "See {host}'s card",
  "confirm.alreadyDone.title": "This invite is already on its way",
  "confirm.alreadyDone.body":
    "Looks like you confirmed this one already, or {host} has decided. Check your email for follow-ups.",
  "confirm.expired.title": "This link expired",
  "confirm.expired.body":
    "Confirmation links are valid for 7 days. Send a fresh invite if you still want to reach out.",
  "confirm.notFound.title": "Invite not found",
  "confirm.notFound.body":
    "This link is invalid or has already been used.",
  "confirm.backHome": "Back to acoffee",

  // Language switcher
  "lang.label": "Language",

  // Invite-link generator (/invite) — the no-signup "invite someone for
  // coffee" page. Generator UI + the shared invitation landing card.
  "inviteLink.meta.title": "Invite someone for coffee · acoffee",
  "inviteLink.meta.desc":
    "Make a coffee invitation link and send it to anyone — no account needed.",
  "inviteLink.meta.descFrom": "{from} wants to grab a coffee with you.",
  "inviteLink.breadcrumb": "Invite someone",
  "inviteLink.h1": "Invite someone for coffee",
  "inviteLink.subhead":
    "Fill in a few details, copy the link, and send it however you like. No account needed — they'll see a friendly invitation when they open it.",
  "inviteLink.gen.from.label": "Your name",
  "inviteLink.gen.from.placeholder": "Who's inviting?",
  "inviteLink.gen.to.label": "Their name (optional)",
  "inviteLink.gen.to.placeholder": "Who are you inviting?",
  "inviteLink.gen.city.label": "City (optional)",
  "inviteLink.gen.city.placeholder": "Where? e.g. Lisbon, online",
  "inviteLink.gen.topic.label": "What you'd love to chat about (optional)",
  "inviteLink.gen.topic.placeholder": "domains, AI, nomad life…",
  "inviteLink.gen.kind.legend": "What kind of meetup?",
  "inviteLink.gen.link.label": "Your invite link",
  "inviteLink.gen.copy": "Copy link",
  "inviteLink.gen.copyText": "Copy as text",
  "inviteLink.gen.copied": "Copied ✓",
  "inviteLink.gen.preview.label": "Preview",
  "inviteLink.gen.hint": "Fill in at least one field to get your link.",
  "inviteLink.gen.example.from": "Alex",
  "inviteLink.gen.example.city": "Lisbon",
  "inviteLink.gen.example.topic": "domains, AI & nomad life",
  "inviteLink.card.badge": "Coffee invite",
  "inviteLink.card.greeting": "Hi {name} 👋",
  "inviteLink.card.headlineFrom": "{from} wants to grab a coffee with you",
  "inviteLink.card.headlineAnon": "You're invited for coffee",
  "inviteLink.card.cta": "Get your own coffee page",
  "inviteLink.card.ctaSub":
    "Free — claim acoffee.com/you and let anyone invite you for coffee.",
  "inviteLink.card.what": "What's acoffee? →",
  "siteFooter.invite": "Invite someone",
  "home.inviteAlt.text": "Rather reach out than wait for an invite?",
  "home.inviteAlt.link": "Make an invite link →",
} as const;

export type DictKey = keyof typeof en;

export const zh: Record<DictKey, string> = {
  "hero.eyebrow": "认识 builders、数字游民和有趣的人",
  "hero.h1": "Coffee in bio.",
  "hero.sub.pre": "你的友好咖啡邀约页面 ",
  "hero.sub.post":
    "。一次分享你的链接——被想喝咖啡（线上或线下）的 builders、数字游民、有趣的人邀请。",
  "hero.cta.makeCard": "做我的名片",
  "hero.cta.howItWorks": "怎么用",

  "how.eyebrow": "怎么用",
  "how.h2": "三步。一张名片。不用刷选。",
  "how.step1.title": "认领你的 handle",
  "how.step1.body.pre": "登录一次。挑一个别人能记住的 URL —— ",
  "how.step1.body.post": "。这就是你以后的名片。",
  "how.step2.title": "填名片",
  "how.step2.body":
    "你所在的城市、一句话简介、想约什么。加 Telegram 或邮箱，邀请才能真正到达；想让人直接约时间，就放出你有空的时段。",
  "how.step3.title": "分享 & 收到邀请",
  "how.step3.body.pre":
    "把链接放进 Slack、推文、协作空间公告板。看到的人点 ",
  "how.step3.body.quoted": "「Invite for coffee」",
  "how.step3.body.post": "，今晚就能聊起来。",

  "home.why.eyebrow": "为什么",
  "home.why.body":
    "通过 acoffee，或许能认识一些新朋友。你也可以把自己有空的时间分享出来，让别人来约你喝杯咖啡。",

  "home.proof": "已有 {count} 位 builder 和数字游民挂出了咖啡名片",

  "homeFooter.signature":
    "在咖啡馆之间做的。如果你在一个陌生城市看到这个——欢迎。做张名片，让下一个人不那么孤单。",

  "siteFooter.privacy": "隐私",
  "siteFooter.terms": "条款",
  "siteFooter.openSource": "开源",

  "signin.eyebrow": "登录 acoffee",
  "signin.h1": "一键登录,无需密码。",
  "signin.sub": "输入邮箱——我们会发一个链接,从你打开它的设备登录。",
  "signin.google": "用 Google 登录",
  "signin.google.pending": "跳转中…",
  "signin.or": "或",
  "signin.captcha.failed":
    "验证组件加载失败。请关闭广告/脚本拦截插件后重试,或使用上方的 Google 登录。",
  "signin.email.label": "邮箱",
  "signin.button": "发送登录链接",
  "signin.button.pending": "发送中…",
  "signin.sent.sub": "点开链接就在这里登录。",
  "signin.sent.wrongEmail": "邮箱错了？换一个发 →",

  "notfound.eyebrow": "404 · 在路上丢了",
  "notfound.h1": "这个页面或名片不存在。",
  "notfound.sub":
    "可能 handle 还没人认领,可能链接坏了,可能有人输错了 URL。不管原本想去哪里——回首页吧,或者顺手做张自己的咖啡名片。",
  "notfound.cta.home": "回首页",
  "notfound.cta.make": "做我的名片",

  "card.owner.note.invitable": "这是你的名片 · 访客在这里看到「Invite」按钮。",
  "card.owner.note.noContact":
    "这是你的名片 · 加一个联系方式才能让别人邀请你。",
  "card.noContact": "{name} 还没添加联系方式——邀请功能要等到那时才开放。",

  "invite.gate.text": "联系方式将在邀请被接受后通过邮件发给你",
  "invite.gate.cta": "邀请喝咖啡",

  "card.noStatus": "还没填 status。",

  "card.breadcrumb": "咖啡名片",
  "card.nudge.eyebrow": "就差一点",
  "card.nudge.title": "这是你的名片——看起来还有点空。",
  "card.nudge.body.both":
    "加一句 status，再留一个联系方式——这样名片才值得分享。",
  "card.nudge.body.status": "加一句 status，让访客知道你在忙什么。",
  "card.nudge.body.contact":
    "至少留一个联系方式（Telegram 或邮箱）——否则没人能真的约到你。",
  "card.nudge.cta": "把名片补完",
  "card.owner.footer.note": "你的名片就在这里，随时回来编辑。",
  "card.owner.footer.cta": "编辑我的名片",
  "card.visitor.footer.note":
    "喜欢这张名片？也做一张你自己的——分享你在做的事，在下一座城市被约咖啡。",

  "sample.live": "实时预览",
  "sample.badge": "样例",
  "sample.contactUnlock": "联系方式在邀请被接受后才公开",

  "preview.badge": "预览",
  "preview.noContact": "添加一个联系方式——否则没人能邀请你",

  "nav.signIn": "登录",
  "nav.invitesPending": "{n} 条待处理邀请",

  "invite.form.title": "邀请 {name} 喝咖啡",
  "invite.form.cancel": "取消",
  "invite.form.name.label": "你的名字",
  "invite.form.name.placeholder": "小李",
  "invite.form.email.label": "你的邮箱",
  "invite.form.email.placeholder": "you@example.com",
  "invite.form.email.hint": "如果 {name} 接受邀请,会回到这个邮箱。",
  "invite.form.topic.label": "想聊什么",
  "invite.form.topic.placeholder":
    "我在做一个域名相关的 newsletter,想交换一些想法——从你的推文看到你的名片。",
  "invite.form.kind.legend": "想和 {name} 一起做点什么?",
  "invite.form.time.label": "偏好时间(可选)",
  "invite.form.time.placeholder": "周二/周四下午,或下周早上任何时间",
  "invite.form.time.hint": "随便写——接受后双方再敲具体时间。",
  "invite.form.slot.legend": "选择时间",
  "invite.form.slot.presence": "只在{city}待到 {date}——挑个之前的时间吧。",
  "invite.form.slot.hint": "时间按 {tz} 显示。{name} 接受后会确认。",
  "invite.form.slot.none": "暂时没有可约时间——可在下方填写建议时间。",
  "invite.form.submit": "发送邀请",
  "invite.form.submit.pending": "发送中…",
  "invite.form.note": "不需要账号——邮箱只是用来收回复。",

  "invite.sent.title": "邀请已发送 ✓",
  "invite.sent.body":
    "{name} 会收到邀请邮件,我们也已经给你发了确认邮件。如果接受,他们的联系方式会发到你邮箱;如果不接受,你也会收到一封礼貌的回复。",
  "invite.sent.ttl": "未处理的邀请 7 天后过期。",
  "invite.sent.sendAnother": "再给 {name} 发一封邀请 →",

  "profile.header.welcome.eyebrow": "欢迎来到 acoffee",
  "profile.header.welcome.h1": "决定别人怎么看你。",
  "profile.header.welcome.sub":
    "一次性设置。挑一个别人能认出你的 handle,然后加 Telegram 或邮箱,邀请才能真正到达。",
  "profile.header.normal.eyebrow": "你的 acoffee 名片",
  "profile.header.normal.h1": "别人怎么看到你。",
  "profile.header.normal.sub":
    "在下面编辑你的名片。联系方式在有人邀请你之前都不会公开。",
  "profile.signin.h1": "登录后编辑你的资料。",
  "profile.signin.cta": "登录",

  "profile.identity.legend": "身份",
  "profile.upFor.legend": "想约什么",
  "profile.upFor.hint": "随意勾选——它们会以 chip 出现在你的公开名片上。",
  "profile.field.gender.label": "性别",
  "profile.field.gender.hint":
    "可选 · 在名片上作为一个软信号显示。不想填就跳过。",
  "profile.field.gender.opt.unset": "不填",
  "profile.field.gender.opt.woman": "♀ 女",
  "profile.field.gender.opt.man": "♂ 男",

  "profile.socials.legend": "社交媒体 · 在名片上公开显示",
  "profile.socials.hint":
    "访客点你的名片就能看到的链接。这些平台本来就是公开的,不需要 accept。",
  "profile.socials.empty": "还没填——加一个,卡片上就会显示。",
  "profile.socials.add": "添加链接",
  "profile.socials.remove": "删掉这个链接",
  "profile.socials.platformLabel": "平台",
  "profile.socials.max": "已达上限。",
  "profile.interests.legend": "兴趣标签 · 在名片上公开显示",
  "profile.interests.hint":
    "几个标签,说说你在做什么、喜欢什么——给人搭话的理由,也方便别人在「浏览」里找到你。",
  "profile.interests.placeholder": "添加兴趣(如 design、ai)",
  "profile.interests.add": "添加",
  "profile.interests.empty": "还没标签——加几个,让别人知道你的兴趣。",
  "profile.interests.max": "已达上限。",
  "profile.interests.suggested": "推荐",
  "profile.interests.remove": "删除",

  "profile.contact.legend": "联系方式 · 仅在邀请被接受后公开",
  "profile.kind.coffee": "咖啡",
  "profile.kind.cowork": "Cowork",
  "profile.kind.dinner": "吃饭",
  "profile.kind.hike": "徒步",
  "profile.kind.work_talk": "工作聊",

  "profile.scheduling.legend": "咖啡时间安排",
  "profile.scheduling.hint":
    "提供具体时间,访客邀请你时可直接预约,而不用自由填写时间。",
  "profile.scheduling.toggle": "让访客预约具体时间",
  "profile.scheduling.tzLabel": "时区",
  "profile.scheduling.tzDetected": "检测到 {tz}——使用它",
  "profile.scheduling.add": "添加时间",
  "profile.scheduling.tzNote": "时间按 {tz} 显示,访客也以该时区查看。",
  "profile.scheduling.empty": "还没有时间——在上方添加一个。",
  "profile.scheduling.booked": "已预约",
  "profile.scheduling.remove": "删除时间",
  "profile.scheduling.invalid": "请选择有效的日期和时间。",

  "profile.field.handle.label": "Handle",
  "profile.field.handle.placeholder": "挑一个 · 例如 alex_nomad",
  "profile.field.handle.hint.auto":
    "当前是自动分配 · 3–20 字符 · a–z, 0–9, _",
  "profile.field.handle.hint.normal": "3–20 字符 · a–z, 0–9, _",
  "profile.field.handle.available": "可用 ✓ · acoffee.com/{handle}",
  "profile.field.handle.yours": "这是你现在的 handle。",
  "profile.field.handle.checking": "检查中…",
  "profile.field.handle.taken": "这个 handle 被占了,换一个试试。",
  "profile.field.handle.reserved": "这个 handle 被保留,换一个试试。",
  "profile.field.handle.tooShort": "至少要 3 个字符。",
  "profile.field.handle.fallbackName": "你的名字",
  "profile.field.handle.badFormat": "只能用小写字母、数字和 _。",
  "profile.field.city.label": "城市",
  "profile.field.city.placeholder": "Chiang Mai",
  "profile.field.city.hint":
    "你希望别人能在哪里找到你——在城市间漂泊就留空",
  "profile.field.cityUntil.label": "到（可选）",
  "profile.field.cityUntil.hint":
    "只是路过就填个日期；长期住在这儿就留空。",
  "presence.banner": "在 {city}，到 {date}",
  "profile.field.status.label": "状态",
  "profile.field.status.hint": "一句话 · 你在做什么、想约什么",
  "profile.field.telegram.label": "Telegram",
  "profile.field.telegram.placeholder": "@yourhandle",
  "profile.field.telegram.hint":
    "推荐 · 只暴露用户名,不会泄露手机号",
  "profile.field.email.label": "邮箱",
  "profile.field.email.placeholder": "you@example.com",
  "profile.field.email.hint": "可选 · 公开联系邮箱——可以和登录邮箱不同",

  "profile.save": "保存",
  "profile.save.continue": "保存并继续",
  "profile.save.pending": "保存中…",
  "profile.save.saved": "已保存。",

  "profile.preview.label": "实时预览",
  "profile.preview.updates.pre": "随输入实时更新。访客看到的就是这个: ",
  "profile.preview.updates.post": "。",

  "avatar.upload": "上传照片",
  "avatar.change": "换张照片",
  "avatar.uploading": "上传中…",
  "avatar.remove": "删除",
  "avatar.removing": "删除中…",
  "avatar.hint":
    "PNG / JPG / WebP / GIF。自动正方形裁剪并缩放到 256×256。",
  "avatar.error.notImage": "选一张图——JPG、PNG、WebP 或 GIF。",
  "avatar.error.tooBig": "太大了——请小于 8 MB。",

  "onboarding.banner.text":
    "你现在显示为 {handle} —— 挑一个真正的 handle 让别人能找到你。",
  "onboarding.banner.cta": "选个 handle →",

  "share.eyebrow": "你的名片已上线",
  "share.h2": "分享它——这是邀请开始的地方。",
  "share.copy": "复制",
  "share.copied": "已复制",
  "share.copy.ariaIdle": "复制名片 URL 到剪贴板",
  "share.copy.ariaCopied": "名片 URL 已复制到剪贴板",
  "share.live.announcement": "名片 URL 已复制到剪贴板。",
  "share.viewMyCard": "查看我的名片",
  "share.shareOnX": "分享到 X",
  "share.native": "分享",
  "share.channelAria": "分享到 {channel}",

  "account.eyebrow": "账户",
  "account.yourCard": "你的名片:",
  "account.joined": "{date} 加入",
  "account.signedInAs": "登录身份: ",
  "account.signOut": "退出",

  "nav.menu.viewCard": "查看我的名片",
  "nav.menu.editProfile": "编辑资料",

  "danger.eyebrow": "危险操作",
  "danger.deleteButton": "删除账号",
  "danger.confirm.intro":
    "这会清除你的名片、头像和登录信息——无法撤销。Handle 会重新开放给其他人认领。",
  "danger.confirm.typePre": "输入 ",
  "danger.confirm.typePost": " 来确认。",
  "danger.confirm.yes": "好的,全部删除",
  "danger.confirm.no": "取消",
  "danger.confirm.deleting": "删除中…",

  "inbox.eyebrow": "收件箱",
  "inbox.expireNote": "未处理的邀请 7 天后过期",
  "inbox.tab.pending": "待处理",
  "inbox.tab.history": "历史",
  "inbox.empty.both":
    "暂无邀请。当有人在 acoffee.com/{handle} 填了你的邀请表单,会出现在这里供你接受或拒绝。",
  "inbox.empty.pending": "现在没有待处理的邀请。过往邀请在「历史」tab。",
  "inbox.empty.history":
    "暂无历史记录。接受或拒绝几个邀请后它们会出现在这里。",
  "inbox.row.email": "邮箱:",
  "inbox.row.when": "时间:",
  "inbox.action.accept": "接受",
  "inbox.action.decline": "拒绝",
  "inbox.confirm.accepted": "已接受——正在邮件把联系方式发给 {name}。",
  "inbox.confirm.declined": "已拒绝——正在邮件给 {name} 发一封礼貌回复。",
  "inbox.status.accepted": "已接受 ✓",
  "inbox.status.declined": "已拒绝",
  "inbox.status.expired": "已过期",
  "inbox.delivery.failed":
    "没能把联系方式邮件发给 {name},对方还没收到——要重发吗?",
  "inbox.delivery.acceptedWarn":
    "已接受——但发给 {name} 的邮件没成功。在下面重发一下。",
  "inbox.delivery.resend": "重发联系方式",
  "inbox.delivery.resending": "发送中…",
  "inbox.delivery.resent": "已发送 ✓",

  "time.justNow": "刚刚",
  "time.minutesAgo": "{n} 分钟前",
  "time.hoursAgo": "{n} 小时前",
  "time.daysAgo": "{n} 天前",

  "share.tweet.text": "我的咖啡邀约页上线了——来约我喝咖啡吧 ☕",

  "email.received.subject": "已把你给 {host} 的咖啡邀请发出",
  "email.received.greeting": "{name} 你好,",
  "email.received.intro": "你给 {host} 的邀请已经发到他们的收件箱了。",
  "email.received.explanation":
    "他们要么接受——你会收到一封带联系方式的邮件;要么拒绝,你会收到一封礼貌的回复。无论如何你都会有反馈;如果没有,邀请会在 7 天后过期。",
  "email.received.viewCard": "看看他们的名片",
  "email.received.disclaimer":
    "你收到这封邮件,是因为你在 {host} 的名片上填了邀请表单。",

  "email.accepted.subject": "{host} 答应了——这是联系方式",
  "email.accepted.greeting": "{name} 你好,",
  "email.accepted.intro":
    "{host} 在 acoffee 上接受了你的咖啡邀请。挑一个渠道打个招呼吧:",
  "email.accepted.viewCard": "看看他们的名片",
  "email.accepted.time": "你的时间:{time}",
  "email.accepted.disclaimer":
    "acoffee 在这里完成对接。我们不读你们的对话,接下来就是你们两位的事了。",

  "email.declined.subject": "{host} 暂时不方便——感谢你的邀请",
  "email.declined.greeting": "{name} 你好,",
  "email.declined.body":
    "感谢通过 acoffee 联系。{host} 目前没法接受你的咖啡邀请——日程紧或时机不合适。",
  "email.declined.footer":
    "无需回复。如果情况有变,欢迎你再次联系。",

  "email.welcome.subject": "欢迎 @{handle} · 你的 acoffee 名片已上线",
  "email.welcome.h1": "嘿 @{handle} —— 欢迎来到 acoffee。",
  "email.welcome.cardLive": "你的名片已上线: {url}",
  "email.welcome.tagline":
    "名片就是整个产品——它出现在别人看得到的地方，剩下的事会自然发生。今天就两件事:",
  "email.welcome.cta.view": "查看我的名片",
  "email.welcome.cta.share": "分享到 X",
  "email.welcome.tweetNote":
    "「分享到 X」会预填一条推文「{tweet}」附上你的名片链接,发送前你可以改。",
  "email.welcome.placesHeader": "其他可以贴的地方:",
  "email.welcome.place.bio": "X / Twitter 简介",
  "email.welcome.place.slack": "你已经在的 Slack 工作区签名",
  "email.welcome.place.email": "邮件签名",
  "email.welcome.disclaimer":
    "第一批邀请通常来自你已经认识的人。下一个会从你没预料的地方冒出来——那才是我期待的部分。",
  "email.welcome.signoff": "在咖啡馆之间做的。",

  "email.newInvite.subject": "{name} 想要{modePhrase}——关于: {topic}",
  "email.newInvite.kindPhrase.coffee": "喝咖啡",
  "email.newInvite.kindPhrase.cowork": "一起办公",
  "email.newInvite.kindPhrase.dinner": "吃饭",
  "email.newInvite.kindPhrase.hike": "一起爬山",
  "email.newInvite.kindPhrase.work_talk": "聊聊工作",
  "email.newInvite.heading": "{name} 想在 acoffee 上和你{modePhrase}。",
  "email.newInvite.field.topic": "主题:",
  "email.newInvite.field.time": "偏好时间:",
  "email.newInvite.field.email": "邮箱:",
  "email.newInvite.cta": "打开收件箱",
  "email.newInvite.disclaimer":
    "接受后我们会把你的联系方式邮件发给对方。拒绝则发一封礼貌通知。未处理的邀请 7 天后过期。",

  "email.confirm.subject": "确认你给 {host} 的咖啡邀请",
  "email.confirm.greeting": "{name} 你好,",
  "email.confirm.intro":
    "点击链接把你的咖啡邀请发给 {host}。在你确认之前,邀请处于暂停状态——他们看不到。",
  "email.confirm.cta": "确认并发送",
  "email.confirm.disclaimer":
    "如果不是你本人操作,忽略这封邮件即可——什么都不会发生。链接 7 天后过期。",

  "invite.sent.check.title": "查收你的邮箱",
  "invite.sent.check.body":
    "我们把确认链接发到了 {email}。点击链接才会把邀请发给 {name}。点击之前 host 看不到任何东西。",
  "invite.sent.check.ttl": "未确认的邀请 7 天后过期。",
  "invite.sent.check.sendAnother": "换一个邮箱 →",

  "invite.sent.direct.title": "已送达",
  "invite.sent.direct.body": "{name} 已经收到你的邀请。他接受后会邮件回复你。",

  "invite.gate.signinPrompt": "已经是 acoffee 用户?",
  "invite.gate.signinLink": "登录后免邮箱确认 →",
  "invite.gate.signedInAs":
    "以 @{handle} 身份发起 · 被接受后才公开联系方式",
  "invite.gate.signedInGeneric":
    "以你的账号发起 · 被接受后才公开联系方式",

  "invite.form.signedIn":
    "以 @{handle} 身份发送 — 邀请直接送达，无需邮箱确认。",
  "invite.form.signedInGeneric":
    "已登录 — 邀请直接送达，无需邮箱确认。",
  "invite.form.email.locked": "使用你的账号邮箱",

  "confirm.success.title": "邀请正在路上",
  "confirm.success.body":
    "{host} 现在已经收到你的邀请。接受或拒绝时你会收到邮件。",
  "confirm.success.viewCard": "看看 {host} 的名片",
  "confirm.alreadyDone.title": "这封邀请已经在路上了",
  "confirm.alreadyDone.body":
    "看起来你之前已经确认过,或 {host} 已经处理。查收你的邮箱看后续通知。",
  "confirm.expired.title": "这个链接过期了",
  "confirm.expired.body":
    "确认链接 7 天有效。如果仍想联系,可以重新发一封邀请。",
  "confirm.notFound.title": "邀请不存在",
  "confirm.notFound.body": "链接无效或已被使用。",
  "confirm.backHome": "回 acoffee",

  "lang.label": "语言",

  "inviteLink.meta.title": "约人喝咖啡 · acoffee",
  "inviteLink.meta.desc": "生成一个咖啡邀约链接，发给任何人——无需注册。",
  "inviteLink.meta.descFrom": "{from} 想约你喝杯咖啡。",
  "inviteLink.breadcrumb": "约人喝咖啡",
  "inviteLink.h1": "约人喝咖啡",
  "inviteLink.subhead":
    "填几个信息，复制链接，随手发出去。对方无需注册——打开就能看到一张友好的邀请卡。",
  "inviteLink.gen.from.label": "你的名字",
  "inviteLink.gen.from.placeholder": "谁在邀请？",
  "inviteLink.gen.to.label": "对方名字（可选）",
  "inviteLink.gen.to.placeholder": "你想约谁？",
  "inviteLink.gen.city.label": "城市（可选）",
  "inviteLink.gen.city.placeholder": "在哪？如 里斯本、线上",
  "inviteLink.gen.topic.label": "想聊点什么（可选）",
  "inviteLink.gen.topic.placeholder": "域名、AI、数字游民生活…",
  "inviteLink.gen.kind.legend": "想怎么见？",
  "inviteLink.gen.link.label": "你的邀约链接",
  "inviteLink.gen.copy": "复制链接",
  "inviteLink.gen.copyText": "复制为文字",
  "inviteLink.gen.copied": "已复制 ✓",
  "inviteLink.gen.preview.label": "预览",
  "inviteLink.gen.hint": "至少填一项即可生成链接。",
  "inviteLink.gen.example.from": "Alex",
  "inviteLink.gen.example.city": "里斯本",
  "inviteLink.gen.example.topic": "域名、AI 和数字游民生活",
  "inviteLink.card.badge": "咖啡邀约",
  "inviteLink.card.greeting": "嗨 {name} 👋",
  "inviteLink.card.headlineFrom": "{from} 想约你喝杯咖啡",
  "inviteLink.card.headlineAnon": "有人想约你喝咖啡",
  "inviteLink.card.cta": "拥有你自己的咖啡页",
  "inviteLink.card.ctaSub": "免费——注册 acoffee.com/你，让任何人都能约你喝咖啡。",
  "inviteLink.card.what": "acoffee 是什么？→",
  "siteFooter.invite": "约人喝咖啡",
  "home.inviteAlt.text": "想主动约人，而不是等别人邀请你？",
  "home.inviteAlt.link": "生成邀请链接 →",
};

export const ja: Record<DictKey, string> = {
  "hero.eyebrow": "ビルダー、ノマド、面白い人たちと知り合う",
  "hero.h1": "Coffee in bio.",
  "hero.sub.pre": "あなたの気軽なコーヒーチャットページ ",
  "hero.sub.post":
    "。リンクを一度シェアするだけで、次の街にいるビルダー、ノマド、面白い人たちからコーヒー(オンライン or 対面)に招待されます。",
  "hero.cta.makeCard": "カードを作る",
  "hero.cta.howItWorks": "使い方",

  "how.eyebrow": "使い方",
  "how.h2": "3 ステップ。1 枚のカード。スワイプなし。",
  "how.step1.title": "ハンドルを決める",
  "how.step1.body.pre":
    "一度サインインして、他の人が見つけられる URL を選ぶ —— ",
  "how.step1.body.post": "。これがあなたのカードになる。",
  "how.step2.title": "カードを埋める",
  "how.step2.body":
    "今いる街、いま何をしているか、何に乗ってくるか。Telegram かメールを入れておけば招待が届く。予約してほしいなら、空き時間も載せておこう。",
  "how.step3.title": "シェアして招待される",
  "how.step3.body.pre":
    "Slack、ツイート、コワーキングの掲示板にリンクを貼る。受け取った人が ",
  "how.step3.body.quoted": "「Invite for coffee」",
  "how.step3.body.post": " を押せば、今夜には会話が始まる。",

  "home.why.eyebrow": "なぜ",
  "home.why.body":
    "acoffee なら、新しい人と知り合えるかもしれない。空いている時間をシェアして、誰かにコーヒーを予約してもらうこともできる。",

  "home.proof": "{count} 人の builder・ノマドがコーヒーカードを公開中",

  "homeFooter.signature":
    "カフェの合間に作っています。新しい街でこれを読んでいるなら——ようこそ。カードを作って、次にここに来る誰かが孤独にならないようにしよう。",

  "siteFooter.privacy": "プライバシー",
  "siteFooter.terms": "利用規約",
  "siteFooter.openSource": "オープンソース",

  "signin.eyebrow": "acoffee にサインイン",
  "signin.h1": "ワンタップ、パスワード不要。",
  "signin.sub":
    "メールアドレスを入力 —— リンクをお送りします。そのリンクを開いた端末でログインできます。",
  "signin.google": "Google で続ける",
  "signin.google.pending": "リダイレクト中…",
  "signin.or": "または",
  "signin.captcha.failed":
    "認証ウィジェットを読み込めませんでした。広告/スクリプトブロッカーを無効にして再試行するか、上の Google サインインをご利用ください。",
  "signin.email.label": "メール",
  "signin.button": "サインインリンクを送る",
  "signin.button.pending": "送信中…",
  "signin.sent.sub":
    "そのリンクを開くと、ここに戻ってサインインされます。",
  "signin.sent.wrongEmail": "別のアドレスへ送る →",

  "notfound.eyebrow": "404 · 道に迷いました",
  "notfound.h1": "そのページかカードは見つかりません。",
  "notfound.sub":
    "ハンドルがまだ取られていない、リンクが壊れている、URL の打ち間違い —— 心当たりは色々ありそうです。とりあえずトップへ、それとも自分のコーヒーカードを作ってみますか?",
  "notfound.cta.home": "トップへ戻る",
  "notfound.cta.make": "カードを作る",

  "card.owner.note.invitable":
    "これはあなたのカード · 訪問者はここで「Invite」ボタンを見ます。",
  "card.owner.note.noContact":
    "これはあなたのカード · 連絡先を 1 つ追加すると招待を受けられます。",
  "card.noContact":
    "{name} さんはまだ連絡先を追加していません — 追加されるまで招待は無効です。",

  "invite.gate.text": "招待が承認されたらメールで連絡先が届きます",
  "invite.gate.cta": "コーヒーに誘う",

  "card.noStatus": "まだステータスがありません。",

  "card.breadcrumb": "コーヒーカード",
  "card.nudge.eyebrow": "あと少し",
  "card.nudge.title": "これはあなたのカードです——まだ少し寂しい感じ。",
  "card.nudge.body.both":
    "一言ステータスと連絡先をひとつ——それがカードを共有する価値にします。",
  "card.nudge.body.status":
    "一言ステータスを加えて、訪問者にいま何をしているか伝えましょう。",
  "card.nudge.body.contact":
    "連絡先を最低ひとつ（Telegram かメール）——でないと誰も実際に誘えません。",
  "card.nudge.cta": "カードを仕上げる",
  "card.owner.footer.note": "あなたのカードはここにあります。いつでも編集しに戻ってください。",
  "card.owner.footer.cta": "カードを編集",
  "card.visitor.footer.note":
    "このカードが気に入った？自分のも作ろう——取り組んでいることを共有して、次の街でコーヒーに誘われよう。",

  "sample.live": "ライブプレビュー",
  "sample.badge": "サンプル",
  "sample.contactUnlock": "連絡先は招待が承認されたら公開",

  "preview.badge": "プレビュー",
  "preview.noContact": "連絡先を追加してください — そうでないと誰も招待できません",

  "nav.signIn": "サインイン",
  "nav.invitesPending": "未処理の招待 {n} 件",

  "invite.form.title": "{name} さんをコーヒーに誘う",
  "invite.form.cancel": "キャンセル",
  "invite.form.name.label": "あなたの名前",
  "invite.form.name.placeholder": "山田",
  "invite.form.email.label": "あなたのメール",
  "invite.form.email.placeholder": "you@example.com",
  "invite.form.email.hint":
    "{name} さんが承認すれば、このアドレスに返事が届きます。",
  "invite.form.topic.label": "何の話をしたいですか",
  "invite.form.topic.placeholder":
    "ドメイン関連のニュースレターを始めるので意見交換したい——あなたのツイートからカードを見つけました。",
  "invite.form.kind.legend": "{name} さんと何をしたいですか?",
  "invite.form.time.label": "希望の時間帯(任意)",
  "invite.form.time.placeholder":
    "火/木の午後、または来週の朝ならいつでも",
  "invite.form.time.hint":
    "自由記述で OK ——承認後に双方で具体的な時間を決めます。",
  "invite.form.slot.legend": "時間を選ぶ",
  "invite.form.slot.presence": "{city} には {date} まで——それまでの時間を選ぼう。",
  "invite.form.slot.hint": "時間は {tz} で表示。承認時に {name} さんが確定します。",
  "invite.form.slot.none": "現在空き時間がありません。下に希望を記入してください。",
  "invite.form.submit": "招待を送る",
  "invite.form.submit.pending": "送信中…",
  "invite.form.note": "アカウント不要——メールは返信用にだけ使います。",

  "invite.sent.title": "招待を送信しました ✓",
  "invite.sent.body":
    "{name} さんに招待メールが届きます。あなたにも確認メールを送りました。承認されれば連絡先がメールで届き、そうでなければ丁寧な返信が届きます。",
  "invite.sent.ttl": "未処理の招待は 7 日後に期限切れになります。",
  "invite.sent.sendAnother": "{name} さんにもう一通招待を送る →",

  "profile.header.welcome.eyebrow": "acoffee へようこそ",
  "profile.header.welcome.h1": "他の人にどう見られたいか決めよう。",
  "profile.header.welcome.sub":
    "一度きりの設定。他の人があなたを見つけられる handle を選んで、Telegram かメールを追加してください——招待が届く先になります。",
  "profile.header.normal.eyebrow": "あなたの acoffee カード",
  "profile.header.normal.h1": "他の人から見たあなた。",
  "profile.header.normal.sub":
    "カードを編集できます。連絡先は誰かに招待されるまで公開されません。",
  "profile.signin.h1": "プロフィールを編集するにはサインインしてください。",
  "profile.signin.cta": "サインイン",

  "profile.identity.legend": "アイデンティティ",
  "profile.upFor.legend": "誘ってほしいもの",
  "profile.upFor.hint":
    "自由に選んでください——公開カードに chip として表示されます。",
  "profile.field.gender.label": "性別",
  "profile.field.gender.hint":
    "任意 · カードに小さなソフトシグナルとして表示されます。表示したくない場合はスキップ可。",
  "profile.field.gender.opt.unset": "選択しない",
  "profile.field.gender.opt.woman": "♀ 女性",
  "profile.field.gender.opt.man": "♂ 男性",

  "profile.socials.legend": "ソーシャル · カードで公開表示",
  "profile.socials.hint":
    "あなたのカードを開いた人が誰でもクリックできるリンク。各プラットフォームで既に公開されている情報なので、招待承認は不要です。",
  "profile.socials.empty": "まだリンクなし — 追加するとカードに表示されます。",
  "profile.socials.add": "リンクを追加",
  "profile.socials.remove": "このリンクを削除",
  "profile.socials.platformLabel": "プラットフォーム",
  "profile.socials.max": "上限に達しました。",
  "profile.interests.legend": "興味タグ · カードで公開表示",
  "profile.interests.hint":
    "興味や活動を表すタグをいくつか — 話しかけるきっかけになり、「ブラウズ」で見つけてもらいやすくなります。",
  "profile.interests.placeholder": "興味を追加(例: design、ai)",
  "profile.interests.add": "追加",
  "profile.interests.empty": "まだタグなし — いくつか追加してみましょう。",
  "profile.interests.max": "上限に達しました。",
  "profile.interests.suggested": "おすすめ",
  "profile.interests.remove": "削除",

  "profile.contact.legend": "連絡先 · 招待が承認された場合のみ公開",
  "profile.kind.coffee": "コーヒー",
  "profile.kind.cowork": "コワーキング",
  "profile.kind.dinner": "夕食",
  "profile.kind.hike": "ハイク",
  "profile.kind.work_talk": "仕事の話",

  "profile.scheduling.legend": "コーヒーの予約",
  "profile.scheduling.hint":
    "具体的な時間を提示できます。訪問者は招待時にその時間を予約できます(自由記入の代わりに)。",
  "profile.scheduling.toggle": "訪問者が具体的な時間を予約できるようにする",
  "profile.scheduling.tzLabel": "タイムゾーン",
  "profile.scheduling.tzDetected": "{tz} を検出 — 使用する",
  "profile.scheduling.add": "時間を追加",
  "profile.scheduling.tzNote": "時間は {tz} で表示されます。訪問者も同じタイムゾーンで見ます。",
  "profile.scheduling.empty": "まだ時間がありません。上から追加してください。",
  "profile.scheduling.booked": "予約済み",
  "profile.scheduling.remove": "時間を削除",
  "profile.scheduling.invalid": "有効な日時を選んでください。",

  "profile.field.handle.label": "Handle",
  "profile.field.handle.placeholder": "選んでください · 例: alex_nomad",
  "profile.field.handle.hint.auto":
    "現在は自動割り当て · 3–20 文字 · a–z, 0–9, _",
  "profile.field.handle.hint.normal": "3–20 文字 · a–z, 0–9, _",
  "profile.field.handle.available": "使えます ✓ · acoffee.com/{handle}",
  "profile.field.handle.yours": "これが現在の handle です。",
  "profile.field.handle.checking": "確認中…",
  "profile.field.handle.taken":
    "この handle は使われています——別のものをどうぞ。",
  "profile.field.handle.reserved":
    "この handle は予約されています——別のものをどうぞ。",
  "profile.field.handle.tooShort": "3 文字以上にしてください。",
  "profile.field.handle.fallbackName": "あなたの名前",
  "profile.field.handle.badFormat":
    "小文字、数字、_ のみ使用できます。",
  "profile.field.city.label": "都市",
  "profile.field.city.placeholder": "Chiang Mai",
  "profile.field.city.hint":
    "見つけてもらいたい場所——移動中なら空欄で OK",
  "profile.field.cityUntil.label": "まで（任意）",
  "profile.field.cityUntil.hint":
    "通り過ぎるだけなら日付を入れて。住んでいるなら空欄で OK。",
  "presence.banner": "{city} に滞在中（〜{date}）",
  "profile.field.status.label": "ステータス",
  "profile.field.status.hint":
    "1 行 · 今何をしている / 何に乗ってくるか",
  "profile.field.telegram.label": "Telegram",
  "profile.field.telegram.placeholder": "@yourhandle",
  "profile.field.telegram.hint":
    "推奨 · ユーザー名のみで、電話番号は公開されません",
  "profile.field.email.label": "メール",
  "profile.field.email.placeholder": "you@example.com",
  "profile.field.email.hint":
    "任意 · 公開用の連絡メール——サインインのアドレスと別でも OK",

  "profile.save": "保存",
  "profile.save.continue": "保存して続行",
  "profile.save.pending": "保存中…",
  "profile.save.saved": "保存しました。",

  "profile.preview.label": "ライブプレビュー",
  "profile.preview.updates.pre":
    "入力すると即時更新されます。訪問者には次のように見えます: ",
  "profile.preview.updates.post": "。",

  "avatar.upload": "写真をアップロード",
  "avatar.change": "写真を変更",
  "avatar.uploading": "アップロード中…",
  "avatar.remove": "削除",
  "avatar.removing": "削除中…",
  "avatar.hint":
    "PNG / JPG / WebP / GIF。自動で正方形に切り抜き、256×256 にリサイズします。",
  "avatar.error.notImage":
    "画像を選んでください——JPG、PNG、WebP、GIF。",
  "avatar.error.tooBig": "サイズが大きすぎます——8 MB 以下に。",

  "onboarding.banner.text":
    "現在 {handle} として表示されています — 本物の handle を選んで、他の人に見つけてもらいましょう。",
  "onboarding.banner.cta": "handle を選ぶ →",

  "share.eyebrow": "カードが公開されました",
  "share.h2": "シェアしましょう——招待が始まる場所です。",
  "share.copy": "コピー",
  "share.copied": "コピーしました",
  "share.copy.ariaIdle": "カードの URL をクリップボードにコピー",
  "share.copy.ariaCopied":
    "カードの URL をクリップボードにコピーしました",
  "share.live.announcement":
    "カードの URL をクリップボードにコピーしました。",
  "share.viewMyCard": "自分のカードを見る",
  "share.shareOnX": "X でシェア",
  "share.native": "シェア",
  "share.channelAria": "{channel} でシェア",

  "account.eyebrow": "アカウント",
  "account.yourCard": "あなたのカード:",
  "account.joined": "{date} 参加",
  "account.signedInAs": "サインイン中: ",
  "account.signOut": "サインアウト",

  "nav.menu.viewCard": "あなたのカードを表示",
  "nav.menu.editProfile": "プロフィールを編集",

  "danger.eyebrow": "危険な操作",
  "danger.deleteButton": "アカウントを削除",
  "danger.confirm.intro":
    "カード、アバター、サインインが消えます——元に戻せません。Handle は他の人が取れる状態になります。",
  "danger.confirm.typePre": "確認のため ",
  "danger.confirm.typePost": " と入力してください。",
  "danger.confirm.yes": "はい、全て削除する",
  "danger.confirm.no": "キャンセル",
  "danger.confirm.deleting": "削除中…",

  "inbox.eyebrow": "受信箱",
  "inbox.expireNote": "未処理の招待は 7 日後に期限切れ",
  "inbox.tab.pending": "未処理",
  "inbox.tab.history": "履歴",
  "inbox.empty.both":
    "招待はまだありません。誰かが acoffee.com/{handle} の招待フォームを送信すると、ここで承認 / 辞退できます。",
  "inbox.empty.pending":
    "今は判断するものがありません。過去の招待は「履歴」タブにあります。",
  "inbox.empty.history":
    "履歴はまだありません。承認や辞退をするとここに残ります。",
  "inbox.row.email": "メール:",
  "inbox.row.when": "時間:",
  "inbox.action.accept": "承認",
  "inbox.action.decline": "辞退",
  "inbox.confirm.accepted":
    "承認しました——{name} さんに連絡先をメールで送信しています。",
  "inbox.confirm.declined":
    "辞退しました——{name} さんに丁寧な返信を送信しています。",
  "inbox.status.accepted": "承認 ✓",
  "inbox.status.declined": "辞退",
  "inbox.status.expired": "期限切れ",
  "inbox.delivery.failed":
    "{name} さんへ連絡先メールを送れませんでした。まだ届いていません — 再送しますか?",
  "inbox.delivery.acceptedWarn":
    "承認しました — ただし {name} さんへのメールが送れませんでした。下から再送してください。",
  "inbox.delivery.resend": "連絡先を再送",
  "inbox.delivery.resending": "送信中…",
  "inbox.delivery.resent": "送信済み ✓",

  "time.justNow": "たった今",
  "time.minutesAgo": "{n} 分前",
  "time.hoursAgo": "{n} 時間前",
  "time.daysAgo": "{n} 日前",

  "share.tweet.text":
    "私のコーヒーチャットページが公開されました——コーヒーに誘ってください ☕",

  "email.received.subject":
    "{host} さんへのコーヒー招待を送信しました",
  "email.received.greeting": "{name} さん、",
  "email.received.intro":
    "{host} さんに招待が届きました。",
  "email.received.explanation":
    "承認されれば連絡先が記載されたメールが届きます。辞退の場合は丁寧な返信が届きます。どちらにしても返事はあります;ない場合、招待は 7 日後に期限切れになります。",
  "email.received.viewCard": "カードを見る",
  "email.received.disclaimer":
    "{host} さんのカードの招待フォームからメールアドレスを入力したのでこのメールが届いています。",

  "email.accepted.subject":
    "{host} さんが承認しました——連絡方法はこちら",
  "email.accepted.greeting": "{name} さん、",
  "email.accepted.intro":
    "{host} さんが acoffee での招待を承認しました。チャンネルを選んで挨拶してみてください:",
  "email.accepted.viewCard": "カードを見る",
  "email.accepted.time": "あなたの時間:{time}",
  "email.accepted.disclaimer":
    "acoffee の役割はここまでです。会話には立ち入りません——あとはお二人の間で。",

  "email.declined.subject":
    "{host} さんは予定が合わないようですが——誘ってくれてありがとう",
  "email.declined.greeting": "{name} さん、",
  "email.declined.body":
    "acoffee 経由でのご連絡ありがとうございます。{host} さんは今回コーヒーの招待を受けられないとのことです——スケジュールが厳しいか、タイミングが合わなかったようです。",
  "email.declined.footer":
    "返信不要です。状況が変われば、いつでもまた声をかけてください。",

  "email.welcome.subject":
    "ようこそ @{handle} さん · acoffee カードが公開されました",
  "email.welcome.h1": "@{handle} さん、acoffee へようこそ。",
  "email.welcome.cardLive": "あなたのカードはこちらです: {url}",
  "email.welcome.tagline":
    "カードがすべて——誰かが見える場所に置けば、あとは自然に動き始める。今日やることは二つ:",
  "email.welcome.cta.view": "自分のカードを見る",
  "email.welcome.cta.share": "X でシェア",
  "email.welcome.tweetNote":
    "「X でシェア」ボタンを押すと「{tweet}」というツイートが下書きされます——投稿前に編集も可能。",
  "email.welcome.placesHeader": "他に貼れる場所:",
  "email.welcome.place.bio": "X / Twitter のプロフィール",
  "email.welcome.place.slack": "すでに入っている Slack ワークスペースの署名",
  "email.welcome.place.email": "メールの署名",
  "email.welcome.disclaimer":
    "最初の招待は、すでに知っている誰かから来ることが多い。次の招待は、思いがけない場所から——それを私も期待しています。",
  "email.welcome.signoff": "カフェの合間に作っています。",

  "email.newInvite.subject": "{name} さんが{modePhrase} ——「{topic}」",
  "email.newInvite.kindPhrase.coffee": "コーヒーを希望",
  "email.newInvite.kindPhrase.cowork": "コワーキングを希望",
  "email.newInvite.kindPhrase.dinner": "ディナーを希望",
  "email.newInvite.kindPhrase.hike": "ハイキングを希望",
  "email.newInvite.kindPhrase.work_talk": "仕事の話を希望",
  "email.newInvite.heading":
    "{name} さんが acoffee で{modePhrase}しています。",
  "email.newInvite.field.topic": "話題:",
  "email.newInvite.field.time": "希望の時間帯:",
  "email.newInvite.field.email": "メール:",
  "email.newInvite.cta": "受信箱を開く",
  "email.newInvite.disclaimer":
    "承認すると連絡先がメールで届きます。辞退の場合は丁寧な返信が送られます。未処理の招待は 7 日後に期限切れになります。",

  "email.confirm.subject": "{host} さんへの招待を確認してください",
  "email.confirm.greeting": "{name} さん、",
  "email.confirm.intro":
    "リンクをクリックすると、{host} さんに招待が送信されます。確認するまで、招待は保留中です——相手には見えません。",
  "email.confirm.cta": "確認して送信",
  "email.confirm.disclaimer":
    "心当たりがなければ、このメールは無視してください——何も起こりません。リンクは 7 日後に期限切れになります。",

  "invite.sent.check.title": "メールを確認してください",
  "invite.sent.check.body":
    "{email} に確認リンクを送りました。クリックすると {name} さんに招待が届きます。クリックするまで相手には何も届きません。",
  "invite.sent.check.ttl": "未確認の招待は 7 日後に期限切れになります。",
  "invite.sent.check.sendAnother": "別のメールアドレスを使う →",

  "invite.sent.direct.title": "送信しました",
  "invite.sent.direct.body":
    "{name} さんに招待が届きました。承認されたらメールで返信が来ます。",

  "invite.gate.signinPrompt": "acoffee アカウントをお持ちですか?",
  "invite.gate.signinLink": "サインインしてメール確認をスキップ →",
  "invite.gate.signedInAs":
    "@{handle} として送信 · 承認後に連絡先が公開されます",
  "invite.gate.signedInGeneric":
    "アカウントから送信 · 承認後に連絡先が公開されます",

  "invite.form.signedIn":
    "@{handle} として送信 — 招待は直接届きます。メール確認は不要です。",
  "invite.form.signedInGeneric":
    "サインイン済み — 招待は直接届きます。メール確認は不要です。",
  "invite.form.email.locked": "アカウントメールを使用",

  "confirm.success.title": "招待を送信しました",
  "confirm.success.body":
    "{host} さんに招待が届きました。承認 / 辞退の連絡があれば、メールが届きます。",
  "confirm.success.viewCard": "{host} さんのカードを見る",
  "confirm.alreadyDone.title": "この招待はすでに送信済みです",
  "confirm.alreadyDone.body":
    "すでに確認済みか、{host} さんが対応しているようです。続きのメールはメールボックスを確認してください。",
  "confirm.expired.title": "このリンクは期限切れです",
  "confirm.expired.body":
    "確認リンクは 7 日間有効です。まだ連絡したい場合は、改めて招待を送ってください。",
  "confirm.notFound.title": "招待が見つかりません",
  "confirm.notFound.body":
    "リンクが無効か、すでに使用されています。",
  "confirm.backHome": "acoffee に戻る",

  "lang.label": "言語",

  "inviteLink.meta.title": "誰かをコーヒーに誘う · acoffee",
  "inviteLink.meta.desc":
    "コーヒーの招待リンクを作って、誰にでも送れます——登録不要。",
  "inviteLink.meta.descFrom": "{from} さんがあなたをコーヒーに誘っています。",
  "inviteLink.breadcrumb": "誰かを誘う",
  "inviteLink.h1": "誰かをコーヒーに誘う",
  "inviteLink.subhead":
    "いくつか入力してリンクをコピーし、好きな方法で送るだけ。相手は登録不要——開くと素敵な招待カードが表示されます。",
  "inviteLink.gen.from.label": "あなたの名前",
  "inviteLink.gen.from.placeholder": "誘うのは誰?",
  "inviteLink.gen.to.label": "相手の名前(任意)",
  "inviteLink.gen.to.placeholder": "誰を誘いますか?",
  "inviteLink.gen.city.label": "都市(任意)",
  "inviteLink.gen.city.placeholder": "どこで? 例: リスボン、オンライン",
  "inviteLink.gen.topic.label": "話したいこと(任意)",
  "inviteLink.gen.topic.placeholder": "ドメイン、AI、ノマド生活…",
  "inviteLink.gen.kind.legend": "どんな形で会う?",
  "inviteLink.gen.link.label": "あなたの招待リンク",
  "inviteLink.gen.copy": "リンクをコピー",
  "inviteLink.gen.copyText": "テキストでコピー",
  "inviteLink.gen.copied": "コピーしました ✓",
  "inviteLink.gen.preview.label": "プレビュー",
  "inviteLink.gen.hint": "1つ以上入力するとリンクができます。",
  "inviteLink.gen.example.from": "Alex",
  "inviteLink.gen.example.city": "リスボン",
  "inviteLink.gen.example.topic": "ドメイン、AI、ノマド生活",
  "inviteLink.card.badge": "コーヒーの招待",
  "inviteLink.card.greeting": "こんにちは {name} さん 👋",
  "inviteLink.card.headlineFrom":
    "{from} さんがあなたをコーヒーに誘っています",
  "inviteLink.card.headlineAnon": "コーヒーに誘われています",
  "inviteLink.card.cta": "自分のコーヒーページを作る",
  "inviteLink.card.ctaSub":
    "無料——acoffee.com/you を取得して、誰でもあなたをコーヒーに誘えるように。",
  "inviteLink.card.what": "acoffee とは? →",
  "siteFooter.invite": "誰かを誘う",
  "home.inviteAlt.text": "招待を待つより、自分から誘いたい?",
  "home.inviteAlt.link": "招待リンクを作る →",
};

const DICTS: Record<Locale, Record<DictKey, string>> = { en, zh, ja };

export function t(locale: Locale, key: DictKey): string {
  return DICTS[locale]?.[key] ?? DICTS[DEFAULT_LOCALE][key];
}

// Interpolate `{name}`-style placeholders. Returns the template untouched
// if the key isn't in `vars` (leaves the literal `{name}` visible, which
// makes missing-substitution bugs obvious instead of silently dropping
// the text).
export function tmpl(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? String(vars[key]) : match,
  );
}
