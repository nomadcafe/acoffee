import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/components/LocaleProvider";
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { getLocale } from "@/lib/i18n";
import {
  siteDescription,
  siteName,
  siteTagline,
  siteUrl,
} from "@/lib/site";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — ${siteTagline}`,
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName,
    title: `${siteName} — ${siteTagline}`,
    description: siteDescription,
    url: "/",
    locale: "en",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — ${siteTagline}`,
    description: siteDescription,
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // GA4 only mounts when the measurement ID is present — local dev / preview
  // deploys without the env var don't ping production analytics. The
  // <GoogleAnalytics> helper from @next/third-parties handles deferred-load
  // and avoids blocking LCP.
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  // Resolve once at the root so `<html lang>` matches the rendered copy
  // and every client component can read the locale through context.
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-page text-ink">
        <LocaleProvider locale={locale}>
          <OnboardingBanner />
          <SiteNav />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter />
        </LocaleProvider>
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}
