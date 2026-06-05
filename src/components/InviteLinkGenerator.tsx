"use client";

import Link from "next/link";
import { useState } from "react";
import { KIND_EMOJI } from "@/components/CardBody";
import { InvitationCard } from "@/components/InvitationCard";
import { useLocale, useT } from "@/components/LocaleProvider";
import { t as translate, tmpl } from "@/lib/i18n/dict";
import {
  buildInviteQuery,
  EMPTY_INVITE,
  hasInvite,
  INVITE_LINK_LIMITS,
  type InviteLinkData,
} from "@/lib/invite-link";
import { COFFEE_CHAT_KINDS } from "@/lib/types";

// The /invite generator (shown when no invite params are present). Left:
// a few inputs the inviter fills. Right: a live preview of the exact card
// the recipient will see, plus the copyable link. Zero backend — the link
// IS the data, so there's nothing to submit; "copy" hands the URL to the
// inviter to send through their own channel.
export function InviteLinkGenerator({
  origin,
  initialFrom = "",
}: {
  origin: string;
  initialFrom?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [data, setData] = useState<InviteLinkData>({
    ...EMPTY_INVITE,
    from: initialFrom,
  });
  const [copied, setCopied] = useState<"link" | "text" | null>(null);

  const query = buildInviteQuery(data);
  const url = `${origin}/invite${query ? `?${query}` : ""}`;
  const ready = hasInvite(data);

  // Until the inviter types anything, preview a neutral example so the card
  // never looks broken or empty. Localised so the example reads in-language.
  const example: InviteLinkData = {
    from: t("inviteLink.gen.example.from"),
    to: "",
    city: t("inviteLink.gen.example.city"),
    topic: t("inviteLink.gen.example.topic"),
    kind: "coffee",
  };
  const previewData = ready ? data : example;

  function set<K extends keyof InviteLinkData>(
    key: K,
    value: InviteLinkData[K],
  ) {
    setData((d) => ({ ...d, [key]: value }));
    setCopied(null);
  }

  // Plain-text fallback for chats that don't unfurl link previews — the
  // headline followed by the bare URL.
  function plainText(): string {
    const headline = data.from
      ? tmpl(translate(locale, "inviteLink.card.headlineFrom"), {
          from: data.from,
        })
    : translate(locale, "inviteLink.card.headlineAnon");
    return `☕ ${headline}\n${url}`;
  }

  async function copy(kind: "link" | "text") {
    try {
      await navigator.clipboard.writeText(kind === "link" ? url : plainText());
      setCopied(kind);
    } catch {
      // Clipboard blocked (insecure context / permissions) — the URL field
      // is selectable, so the inviter can still copy it by hand.
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      {/* Form */}
      <div className="flex flex-col gap-4">
        <Field
          label={t("inviteLink.gen.from.label")}
          placeholder={t("inviteLink.gen.from.placeholder")}
          value={data.from}
          maxLength={INVITE_LINK_LIMITS.from}
          onChange={(v) => set("from", v)}
        />
        <Field
          label={t("inviteLink.gen.to.label")}
          placeholder={t("inviteLink.gen.to.placeholder")}
          value={data.to}
          maxLength={INVITE_LINK_LIMITS.to}
          onChange={(v) => set("to", v)}
        />
        <Field
          label={t("inviteLink.gen.city.label")}
          placeholder={t("inviteLink.gen.city.placeholder")}
          value={data.city}
          maxLength={INVITE_LINK_LIMITS.city}
          onChange={(v) => set("city", v)}
        />
        <Field
          label={t("inviteLink.gen.topic.label")}
          placeholder={t("inviteLink.gen.topic.placeholder")}
          value={data.topic}
          maxLength={INVITE_LINK_LIMITS.topic}
          onChange={(v) => set("topic", v)}
        />

        <fieldset className="flex flex-col gap-2 border-none p-0">
          <legend className="text-sm font-medium text-ink/85">
            {t("inviteLink.gen.kind.legend")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {COFFEE_CHAT_KINDS.map((k) => {
              const active = data.kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={active}
                  // Click the active chip again to clear it (kind is optional).
                  onClick={() => set("kind", active ? null : k)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-accent bg-accent text-page shadow-sm"
                      : "border-bean bg-surface text-ink/80 hover:border-accent/60 hover:text-accent"
                  }`}
                >
                  <span aria-hidden>{KIND_EMOJI[k]}</span>
                  <span>{translate(locale, `profile.kind.${k}` as const)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Copyable link + actions */}
        <div className="flex flex-col gap-2 rounded-2xl border border-bean bg-surface/60 p-4">
          <span className="text-xs font-medium uppercase tracking-wide text-accent">
            {t("inviteLink.gen.link.label")}
          </span>
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-xl border border-bean bg-surface px-3 py-2 font-mono text-xs text-ink/80 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => copy("link")}
              disabled={!ready}
              className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md disabled:opacity-50"
            >
              {copied === "link"
                ? t("inviteLink.gen.copied")
                : t("inviteLink.gen.copy")}
            </button>
            <button
              type="button"
              onClick={() => copy("text")}
              disabled={!ready}
              className="inline-flex items-center gap-2 rounded-2xl border border-bean bg-surface px-4 py-2 text-sm font-medium text-ink/80 transition-colors hover:border-accent/60 hover:text-accent disabled:opacity-50"
            >
              {copied === "text"
                ? t("inviteLink.gen.copied")
                : t("inviteLink.gen.copyText")}
            </button>
          </div>
          {!ready && (
            <p className="text-xs text-muted">{t("inviteLink.gen.hint")}</p>
          )}
        </div>
      </div>

      {/* Live preview */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-accent">
          {t("inviteLink.gen.preview.label")}
        </span>
        <div className={ready ? "" : "opacity-60"}>
          <InvitationCard
            data={previewData}
            locale={locale}
            headingAs="p"
            cta={
              <div className="flex flex-col gap-1.5">
                <span className="inline-flex w-fit items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-page shadow-sm">
                  {t("inviteLink.card.cta")}
                  <span aria-hidden>→</span>
                </span>
                <span className="text-xs text-muted">
                  {t("inviteLink.card.ctaSub")}
                </span>
              </div>
            }
          />
        </div>
        <p className="text-center text-xs text-muted">
          <Link href="/" className="hover:text-accent">
            {t("inviteLink.card.what")}
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  maxLength,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  maxLength: number;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink/85">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl border border-bean bg-surface px-4 py-3 text-base text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
    </label>
  );
}
