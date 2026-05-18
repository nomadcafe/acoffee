"use client";

import { createContext, useContext } from "react";
import {
  DEFAULT_LOCALE,
  type DictKey,
  type Locale,
  t,
} from "@/lib/i18n/dict";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

// Receives the server-resolved locale and broadcasts it to any client
// component below in the tree. Wrap `{children}` at the root of every
// page (we do it once inside layout.tsx). Pure value pass-through —
// no state, no fetches.
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

// Hook flavour of t() that resolves the current locale automatically.
// Use this inside Client Components; Server Components should call
// `t(locale, key)` directly with the locale they already resolved.
export function useT(): (key: DictKey) => string {
  const locale = useLocale();
  return (key) => t(locale, key);
}
