// macOS / iOS CoreLocation often returns POSITION_UNAVAILABLE on the first
// call after the page loads — CoreLocation hasn't acquired a fix yet, the
// browser bridge times it out, returns kCLErrorLocationUnknown, and the
// second call (a beat later) succeeds. Wrap getCurrentPosition with one
// auto-retry so users don't have to manually click "I'm here" twice.
//
// Permission denied is NOT retried — that's a deliberate user action and
// retrying would just re-throw immediately.

const PERMISSION_DENIED = 1;

export function getCurrentPositionWithRetry(opts?: {
  timeoutMs?: number;
  enableHighAccuracy?: boolean;
  retryDelayMs?: number;
}): Promise<GeolocationPosition> {
  const timeoutMs = opts?.timeoutMs ?? 10_000;
  const retryDelayMs = opts?.retryDelayMs ?? 1_200;
  const enableHighAccuracy = opts?.enableHighAccuracy ?? false;

  return new Promise((resolve, reject) => {
    const tryOnce = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(resolve, (err) => {
        // First attempt failed. Retry once with high accuracy + a small
        // delay to give CoreLocation time to warm up — unless the user
        // denied permission, in which case retry is pointless.
        if (err.code === PERMISSION_DENIED) {
          reject(err);
          return;
        }
        if (highAccuracy) {
          // Already on the retry; give up.
          reject(err);
          return;
        }
        setTimeout(() => tryOnce(true), retryDelayMs);
      }, {
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge: 0,
      });
    };
    tryOnce(enableHighAccuracy);
  });
}
