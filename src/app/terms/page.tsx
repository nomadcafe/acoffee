import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/i18n";

// Same per-locale render dispatch pattern as /privacy — see notes there
// for why long-form legal copy doesn't pass through the flat dict.

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Ground rules for using acoffee — claim a handle, be honest, don't harass.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const locale = await getLocale();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20">
      {locale === "zh" ? (
        <TermsZh />
      ) : locale === "ja" ? (
        <TermsJa />
      ) : (
        <TermsEn />
      )}
    </main>
  );
}

function TermsEn() {
  return (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        Terms
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Ground rules — keep it human.
      </h1>
      <p className="text-sm text-muted">Last updated 2026-05-18</p>

      <Section title="Your card, your responsibility">
        Anything you put on your card — handle, status, city, contact
        info — is what visitors see. Don&apos;t impersonate someone else.
        Don&apos;t put information you don&apos;t want public on a public
        page. We don&apos;t verify identities; readers should treat any
        card with the same scepticism they would a stranger&apos;s
        Twitter bio.
      </Section>

      <Section title="What you can't do">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            Send bulk commercial outreach via the contact channels you
            reveal — acoffee is for coffee chats, not cold sales.
          </li>
          <li>
            Harass, threaten, or sexually proposition people who invite
            you for coffee. Hand-off doesn&apos;t mean consent to
            anything beyond a coffee chat.
          </li>
          <li>
            Scrape card pages systematically. The data&apos;s public,
            but we&apos;ll rate-limit and block obvious crawlers.
          </li>
          <li>
            Claim a handle that infringes on someone else&apos;s
            trademark or impersonates a real person without their
            consent.
          </li>
        </ul>
      </Section>

      <Section title="Takedown / reports">
        Spotted a card that breaks any of the above? Email{" "}
        <a
          href="mailto:hello@acoffee.com"
          className="text-accent hover:underline"
        >
          hello@acoffee.com
        </a>{" "}
        with the URL and a one-line description. We&apos;ll review and
        remove cards that violate these terms. We may also delete
        accounts without warning for clearly abusive use.
      </Section>

      <Section title="No warranty">
        acoffee is provided <em>as is</em>, with no warranty of any kind.
        We don&apos;t guarantee uptime, the validity of any card, or the
        outcome of any coffee chat. The source is MIT-licensed —
        you&apos;re welcome to fork it.
      </Section>

      <Section title="Open source">
        The codebase lives at{" "}
        <a
          href="https://github.com/nomadcafe/acoffee"
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          github.com/nomadcafe/acoffee
        </a>{" "}
        under the MIT license. Vision, MVP scope, and the changelog
        narrative live in{" "}
        <Link
          href="https://github.com/nomadcafe/acoffee/blob/main/docs/vision.md"
          className="text-accent hover:underline"
        >
          docs/vision.md
        </Link>
        .
      </Section>

      <Section title="Changes">
        These terms can change — if material, we&apos;ll bump the date at
        the top and email everyone with a real handle. By continuing to
        use acoffee after a change you accept the new version.
      </Section>
    </>
  );
}

