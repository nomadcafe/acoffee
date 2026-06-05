import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n/dict";

// Global footer rendered on every page below the page-level content. Tiny
// mono row — no page should grow a second footer with overlapping legal
// links; if a page wants its own voice (the home page has the "made
// between cafés" line), it goes ABOVE this, not below.
export async function SiteFooter() {
  const locale = await getLocale();
  return (
    <footer className="mt-auto border-t border-bean bg-page/60">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 text-xs text-muted sm:px-6">
        <p>© {new Date().getFullYear()} ACoffee.com</p>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/invite" className="hover:text-accent">
            {t(locale, "siteFooter.invite")}
          </Link>
          <Link href="/privacy" className="hover:text-accent">
            {t(locale, "siteFooter.privacy")}
          </Link>
          <Link href="/terms" className="hover:text-accent">
            {t(locale, "siteFooter.terms")}
          </Link>
          <a
            href="https://github.com/nomadcafe/acoffee"
            target="_blank"
            rel="noreferrer"
            className="hover:text-accent"
          >
            {t(locale, "siteFooter.openSource")} ↗
          </a>
          <LanguageSwitcher />
        </nav>
      </div>
    </footer>
  );
}
