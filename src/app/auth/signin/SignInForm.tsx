"use client";
import { useActionState, useState } from "react";
import { sendMagicLink, type SignInState } from "../actions";

const INITIAL: SignInState = { status: "idle" };

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, INITIAL);
  const [resetting, setResetting] = useState(false);

  if (state.status === "sent" && !resetting) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-bean bg-surface p-6">
        <p className="text-sm text-accent">{state.message}</p>
        <p className="text-xs text-muted">
          The link opens you back here, signed in.
        </p>
        <button
          type="button"
          onClick={() => setResetting(true)}
          className="self-start font-mono text-[10px] uppercase tracking-widest text-muted underline-offset-4 hover:text-accent hover:underline"
        >
          Wrong email? Send to another →
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      {next && <input type="hidden" name="next" value={next} />}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink/85">
          Email
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="rounded-full border border-bean bg-surface px-4 py-2 text-sm outline-none focus:border-accent dark:bg-bean/40"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send sign-in link"}
      </button>
      {state.status === "error" && state.message && (
        <p className="text-xs text-red-600 dark:text-red-400">{state.message}</p>
      )}
    </form>
  );
}
