// W3C Geolocation API errors come back with one of three numeric codes plus a
// browser-dependent message ("Location unknown", "kCLErrorLocationUnknown",
// "User denied geolocation"...). The raw message isn't always useful to
// users — kCLErrorLocationUnknown for instance is true ("CoreLocation
// couldn't fix") but doesn't tell anyone what to do. Map to actionable copy.

const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;

export function friendlyGeoError(err: GeolocationPositionError): string {
  switch (err.code) {
    case PERMISSION_DENIED:
      return "Location permission was denied. Click the lock icon in your address bar to allow, then try again.";
    case POSITION_UNAVAILABLE:
      // kCLErrorLocationUnknown on macOS / iOS lands here. Common when
      // indoors with no Wi-Fi positioning data, on a VPN, or with poor GPS.
      return "Can't pin your location right now — try moving near a window, turning Wi-Fi on, or checking that location services are enabled for your browser.";
    case TIMEOUT:
      return "Location lookup took too long. Try again, or pick a café manually.";
    default:
      return err.message || "Could not get your location.";
  }
}
