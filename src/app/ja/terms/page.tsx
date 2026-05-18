import type { Metadata } from "next";
import { TermsView } from "@/app/terms/page";
import { termsAlternates } from "@/lib/i18n/routes";

export const metadata: Metadata = {
  title: "利用規約",
  description: "acoffee を使うときの基本ルール — handle を選び、正直に、他人を困らせない。",
  alternates: termsAlternates("ja"),
};

export default function TermsJa() {
  return <TermsView locale="ja" />;
}
