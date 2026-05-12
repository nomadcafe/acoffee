// Public origin used for canonical URLs, sitemap, and OG metadata.
// Set NEXT_PUBLIC_SITE_URL once the production domain is live.
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

export const siteName = "acoffee";
export const siteTagline = "You just landed. The first move is coffee.";
export const siteDescription =
  "A soft map for digital nomads. Drop a pin in a new city, see who's working at which café, set one signal — coffee, cowork, dinner, hike — and meet someone today. Open in Chiang Mai.";
