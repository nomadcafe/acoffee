import type { NextConfig } from "next";

// Security response headers. Applied to every request. We deliberately
// skip Content-Security-Policy here — Next inline scripts + GA4 + the
// Supabase storage origin would all need carve-outs and a sloppy CSP
// is worse than none (it pretends to protect but leaves gaps). Revisit
// when traffic + threat model justify a nonce-based CSP rollout.
const SECURITY_HEADERS = [
  // Anti-clickjacking. SAMEORIGIN so we can still embed our own pages
  // inside an iframe on the same domain if a future feature needs it
  // (none today). 'DENY' is stricter but locks out useful future work.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Disable MIME-type sniffing so a misconfigured Content-Type can't
  // be reinterpreted by browsers (e.g. text/html served as image bytes).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Limit how much referrer info leaks to other origins. The standard
  // SaaS choice — full referrer same-origin, only the origin cross-site.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features we never use, in case a future XSS tries
  // to pop a camera or geolocation prompt.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS — Vercel already serves over HTTPS, so tell browsers to never
  // try HTTP for acoffee.com again. preload directive opts us into
  // Chrome's HSTS preload list once we submit at hstspreload.org.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // nodemailer (the optional SMTP email backend) uses Node built-ins and
  // dynamic internal requires that shouldn't be bundled. Keeping it
  // external means Next loads it from node_modules at runtime and traces
  // its files into the serverless function — fixing the
  // ERR_MODULE_NOT_FOUND that came from it not being bundled.
  serverExternalPackages: ["nodemailer"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
