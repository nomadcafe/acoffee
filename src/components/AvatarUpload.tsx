"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { useT } from "@/components/LocaleProvider";
import { createSupabaseBrowser } from "@/lib/supabase/browser";

// Profile avatar upload widget. Handles file pick → client-side resize to
// 256×256 (centre-cropped, encoded as WebP at q=0.85) → upload to the
// public `avatars` bucket at path `{userId}/avatar.webp` → write the
// resulting public URL back to profiles.avatar_url via the authenticated
// browser client (RLS scopes the row to the owner).
//
// The form-level Save button doesn't include avatar_url — that field
// commits immediately on upload so we don't lose a fresh photo if the
// user navigates away before pressing Save on the text fields.
const TARGET_SIZE = 256;
const STORAGE_PATH = "avatar.webp";
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB pre-resize

export function AvatarUpload({
  userId,
  handle,
  displayName,
  initialUrl,
  onChange,
}: {
  userId: string;
  handle: string;
  displayName: string;
  initialUrl: string | null;
  // Notify ProfileForm so the LiveCardPreview can swap in the new image
  // without waiting for router.refresh() to round-trip.
  onChange?: (url: string | null) => void;
}) {
  const t = useT();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError(t("avatar.error.notImage"));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(t("avatar.error.tooBig"));
      return;
    }
    setBusy("upload");
    try {
      const resized = await resizeToSquare(file, TARGET_SIZE);
      const supabase = createSupabaseBrowser();
      const path = `${userId}/${STORAGE_PATH}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, resized, {
          upsert: true,
          contentType: "image/webp",
          cacheControl: "3600",
        });
      if (uploadErr) throw uploadErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so the new image loads on the next render — every paint
      // of the avatar URL must change when the underlying file changes.
      const versioned = `${publicUrl}?v=${Date.now()}`;
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: versioned })
        .eq("id", userId);
      if (updateErr) throw updateErr;
      setUrl(versioned);
      onChange?.(versioned);
      router.refresh();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Upload failed. Try again.";
      setError(msg);
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove() {
    setError(null);
    setBusy("remove");
    try {
      const supabase = createSupabaseBrowser();
      // Best-effort delete of the file — proceed to clear the column even
      // if the storage object is already gone (404 here would be fine).
      await supabase.storage
        .from("avatars")
        .remove([`${userId}/${STORAGE_PATH}`]);
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);
      if (updateErr) throw updateErr;
      setUrl(null);
      onChange?.(null);
      router.refresh();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not remove the avatar.";
      setError(msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
      <Avatar
        handle={handle}
        displayName={displayName}
        src={url}
        size="lg"
      />
      <div className="flex min-w-0 flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            // Reset value so picking the same file twice still triggers change.
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md disabled:opacity-60"
          >
            {busy === "upload"
              ? t("avatar.uploading")
              : url
                ? t("avatar.change")
                : t("avatar.upload")}
          </button>
          {url && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-2xl border border-bean bg-surface px-4 py-2 text-sm font-medium text-ink/85 hover:border-accent/60 hover:text-accent disabled:opacity-60"
            >
              {busy === "remove" ? t("avatar.removing") : t("avatar.remove")}
            </button>
          )}
        </div>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <p className="text-sm text-muted">{t("avatar.hint")}</p>
        )}
      </div>
    </div>
  );
}

// Centre-crop to a square + downscale to `size` × `size`. Encodes WebP
// q=0.85 — small enough for fast OG loads, sharp enough for a 80px hero
// avatar at retina.
async function resizeToSquare(file: File, size: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not available — try another browser.");
  const sourceSize = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - sourceSize) / 2;
  const sy = (bitmap.height - sourceSize) / 2;
  ctx.drawImage(bitmap, sx, sy, sourceSize, sourceSize, 0, 0, size, size);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Could not encode the image.")),
      "image/webp",
      0.85,
    );
  });
}
