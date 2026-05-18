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

  "lang.label": "言語",
};

const DICTS: Record<Locale, Record<DictKey, string>> = { en, zh, ja };

export function t(locale: Locale, key: DictKey): string {
  return DICTS[locale]?.[key] ?? DICTS[DEFAULT_LOCALE][key];
}
