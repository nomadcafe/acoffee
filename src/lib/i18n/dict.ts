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
