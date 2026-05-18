"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount } from "@/app/profile/actions";

// Two-step delete: first click flips to a confirm state with two visible
// buttons (Yes / Cancel). Native confirm() would do the same thing more
// crudely but feels wrong for a destructive action that's actually
// reversible-via-resignup; a real two-button confirmation is friendlier
// AND fully accessible without an alert modal.
export function DeleteAccountButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
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

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink/80">
        This wipes your card, avatar, and sign-in — and can&apos;t be
        undone. The handle becomes available for someone else to claim.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
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
          className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Yes, delete everything"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setConfirming(false);
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
