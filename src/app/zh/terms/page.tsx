import type { Metadata } from "next";
import { TermsView } from "@/app/terms/page";
import { termsAlternates } from "@/lib/i18n/routes";

export const metadata: Metadata = {
  title: "条款",
  description: "使用 acoffee 的基本规则——选 handle、诚实、不骚扰他人。",
  alternates: termsAlternates("zh"),
};

export default function TermsZh() {
  return <TermsView locale="zh" />;
}
