import type { Metadata } from "next";
import { BrowseView, browseMeta } from "@/app/browse/page";

// SEO-only locale variant of /browse. URL stays /ja/browse; the proxy
// sets x-url-locale=ja so any getLocale() inside resolves to ja.
export const revalidate = 3600;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function generateMetadata(): Metadata {
  return browseMeta("ja");
}

export default function BrowseJa({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return <BrowseView locale="ja" searchParams={searchParams} />;
}
