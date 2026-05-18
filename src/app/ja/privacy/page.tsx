import type { Metadata } from "next";
import { PrivacyView } from "@/app/privacy/page";
import { privacyAlternates } from "@/lib/i18n/routes";

export const metadata: Metadata = {
  title: "プライバシー",
  description:
    "acoffee が収集する情報、カードで公開される範囲、データの削除方法について。",
  alternates: privacyAlternates("ja"),
};

export default function PrivacyJa() {
  return <PrivacyView locale="ja" />;
}
