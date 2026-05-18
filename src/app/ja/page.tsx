import type { Metadata } from "next";
import { HomeView } from "@/app/page";
import { homeAlternates } from "@/lib/i18n/routes";

export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: homeAlternates("ja"),
};

export default function HomeJa() {
  return <HomeView locale="ja" />;
}