function TermsZh() {
  return (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        条款
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        基本规则 —— 保持人味。
      </h1>
      <p className="text-sm text-muted">最后更新 2026-05-18</p>

      <Section title="你的名片,你的责任">
        你放在名片上的所有内容 —— handle、status、城市、联系方式 ——
        访客都能看到。不要冒充他人。不要把不想公开的信息放在一个公开
        页面上。我们不验证身份;读者应该用看待陌生人 Twitter bio 的同等
        怀疑去看待任何名片。
      </Section>

      <Section title="你不能做的事">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            利用对方公开的联系方式做批量商业推广 —— acoffee 是用来约
            咖啡聊的,不是冷推销售用的。
          </li>
          <li>
            骚扰、威胁、或对邀请你喝咖啡的人做性暗示。对方公开联系方式
            不等于同意咖啡聊以外的任何事。
          </li>
          <li>
            系统性爬取名片页。数据是公开的,但我们会做速率限制并屏蔽明显
            的爬虫。
          </li>
          <li>
            认领侵犯他人商标的 handle,或未经同意冒用真人身份。
          </li>
        </ul>
      </Section>

      <Section title="举报 / takedown">
        发现违反上述规则的名片?发邮件到{" "}
        <a
          href="mailto:hello@acoffee.com"
          className="text-accent hover:underline"
        >
          hello@acoffee.com
        </a>{" "}
        附上 URL 和一行说明。我们会审核并移除违反条款的名片。明显滥用
        的账号也可能无预警删除。
      </Section>

      <Section title="不提供任何保证">
        acoffee 按<em>「现状」</em>提供,不附带任何保证。我们不保证服务
        可用性、任何名片的真实性、或任何咖啡聊的结果。源代码采用 MIT
        许可证 —— 欢迎 fork。
      </Section>

      <Section title="开源">
        代码库托管在{" "}
        <a
          href="https://github.com/nomadcafe/acoffee"
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          github.com/nomadcafe/acoffee
        </a>
        ,MIT 许可证。Vision、MVP 范围和 changelog 叙事在{" "}
        <Link
          href="https://github.com/nomadcafe/acoffee/blob/main/docs/vision.md"
          className="text-accent hover:underline"
        >
          docs/vision.md
        </Link>
        。
      </Section>

      <Section title="条款变更">
        条款可能调整 —— 如有实质变更,我们会更新顶部日期并邮件通知所有
        有真 handle 的用户。变更后继续使用 acoffee 视为接受新条款。
      </Section>
    </>
  );
}

function TermsJa() {
  return (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        利用規約
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        基本ルール —— 人間味を大切に。
      </h1>
      <p className="text-sm text-muted">最終更新 2026-05-18</p>

      <Section title="あなたのカード、あなたの責任">
        カードに記載する内容 —— handle、ステータス、都市、連絡先 ——
        は訪問者全員に見えます。他人になりすまさないでください。
        公開したくない情報を公開ページに載せないでください。私たちは
        身元確認をしません;読者は知らない人の Twitter bio を見るとき
        と同じ程度の慎重さでカードを扱うべきです。
      </Section>

      <Section title="禁止事項">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            開示された連絡先で一斉商業営業をすること —— acoffee は
            コーヒーチャット用です、冷たいセールス用ではありません。
          </li>
          <li>
            コーヒーに誘ってきた相手に対するハラスメント、脅迫、性的な
            申し入れ。連絡先の共有は、コーヒーチャット以外への同意では
            ありません。
          </li>
          <li>
            カードページの体系的なスクレイピング。データは公開ですが、
            レート制限や明らかなクローラーのブロックを行います。
          </li>
          <li>
            他人の商標を侵害する handle、または当人の同意なしに実在の
            人物になりすます handle を取得すること。
          </li>
        </ul>
      </Section>

      <Section title="削除依頼 / 通報">
        上記に違反するカードを見つけたら、URL と一行の説明をつけて{" "}
        <a
          href="mailto:hello@acoffee.com"
          className="text-accent hover:underline"
        >
          hello@acoffee.com
        </a>{" "}
        までメールしてください。確認のうえ、規約違反のカードは削除し
        ます。明らかな悪用については、予告なくアカウントを削除する場合
        があります。
      </Section>

      <Section title="無保証">
        acoffee は<em>「現状有姿」</em>で提供され、いかなる保証もありま
        せん。可用性、カードの正当性、コーヒーチャットの結果について
        保証しません。ソースコードは MIT ライセンス —— フォーク歓迎です。
      </Section>

      <Section title="オープンソース">
        コードベースは{" "}
        <a
          href="https://github.com/nomadcafe/acoffee"
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          github.com/nomadcafe/acoffee
        </a>{" "}
        に MIT ライセンスで公開されています。Vision、MVP の範囲、
        changelog の経緯は{" "}
        <Link
          href="https://github.com/nomadcafe/acoffee/blob/main/docs/vision.md"
          className="text-accent hover:underline"
        >
          docs/vision.md
        </Link>{" "}
        にあります。
      </Section>

      <Section title="規約の変更">
        本規約は変更されることがあります —— 実質的な変更があった場合は、
        ページ上部の日付を更新し、実ハンドルを持つ全ユーザーにメールで
        お知らせします。変更後も acoffee の利用を続けることで、新しい
        規約に同意したものとみなされます。
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
