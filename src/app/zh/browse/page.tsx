import type { Metadata } from "next";
import { BrowseView, browseMeta } from "@/app/browse/page";

// SEO-only locale variant of /browse. URL stays /zh/browse; the proxy
// sets x-url-locale=zh so any getLocale() inside resolves to zh.
export const revalidate = 3600;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function generateMetadata(): Metadata {
  return browseMeta("zh");
}

export default function BrowseZh({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return <BrowseView locale="zh" searchParams={searchParams} />;
}
