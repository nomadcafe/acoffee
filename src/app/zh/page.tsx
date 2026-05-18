import type { Metadata } from "next";
import { HomeView } from "@/app/page";
import { homeAlternates } from "@/lib/i18n/routes";

// SEO-only locale variant of /. URL stays /zh; the proxy sets the
// x-url-locale request header so getLocale() inside HomeView resolves
// to "zh" regardless of cookie. Page metadata declares /zh as canonical
// for this language and lists the other variants under hreflang.
export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: homeAlternates("zh"),
};

export default function HomeZh() {
  return <HomeView locale="zh" />;
}
