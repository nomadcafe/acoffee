import type { Metadata } from "next";
import { CityView } from "@/app/city/[slug]/page";
import { listCityCards } from "@/lib/auth-queries";
import { cityDisplayFromSlug } from "@/lib/city";
import { t, tmpl } from "@/lib/i18n/dict";
import { cityAlternates } from "@/lib/i18n/routes";

// SEO-only locale variant of /city/[slug]. URL stays /ja/city/…; the
// proxy sets x-url-locale=ja so any getLocale() inside resolves to ja.
export const revalidate = 3600;

const INDEX_FLOOR = 3;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cards = await listCityCards(slug);
  const cityName = cards[0]?.city ?? cityDisplayFromSlug(slug);
  const title = tmpl(t("ja", "city.meta.title"), { city: cityName });
  const description = tmpl(t("ja", "city.meta.description"), {
    city: cityName,
  });
  return {
    title,
    description,
    alternates: cityAlternates(slug, "ja"),
    robots:
      cards.length < INDEX_FLOOR ? { index: false, follow: true } : undefined,
    openGraph: { title, description, type: "website" },
  };
}

export default async function CityJa({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CityView slug={slug} locale="ja" />;
}
