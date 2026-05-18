import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/i18n";

// Long-form legal copy doesn't fit a flat dict cleanly — each section has
// inline links, code spans, lists. Per-locale render functions below keep
// the JSX natural in each language and the maintenance pattern obvious:
// edit the variant directly, no fishing through 30 dict keys.

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What acoffee collects, what's public on your card, and how to remove your data.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const locale = await getLocale();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20">
      {locale === "zh" ? (
        <PrivacyZh />
      ) : locale === "ja" ? (
        <PrivacyJa />
      ) : (
        <PrivacyEn />
      )}
    </main>
  );
}

function PrivacyEn() {
  return (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        Privacy
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        What we collect and what stays public.
      </h1>
      <p className="text-sm text-muted">Last updated 2026-05-18</p>

      <Section title="What you give us">
        Everything on your card is supplied by you when you fill in the
        profile form: handle, status, city, chat-kind tags, and the
        contact channels you choose (Telegram, WhatsApp, email). Your
        sign-in email is stored separately by our auth provider so you
        can log back in.
      </Section>

      <Section title="What's public">
        Your card page at <Code>acoffee.com/{`{handle}`}</Code> is public.
        Anyone with the URL can see your handle, status, city, chat tags,
        and the initials avatar generated from your handle. Contact
        channels stay hidden until a visitor clicks <em>Invite for
        coffee</em>, at which point all channels you&apos;ve added become
        visible to them.
      </Section>

      <Section title="What's not public">
        Your sign-in email is never shown to other users. We don&apos;t
        track who clicked your <em>Invite for coffee</em> button, who
        viewed your card, or who you&apos;ve previously talked to —
        there&apos;s no invite log on our side. After contact reveal the
        conversation happens entirely on Telegram / WhatsApp / your email
        client, not on acoffee.
      </Section>

      <Section title="Third parties">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            <strong>Supabase</strong> — Postgres database + auth. Stores
            your profile row and session cookie.
          </li>
          <li>
            <strong>Resend</strong> — sends the one-time welcome email
            after you finish onboarding. We don&apos;t send marketing.
          </li>
          <li>
            <strong>Google Analytics 4</strong> — anonymous page-view
            stats so we know which surfaces matter. No PII forwarded.
          </li>
          <li>
            <strong>Vercel</strong> — hosts the site. Standard server
            logs.
          </li>
        </ul>
      </Section>

      <Section title="Cookies">
        A Supabase session cookie keeps you signed in. GA sets analytics
        cookies. That&apos;s it — no third-party advertising or tracking
        pixels.
      </Section>

      <Section title="Remove your data">
        Edit any field on{" "}
        <Link href="/profile" className="text-accent hover:underline">
          /profile
        </Link>
        . To delete your card and account entirely, use the &ldquo;Delete
        account&rdquo; button on /profile, or email{" "}
        <a
          href="mailto:hello@acoffee.com"
          className="text-accent hover:underline"
        >
          hello@acoffee.com
        </a>{" "}
        from the address you signed up with.
      </Section>
    </>
  );
}

