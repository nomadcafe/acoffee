"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setLocale } from "@/lib/i18n/actions";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/i18n/dict";
import { isMarketingPath, localizedPath, stripLocalePrefix } from "@/lib/i18n/routes";
import { useLocale, useT } from "@/components/LocaleProvider";

// Footer language switcher. Native <select> for accessibility + zero
// extra JS for the open/close animation.
//
// On a marketing surface (/, /privacy, /terms — with or without a locale
// prefix) we navigate URL to the locale variant, since those are the
// pages with hreflang-indexed URLs. On every other route (auth pages,
// /[handle], /profile, …) only the cookie matters, and we refresh in
// place. Either way the cookie is updated so subsequent visits still
// resolve to the user's pick when they land on a cookie-driven route.
export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const current = useLocale();
  const t = useT();
  const [pending, startTransition] = useTransition();

  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">{t("lang.label")}</span>
      <span aria-hidden className="text-xs text-muted">
        🌐
      </span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Locale;
          startTransition(async () => {
            await setLocale(next);
            const stripped = stripLocalePrefix(pathname ?? "/");
            if (stripped && isMarketingPath(stripped.rest)) {
              router.push(localizedPath(stripped.rest, next));
            } else {
              router.refresh();
            }
          });
        }}
        className="rounded-full border border-bean bg-surface px-2.5 py-1 text-xs text-ink hover:border-accent/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
