// Public origin used for canonical URLs, sitemap, and OG metadata.
// Set NEXT_PUBLIC_SITE_URL once the production domain is live.
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

export const siteName = "Nomad Meetup";
export const siteTagline = "Where are nomads right now?";
export const siteDescription =
  "Drop a pin, see who else just landed in your city. The full meetup app launches in Chiang Mai first.";
