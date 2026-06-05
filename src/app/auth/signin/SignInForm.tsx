"use client";
import { useActionState, useState } from "react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { useT } from "@/components/LocaleProvider";
import { sendMagicLink, type SignInState } from "../actions";

const INITIAL: SignInState = { status: "idle" };

export function SignInForm({
  next,
  turnstileSiteKey,
}: {
  next?: string;
  // Public Turnstile site key, passed from the server page. When unset
  // (e.g. local dev with no CAPTCHA) the widget is skipped and sign-in
  // behaves as before — must stay in sync with the Supabase dashboard's
  // CAPTCHA toggle, which is what actually enforces it server-side.
  turnstileSiteKey?: string;
}) {
  const t = useT();
  const [state, action, pending] = useActionState(sendMagicLink, INITIAL);
  const [resetting, setResetting] = useState(false);
  const needsCaptcha = !!turnstileSiteKey;
  const [captchaToken, setCaptchaToken] = useState("");
  // True when the widget errored or its script never loaded — used to show
  // the user why submit is stuck instead of leaving it silently disabled.
  const [captchaFailed, setCaptchaFailed] = useState(false);
  // Bumped to remount the widget after a failed submit — the spent token
  // can't be reused, so a retry needs a fresh one.
  const [captchaKey, setCaptchaKey] = useState(0);
  // Reset the CAPTCHA the moment a new (failed) result lands. Adjusting
  // state during render against the previous value is React's recommended
  // alternative to an effect here. On success the form is replaced by the
  // "sent" view, so only the error path needs a fresh token.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.status === "error" && needsCaptcha) {
      setCaptchaToken("");
      setCaptchaFailed(false);
      setCaptchaKey((k) => k + 1);
    }
  }

  if (state.status === "sent" && !resetting) {
    return (
      <div className="flex flex-col gap-3 rounded-3xl border border-accent/40 bg-accent-soft/60 p-6">
        <p className="text-base font-medium text-accent">{state.message}</p>
        <p className="text-sm text-ink/70">{t("signin.sent.sub")}</p>
        <button
          type="button"
          onClick={() => setResetting(true)}
          className="self-start text-sm font-medium text-muted underline-offset-4 hover:text-accent hover:underline"
        >
          {t("signin.sent.wrongEmail")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <GoogleSignInButton next={next} />
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-bean" aria-hidden />
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {t("signin.or")}
        </span>
        <span className="h-px flex-1 bg-bean" aria-hidden />
      </div>
      <form action={action} className="flex flex-col gap-4">
        {next && <input type="hidden" name="next" value={next} />}
        {needsCaptcha && (
          <input type="hidden" name="captchaToken" value={captchaToken} />
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink/85">
            {t("signin.email.label")}
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="rounded-2xl border border-bean bg-surface px-4 py-3 text-base text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>
        {needsCaptcha && (
          <TurnstileWidget
            key={captchaKey}
            siteKey={turnstileSiteKey}
            onToken={(token) => {
              setCaptchaToken(token);
              // A real token means the widget recovered — clear any
              // earlier load/error notice.
              if (token) setCaptchaFailed(false);
            }}
            onError={() => setCaptchaFailed(true)}
          />
        )}
        {needsCaptcha && captchaFailed && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {t("signin.captcha.failed")}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || (needsCaptcha && !captchaToken)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-base font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md disabled:opacity-60"
        >
          {pending ? t("signin.button.pending") : `${t("signin.button")} →`}
        </button>
        {state.status === "error" && state.message && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.message}
          </p>
        )}
      </form>
    </div>
  );
}
