"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount } from "@/app/profile/actions";

// Two-stage destructive confirm:
//   1) Press the red "Delete account" button → expands to a panel with
//      explanation + a "type your handle to confirm" input.
//   2) Only when the typed string exactly matches the user's own handle
//      does the "Yes, delete everything" button activate.
// Modelled after GitHub's repo-delete pattern. The handle is presented
// in a code span so the user has to deliberately retype it — copy-paste
// is allowed but it's still an act, not a misclick.
export function DeleteAccountButton({ handle }: { handle: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex self-start items-center gap-2 rounded-2xl border border-red-400/60 bg-surface px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/50 dark:text-red-400 dark:hover:bg-red-950/30"
      >
        Delete account
      </button>
    );
  }

  const matches = typed.trim() === handle;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-red-400/40 bg-red-50/40 p-4 dark:border-red-500/30 dark:bg-red-950/20">
      <p className="text-sm text-ink/85">
        This wipes your card, avatar, and sign-in — and can&apos;t be
        undone. The handle becomes available for someone else to claim.
      </p>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink/80">
          Type{" "}
          <code className="rounded bg-bean/40 px-1.5 py-0.5 font-mono text-xs">
            {handle}
          </code>{" "}
          to confirm.
        </span>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          disabled={pending}
          className="rounded-2xl border border-bean bg-surface px-4 py-2.5 font-mono text-sm text-ink outline-none transition-colors focus:border-red-400 focus:ring-2 focus:ring-red-400/20 disabled:opacity-60"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || !matches}
          onClick={async () => {
            setPending(true);
            setError(null);
            const result = await deleteAccount();
            if (result.status === "ok") {
              router.replace("/");
              router.refresh();
            } else {
              setError(result.message);
              setPending(false);
            }
          }}
          className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Yes, delete everything"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setConfirming(false);
            setTyped("");
            setError(null);
          }}
          className="inline-flex items-center gap-2 rounded-2xl border border-bean bg-surface px-4 py-2 text-sm font-medium text-ink/85 hover:border-accent/60 hover:text-accent disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
