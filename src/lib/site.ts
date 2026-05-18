// Public origin used for canonical URLs, sitemap, and OG metadata.
// Set NEXT_PUBLIC_SITE_URL once the production domain is live.
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

export const siteName = "acoffee";
export const siteTagline = "Coffee in bio.";
export const siteDescription =
  "Your friendly coffee chat page. Make your card at acoffee.com/{handle}, share it once, and get invited for coffee, online or in person — by builders, nomads, and interesting people.";
