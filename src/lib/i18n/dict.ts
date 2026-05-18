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
  "how.step.label": "Step",
  "how.step1.title": "Claim your handle",
  "how.step1.body.pre":
    "Sign in once. Pick the URL others will recognise you by — ",
  "how.step1.body.post": ". That's your card forever.",
  "how.step2.title": "Fill your card",
  "how.step2.body":
    "Your city, a line about what you're doing, what you're up for. Add Telegram or WhatsApp so invites actually land.",
  "how.step3.title": "Share & get invited",
  "how.step3.body.pre":
    "Drop your card link in a Slack, a tweet, a co-working board. Nomads in your city click ",
  "how.step3.body.quoted": "“Invite for coffee”",
  "how.step3.body.post": " and you're talking by tonight.",

  // Latest cards strip
  "latest.eyebrow": "Latest cards",
  "latest.h2": "Folks who joined this week.",

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
  "invite.form.mode.legend": "How do you want to meet?",
  "invite.form.mode.online": "Online",
  "invite.form.mode.in_person": "In person",
  "invite.form.mode.either": "Either",
  "invite.form.time.label": "Preferred time (optional)",
  "invite.form.time.placeholder":
    "Tue / Thu afternoons · or any morning next week",
  "invite.form.time.hint":
    "Free-form — both sides nail down the exact slot after accept.",
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
    "One-time setup. Pick a handle others can recognize you by, then add Telegram, WhatsApp, or email so invites actually land.",
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
  "profile.contact.legend": "Contact · revealed only after invite",
  "profile.kind.coffee": "Coffee",
  "profile.kind.cowork": "Cowork",
  "profile.kind.dinner": "Dinner",
  "profile.kind.hike": "Hike",
  "profile.kind.work_talk": "Work talk",

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
  "profile.field.handle.badFormat":
    "Lowercase letters, digits, and _ only.",
  "profile.field.city.label": "City",
  "profile.field.city.placeholder": "Chiang Mai",
  "profile.field.city.hint":
    "Where you want to be found — leave blank if you're between cities",
  "profile.field.status.label": "Status",
  "profile.field.status.hint":
    "One line · what you're doing, what you're up for",
  "profile.field.telegram.label": "Telegram",
  "profile.field.telegram.placeholder": "@yourhandle",
  "profile.field.telegram.hint":
    "Recommended · 5–32 letters/digits/_, no spaces",
  "profile.field.whatsapp.label": "WhatsApp",
  "profile.field.whatsapp.placeholder": "+66812345678",
  "profile.field.whatsapp.hint":
    "Recommended · include country code with +",
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

  // Account section
  "account.eyebrow": "Account",
  "account.yourCard": "Your card:",
  "account.joined": "Joined {date}",
  "account.signedInAs": "Signed in as ",
  "account.signOut": "Sign out",

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
  "inbox.row.mode.online": "💻 Online",
  "inbox.row.mode.in_person": "🍵 In person",
  "inbox.row.mode.either": "🤷 Either",
  "inbox.action.accept": "Accept",
  "inbox.action.decline": "Decline",
  "inbox.confirm.accepted":
    "Accepted — emailing your contact channels to {name}.",
  "inbox.confirm.declined":
    "Declined — emailing a polite note to {name}.",
  "inbox.status.accepted": "Accepted ✓",
  "inbox.status.declined": "Declined",
  "inbox.status.expired": "Expired",

  // Relative-time helpers
  "time.justNow": "just now",
  "time.minutesAgo": "{n}m ago",
  "time.hoursAgo": "{n}h ago",
  "time.daysAgo": "{n}d ago",

  // Language switcher
  "lang.label": "Language",
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
  "how.step.label": "第",
  "how.step1.title": "认领你的 handle",
  "how.step1.body.pre": "登录一次。挑一个别人能记住的 URL —— ",
  "how.step1.body.post": "。这就是你以后的名片。",
  "how.step2.title": "填名片",
  "how.step2.body":
    "你所在的城市、一句话简介、想约什么。加 Telegram 或 WhatsApp，邀请才能真正到达。",
  "how.step3.title": "分享 & 收到邀请",
  "how.step3.body.pre":
    "把链接放进 Slack、推文、协作空间公告板。你城市的 nomads 点 ",
  "how.step3.body.quoted": "「Invite for coffee」",
  "how.step3.body.post": "，今晚就能聊起来。",

  "latest.eyebrow": "最近加入",
  "latest.h2": "本周加入的人。",

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
  "invite.form.mode.legend": "线上还是线下?",
  "invite.form.mode.online": "线上",
  "invite.form.mode.in_person": "面聊",
  "invite.form.mode.either": "都可以",
  "invite.form.time.label": "偏好时间(可选)",
  "invite.form.time.placeholder": "周二/周四下午,或下周早上任何时间",
  "invite.form.time.hint": "随便写——接受后双方再敲具体时间。",
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
    "一次性设置。挑一个别人能认出你的 handle,然后加 Telegram、WhatsApp 或邮箱,邀请才能真正到达。",
  "profile.header.normal.eyebrow": "你的 acoffee 名片",
  "profile.header.normal.h1": "别人怎么看到你。",
  "profile.header.normal.sub":
    "在下面编辑你的名片。联系方式在有人邀请你之前都不会公开。",
  "profile.signin.h1": "登录后编辑你的资料。",
  "profile.signin.cta": "登录",

  "profile.identity.legend": "身份",
  "profile.upFor.legend": "想约什么",
  "profile.upFor.hint": "随意勾选——它们会以 chip 出现在你的公开名片上。",
  "profile.contact.legend": "联系方式 · 仅在邀请被接受后公开",
  "profile.kind.coffee": "咖啡",
  "profile.kind.cowork": "Cowork",
  "profile.kind.dinner": "吃饭",
  "profile.kind.hike": "徒步",
  "profile.kind.work_talk": "工作聊",

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
  "profile.field.handle.badFormat": "只能用小写字母、数字和 _。",
  "profile.field.city.label": "城市",
  "profile.field.city.placeholder": "Chiang Mai",
  "profile.field.city.hint":
    "你希望别人能在哪里找到你——在城市间漂泊就留空",
  "profile.field.status.label": "状态",
  "profile.field.status.hint": "一句话 · 你在做什么、想约什么",
  "profile.field.telegram.label": "Telegram",
  "profile.field.telegram.placeholder": "@yourhandle",
  "profile.field.telegram.hint":
    "推荐 · 5–32 个字母/数字/_,不带空格",
  "profile.field.whatsapp.label": "WhatsApp",
  "profile.field.whatsapp.placeholder": "+66812345678",
  "profile.field.whatsapp.hint": "推荐 · 带 + 和国家代码",
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

  "share.eyebrow": "你的名片已上线",
  "share.h2": "分享它——这是邀请开始的地方。",
  "share.copy": "复制",
  "share.copied": "已复制",
  "share.copy.ariaIdle": "复制名片 URL 到剪贴板",
  "share.copy.ariaCopied": "名片 URL 已复制到剪贴板",
  "share.live.announcement": "名片 URL 已复制到剪贴板。",
  "share.viewMyCard": "查看我的名片",
  "share.shareOnX": "分享到 X",

  "account.eyebrow": "账户",
  "account.yourCard": "你的名片:",
  "account.joined": "{date} 加入",
  "account.signedInAs": "登录身份: ",
  "account.signOut": "退出",

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
  "inbox.row.mode.online": "💻 线上",
  "inbox.row.mode.in_person": "🍵 面聊",
  "inbox.row.mode.either": "🤷 都行",
  "inbox.action.accept": "接受",
  "inbox.action.decline": "拒绝",
  "inbox.confirm.accepted": "已接受——正在邮件把联系方式发给 {name}。",
  "inbox.confirm.declined": "已拒绝——正在邮件给 {name} 发一封礼貌回复。",
  "inbox.status.accepted": "已接受 ✓",
  "inbox.status.declined": "已拒绝",
  "inbox.status.expired": "已过期",

  "time.justNow": "刚刚",
  "time.minutesAgo": "{n} 分钟前",
  "time.hoursAgo": "{n} 小时前",
  "time.daysAgo": "{n} 天前",

  "lang.label": "语言",
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
  "how.step.label": "ステップ",
  "how.step1.title": "ハンドルを決める",
  "how.step1.body.pre":
    "一度サインインして、他の人が見つけられる URL を選ぶ —— ",
  "how.step1.body.post": "。これがあなたのカードになる。",
  "how.step2.title": "カードを埋める",
  "how.step2.body":
    "今いる街、いま何をしているか、何に乗ってくるか。Telegram や WhatsApp も入れておけば招待が届く。",
  "how.step3.title": "シェアして招待される",
  "how.step3.body.pre":
    "Slack、ツイート、コワーキングの掲示板にリンクを貼る。あなたの街にいるノマドが ",
  "how.step3.body.quoted": "「Invite for coffee」",
  "how.step3.body.post": " を押せば、今夜には会話が始まる。",

  "latest.eyebrow": "最近のカード",
  "latest.h2": "今週始めた人たち。",

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
  "invite.form.mode.legend": "オンライン or 対面?",
  "invite.form.mode.online": "オンライン",
  "invite.form.mode.in_person": "対面",
  "invite.form.mode.either": "どちらでも",
  "invite.form.time.label": "希望の時間帯(任意)",
  "invite.form.time.placeholder":
    "火/木の午後、または来週の朝ならいつでも",
  "invite.form.time.hint":
    "自由記述で OK ——承認後に双方で具体的な時間を決めます。",
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
    "一度きりの設定。他の人があなたを見つけられる handle を選んで、Telegram / WhatsApp / メールのどれかを追加してください——招待が届く先になります。",
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
  "profile.contact.legend": "連絡先 · 招待が承認された場合のみ公開",
  "profile.kind.coffee": "コーヒー",
  "profile.kind.cowork": "コワーキング",
  "profile.kind.dinner": "夕食",
  "profile.kind.hike": "ハイク",
  "profile.kind.work_talk": "仕事の話",

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
  "profile.field.handle.badFormat":
    "小文字、数字、_ のみ使用できます。",
  "profile.field.city.label": "都市",
  "profile.field.city.placeholder": "Chiang Mai",
  "profile.field.city.hint":
    "見つけてもらいたい場所——移動中なら空欄で OK",
  "profile.field.status.label": "ステータス",
  "profile.field.status.hint":
    "1 行 · 今何をしている / 何に乗ってくるか",
  "profile.field.telegram.label": "Telegram",
  "profile.field.telegram.placeholder": "@yourhandle",
  "profile.field.telegram.hint":
    "推奨 · 5–32 文字の英数字/_、スペースなし",
  "profile.field.whatsapp.label": "WhatsApp",
  "profile.field.whatsapp.placeholder": "+66812345678",
  "profile.field.whatsapp.hint": "推奨 · + と国番号付き",
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

  "account.eyebrow": "アカウント",
  "account.yourCard": "あなたのカード:",
  "account.joined": "{date} 参加",
  "account.signedInAs": "サインイン中: ",
  "account.signOut": "サインアウト",

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
  "inbox.row.mode.online": "💻 オンライン",
  "inbox.row.mode.in_person": "🍵 対面",
  "inbox.row.mode.either": "🤷 どちらでも",
  "inbox.action.accept": "承認",
  "inbox.action.decline": "辞退",
  "inbox.confirm.accepted":
    "承認しました——{name} さんに連絡先をメールで送信しています。",
  "inbox.confirm.declined":
    "辞退しました——{name} さんに丁寧な返信を送信しています。",
  "inbox.status.accepted": "承認 ✓",
  "inbox.status.declined": "辞退",
  "inbox.status.expired": "期限切れ",

  "time.justNow": "たった今",
  "time.minutesAgo": "{n} 分前",
  "time.hoursAgo": "{n} 時間前",
  "time.daysAgo": "{n} 日前",

  "lang.label": "言語",
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