function PrivacyZh() {
  return (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        隐私
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        我们收集什么、公开什么。
      </h1>
      <p className="text-sm text-muted">最后更新 2026-05-18</p>

      <Section title="你提供的">
        名片上的所有内容都是你在 profile 表单里填的:handle、status、城市、
        chat-kind 标签、以及你选择填写的联系方式(Telegram、WhatsApp、邮箱)。
        你的登录邮箱由我们的 auth provider 单独存储,用于让你重新登录。
      </Section>

      <Section title="什么是公开的">
        你的名片页 <Code>acoffee.com/{`{handle}`}</Code> 是公开的。
        任何人通过 URL 都能看到你的 handle、status、城市、chat 标签,
        以及从 handle 推导出的首字母头像。联系方式在访客点
        <em>「Invite for coffee」</em> 之前都不可见;点击之后,你填写的
        所有渠道都会向他们公开。
      </Section>

      <Section title="什么不公开">
        你的登录邮箱永远不向其他用户显示。我们不记录谁点了你的
        <em>「Invite for coffee」</em>、谁看过你的名片、你之前和谁聊过——
        我们这里没有 invite log。联系方式公开之后,对话完全发生在
        Telegram / WhatsApp / 你的邮箱里,不在 acoffee。
      </Section>

      <Section title="第三方">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            <strong>Supabase</strong> —— Postgres 数据库 + 身份认证。存
            你的 profile 行和 session cookie。
          </li>
          <li>
            <strong>Resend</strong> —— onboarding 完成后发一次性欢迎邮件。
            不发营销邮件。
          </li>
          <li>
            <strong>Google Analytics 4</strong> —— 匿名页面访问统计,让我
            们知道哪些 surface 重要。不传 PII。
          </li>
          <li>
            <strong>Vercel</strong> —— 托管站点。标准服务器日志。
          </li>
        </ul>
      </Section>

      <Section title="Cookie">
        Supabase 的 session cookie 让你保持登录。GA 设置 analytics
        cookie。就这些 —— 没有第三方广告或追踪像素。
      </Section>

      <Section title="删除你的数据">
        在{" "}
        <Link href="/profile" className="text-accent hover:underline">
          /profile
        </Link>{" "}
        编辑任何字段。要彻底删除名片和账号,用 /profile 上的
        「Delete account」按钮,或从注册邮箱发邮件给{" "}
        <a
          href="mailto:hello@acoffee.com"
          className="text-accent hover:underline"
        >
          hello@acoffee.com
        </a>
        。
      </Section>
    </>
  );
}

function PrivacyJa() {
  return (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        プライバシー
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        収集する情報と、公開される範囲。
      </h1>
      <p className="text-sm text-muted">最終更新 2026-05-18</p>

      <Section title="あなたが提供するもの">
        カードに表示される内容はすべて、プロフィールフォームで入力した
        ものです:handle、ステータス、都市、chat-kind タグ、連絡先(Telegram、
        WhatsApp、メール)。サインインに使うメールアドレスは認証プロバイダー
        が別途保存し、ログインに使われます。
      </Section>

      <Section title="公開されるもの">
        あなたのカードページ <Code>acoffee.com/{`{handle}`}</Code> は公開
        です。URL を知っている人は誰でも、あなたの handle、ステータス、
        都市、chat タグ、handle から生成されたイニシャル・アバターを見られ
        ます。連絡先は訪問者が <em>「Invite for coffee」</em> をクリック
        するまで非表示で、クリック後にあなたが追加したすべてのチャンネル
        が見えるようになります。
      </Section>

      <Section title="公開されないもの">
        サインインのメールアドレスは他のユーザーには表示されません。
        誰が <em>「Invite for coffee」</em> ボタンを押したか、誰があなた
        のカードを見たか、過去に誰と話したか —— こちらに招待ログはあり
        ません。連絡先が共有された後の会話は、すべて Telegram / WhatsApp /
        メールクライアントで行われ、acoffee 上では行われません。
      </Section>

      <Section title="第三者サービス">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            <strong>Supabase</strong> —— Postgres データベースと認証。
            プロフィール情報とセッション Cookie を保存します。
          </li>
          <li>
            <strong>Resend</strong> —— オンボーディング完了後の一度きり
            のウェルカムメール送信。マーケティングメールは送りません。
          </li>
          <li>
            <strong>Google Analytics 4</strong> —— 匿名ページビュー統計。
            個人情報は転送されません。
          </li>
          <li>
            <strong>Vercel</strong> —— サイトのホスティング。標準的な
            サーバーログ。
          </li>
        </ul>
      </Section>

      <Section title="Cookie">
        Supabase のセッション Cookie でログイン状態を維持しています。GA
        は分析用 Cookie を設定します。それだけです —— サードパーティ広告や
        トラッキングピクセルはありません。
      </Section>

      <Section title="データの削除">
        <Link href="/profile" className="text-accent hover:underline">
          /profile
        </Link>{" "}
        の各フィールドを編集できます。カードとアカウントを完全に削除する
        には、/profile の「Delete account」ボタンを使うか、登録メールアド
        レスから{" "}
        <a
          href="mailto:hello@acoffee.com"
          className="text-accent hover:underline"
        >
          hello@acoffee.com
        </a>
        へご連絡ください。
      </Section>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold tracking-tight text-ink">
        {title}
      </h2>
      <div className="text-base leading-[1.6] text-ink/80">{children}</div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md bg-bean/40 px-1.5 py-0.5 font-mono text-sm text-ink">
      {children}
    </code>
  );
}
