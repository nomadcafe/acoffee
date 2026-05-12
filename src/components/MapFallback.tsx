"use client";

// Rendered in place of the MapLibre canvas when WebGL is unavailable
// (hardware acceleration off, locked-down browsers, some embedded webviews).
// Keeps surrounding layout stable so the page doesn't reflow.
export function MapFallback({ message }: { message?: string }) {
  return (
    <div
      role="img"
      aria-label="Map unavailable"
      className="flex h-full w-full flex-col items-center justify-center gap-2 bg-bean/20 px-6 text-center text-sm text-muted dark:bg-bean/10"
    >
      <span aria-hidden className="text-2xl opacity-60">🗺️</span>
      <p className="max-w-xs leading-snug">
        {message ??
          "Map can’t load — WebGL isn’t available in this browser. Try enabling hardware acceleration, switching browsers, or updating your graphics drivers."}
      </p>
    </div>
  );
}

// Neutral placeholder shown while the WebGL probe is still pending (one
// render tick before the useEffect resolves). Distinct from MapFallback so we
// don't flash the "WebGL unavailable" copy at users whose browsers are fine.
export function MapPlaceholder() {
  return (
    <div
      aria-hidden
      className="h-full w-full animate-pulse bg-bean/15 dark:bg-bean/10"
    />
  );
}
