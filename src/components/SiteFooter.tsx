import Link from "next/link";

// Global footer rendered on every page below the page-level content. Tiny
// mono row — no page should grow a second footer with overlapping legal
// links; if a page wants its own voice (the home page has the "made
// between cafés" line), it goes ABOVE this, not below.
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-bean bg-page/60">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 text-xs text-muted sm:px-6">
        <p>© {new Date().getFullYear()} ACoffee.com</p>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/privacy" className="hover:text-accent">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-accent">
            Terms
          </Link>
          <a
            href="https://github.com/nomadcafe/acoffee"
            target="_blank"
            rel="noreferrer"
            className="hover:text-accent"
          >
            Open source ↗
          </a>
        </nav>
      </div>
    </footer>
  );
}
