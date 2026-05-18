"use client";
import { useActionState, useState } from "react";
import { sendMagicLink, type SignInState } from "../actions";

const INITIAL: SignInState = { status: "idle" };

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, INITIAL);
  const [resetting, setResetting] = useState(false);

  if (state.status === "sent" && !resetting) {
    return (
      <div className="flex flex-col gap-3 rounded-3xl border border-accent/40 bg-accent-soft/60 p-6">
        <p className="text-base font-medium text-accent">{state.message}</p>
        <p className="text-sm text-ink/70">
          The link opens you back here, signed in.
        </p>
        <button
          type="button"
          onClick={() => setResetting(true)}
          className="self-start text-sm font-medium text-muted underline-offset-4 hover:text-accent hover:underline"
        >
          Wrong email? Send to another →
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink/85">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="rounded-2xl border border-bean bg-surface px-4 py-3 text-base text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-base font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send sign-in link →"}
      </button>
      {state.status === "error" && state.message && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}
    </form>
  );
}
