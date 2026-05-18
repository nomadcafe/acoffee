import type { Metadata } from "next";
import { PrivacyView } from "@/app/privacy/page";
import { privacyAlternates } from "@/lib/i18n/routes";

export const metadata: Metadata = {
  title: "隐私",
  description:
    "acoffee 收集哪些数据,名片上哪些信息公开,以及如何删除你的数据。",
  alternates: privacyAlternates("zh"),
};

export default function PrivacyZh() {
  return <PrivacyView locale="zh" />;
}
