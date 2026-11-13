import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://gitsift.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "GitSift — the radar for new and rising GitHub repositories",
    template: "%s — GitSift",
  },
  description:
    "Sift signal from noise. GitSift tracks new and rising open-source repositories, ranks them by momentum and quality, and finds the right building block for what you are making.",
  applicationName: "GitSift",
  authors: [{ name: "GitSift contributors", url: "https://github.com/gitsift/gitsift" }],
  creator: "GitSift",
  keywords: [
    "github",
    "open source",
    "repositories",
    "trending",
    "developer tools",
    "ai agents",
    "mcp",
    "discovery",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "GitSift",
    title: "GitSift — the radar for new and rising GitHub repositories",
    description:
      "New and rising open-source repositories, ranked by momentum and quality. Not another star leaderboard.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "GitSift — find the repo before it is obvious.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GitSift — the radar for new and rising GitHub repositories",
    description:
      "New and rising open-source repositories, ranked by momentum and quality. Not another star leaderboard.",
    images: ["/api/og"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": "/rss.xml" },
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f3ea",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grain min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xs focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
