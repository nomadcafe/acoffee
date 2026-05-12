"use client";
import { useEffect, useState } from "react";

// `null` while we haven't probed yet (SSR / first paint) so callers can render
// a neutral placeholder instead of flashing the fallback for a frame.
export function useWebglSupported(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      setSupported(!!gl);
    } catch {
      setSupported(false);
    }
  }, []);
  return supported;
}
