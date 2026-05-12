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
