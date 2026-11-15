import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { REPO_URL, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GitSift — the radar for new and rising GitHub repositories",
    template: "%s — GitSift",
  },
  description:
    "Sift signal from noise. GitSift tracks new and rising open-source repositories, ranks them by momentum and quality, and finds the right building block for what you are making.",
  applicationName: "GitSift",
  authors: [{ name: "GitSift contributors", url: REPO_URL }],
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
    url: SITE_URL,
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
  // Only the card type lives here. Title, description and image come from each
  // page's `openGraph` block, so a shared repository link previews the
  // repository rather than the site.
  twitter: { card: "summary_large_image" },
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6efe2" },
    { media: "(prefers-color-scheme: dark)", color: "#241b14" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

const themeScript = `(function(){try{var t=localStorage.getItem('gitsift-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
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
