"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";
import { Avatar } from "@/components/Avatar";
import { useT } from "@/components/LocaleProvider";

// Avatar dropdown for the signed-in nav. The trigger looks identical to
// the bare avatar+@handle link it replaces, so the visual weight of the
// nav doesn't change — clicking now opens a small menu instead of going
// straight to /[handle]. View card / Edit profile / Sign out all live
// here so sign-out isn't buried at the bottom of /profile.
export function UserMenu({
  handle,
  avatarUrl,
  displayName,
  sessionEmail,
}: {
  handle: string;
  avatarUrl: string | null;
  displayName: string;
  sessionEmail: string | null;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Outside-click + Escape close the menu. Bound only while open so the
  // listeners aren't sitting on `mousedown` for every signed-in page.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("touchstart", onPointer, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("touchstart", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`@${handle}`}
        className="inline-flex max-w-[12rem] items-center gap-2 rounded-full py-1 pl-1 pr-3 text-ink/85 hover:bg-bean/40"
      >
        <Avatar
          handle={handle}
          displayName={displayName}
          src={avatarUrl}
          size="sm"
        />
        <span className="truncate text-sm font-medium">@{handle}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-bean bg-surface p-1.5 shadow-[0_16px_40px_-20px_rgba(42,31,24,0.35)]"
        >
          {sessionEmail && (
            <div className="border-b border-bean/60 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted">
                {t("account.signedInAs")}
              </p>
              <p className="truncate text-sm font-medium text-ink">
                {sessionEmail}
              </p>
            </div>
          )}
          <Link
            href={`/${handle}`}
            onClick={() => setOpen(false)}
            role="menuitem"
            className="block rounded-xl px-3 py-2 text-sm text-ink/85 hover:bg-bean/40 hover:text-accent"
          >
            {t("nav.menu.viewCard")}
          </Link>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="block rounded-xl px-3 py-2 text-sm text-ink/85 hover:bg-bean/40 hover:text-accent"
          >
            {t("nav.menu.editProfile")}
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-ink/85 hover:bg-bean/40 hover:text-accent"
            >
              {t("account.signOut")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
