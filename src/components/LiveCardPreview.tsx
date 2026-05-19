"use client";

import { CardBody } from "./CardBody";
import { useLocale, useT } from "./LocaleProvider";
import type { CoffeeChatKind, Gender, SocialLink } from "@/lib/types";

// Real-time card preview that lives next to ProfileForm. Same CardBody
// primitive the public /[handle] page renders, so what the user sees here
// is what visitors see — minus the click-to-reveal contact interaction,
// which is faked with a static "Invite for coffee" pill so the preview
// doesn't have surprising live behaviour.
//
// All inputs are kept as plain strings/arrays at this layer so ProfileForm
// can hand over whatever the controlled inputs currently hold, including
// half-typed values — no need to debounce or wait for blur.
function deriveDisplayName(handle: string, fallback: string): string {
  if (!handle) return fallback;
  return handle
    .split("_")
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

export function LiveCardPreview({
  handle,
  avatarUrl,
  city,
  status,
  kinds,
  gender,
  socialLinks,
  hasContact,
}: {
  handle: string;
  avatarUrl?: string | null;
  city: string | null;
  status: string | null;
  kinds: CoffeeChatKind[];
  gender?: Gender | null;
  socialLinks?: SocialLink[];
  hasContact: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const safeHandle = handle.trim() || "your-handle";
  return (
    <CardBody
      handle={safeHandle}
      displayName={deriveDisplayName(safeHandle, t("profile.field.handle.fallbackName"))}
      city={city}
      locator={null}
      status={status}
      kinds={kinds}
      gender={gender}
      socialLinks={socialLinks}
      avatarUrl={avatarUrl}
      locale={locale}
      badge={
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[10px] font-medium text-accent">
          {t("preview.badge")}
        </span>
      }
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            {hasContact
              ? t("sample.contactUnlock")
              : t("preview.noContact")}
          </p>
          <span
            aria-hidden
            className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium ${
              hasContact
                ? "bg-accent text-page shadow-sm"
                : "bg-bean/60 text-ink/50"
            }`}
          >
            {t("invite.gate.cta")}
            <span>→</span>
          </span>
        </div>
      }
    />
  );
}
