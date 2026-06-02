import type { Metadata } from "next";
import { CityView } from "@/app/city/[slug]/page";
import { listCityCards } from "@/lib/auth-queries";
import { CITY_INDEX_FLOOR, cityDisplayFromSlug } from "@/lib/city";
import { t, tmpl } from "@/lib/i18n/dict";
import { cityAlternates } from "@/lib/i18n/routes";

// SEO-only locale variant of /city/[slug]. URL stays /zh/city/…; the
// proxy sets x-url-locale=zh so any getLocale() inside resolves to zh.
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cards = await listCityCards(slug);
  const cityName = cards[0]?.city ?? cityDisplayFromSlug(slug);
  const title = tmpl(t("zh", "city.meta.title"), { city: cityName });
  const description = tmpl(t("zh", "city.meta.description"), {
    city: cityName,
  });
  return {
    title,
    description,
    alternates: cityAlternates(slug, "zh"),
    robots:
      cards.length < CITY_INDEX_FLOOR
        ? { index: false, follow: true }
        : undefined,
    openGraph: { title, description, type: "website" },
  };
}

export default async function CityZh({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CityView slug={slug} locale="zh" />;
}
