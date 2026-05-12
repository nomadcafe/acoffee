"use client";
import { useState } from "react";

type Status = "idle" | "loading" | "done" | "error";

export function SubscribeForm({ city }: { city: string }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, city, website: website || undefined }),
      });
      const json = (await res.json()) as { duplicate?: boolean; error?: string };
      if (res.status === 429) {
        throw new Error("Too many tries. Wait a bit and try again.");
      }
      if (!res.ok) throw new Error(json.error || "failed");
      setStatus("done");
      setMessage(
        json.duplicate
          ? "You're already on the list."
          : "We'll email you when it's ready.",
      );
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "failed");
    }
  }

  if (status === "done") {
    return (
      <p className="text-sm text-accent">{message}</p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 rounded-full border border-bean bg-surface px-4 py-2 text-sm outline-none focus:border-accent dark:bg-bean/40"
      />
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute -left-[9999px] top-0 h-0 w-0 opacity-0"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-page hover:opacity-85 disabled:opacity-60"
      >
        {status === "loading" ? "Saving…" : "Notify me"}
      </button>
      {status === "error" && (
        <p className="basis-full text-xs text-red-600 dark:text-red-400">
          {message}
        </p>
      )}
    </form>
  );
}
