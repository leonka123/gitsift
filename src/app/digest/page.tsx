import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listDigests } from "@/db/queries";
import { formatDate, weekLabel } from "@/lib/utils";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The weekly issue",
  description:
    "GitSift's weekly edit: the repositories that moved, why they matter now, and what to build with them. No press releases.",
  alternates: { canonical: "/digest" },
  openGraph: {
    images: [
      {
        url: "/api/og?eyebrow=The%20weekly%20issue&title=Field%20notes%20from%20the%20firehose&subtitle=What%20moved%2C%20why%20now%2C%20and%20what%20to%20build%20with%20it.",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function DigestIndexPage() {
  const digests = listDigests(24);

  return (
    <>
      <PageHeader
        eyebrow="The weekly issue · Mondays"
        title="Field notes from the firehose"
        intro="A short, edited issue: ten to twelve repositories that moved this week, a reason to look at each one, and one weekend-sized idea. The ranking is computed; the edit is human."
        aside={
          <div className="space-y-4">
            <p className="eyebrow">Subscribe</p>
            <p className="text-[13px] leading-relaxed text-ink-2">
              The issue is published as RSS the moment it is built. No email, no tracking pixels, no
              growth hacks.
            </p>
            <Link
              href="/rss.xml"
              className="inline-flex items-center gap-2 border border-line-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.08em] hover:border-ink hover:bg-ink hover:text-paper"
            >
              RSS feed <ArrowRight className="size-3" aria-hidden />
            </Link>
          </div>
        }
      />

      <section className="page py-10">
        {digests.length ? (
          <div className="border-b border-line">
            {digests.map((digest) => (
              <Link
                key={digest.week}
                href={`/digest/${digest.week}`}
                className="hover-row group grid gap-4 border-t border-line py-7 first:border-t-0 md:grid-cols-[10rem_1fr_auto] md:gap-8"
              >
                <div>
                  <p className="tnum font-mono text-[11px] uppercase tracking-[0.07em] text-signal-ink">
                    {digest.week}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
                    {weekLabel(digest.week)}
                  </p>
                </div>
                <div>
                  <h2 className="font-serif text-2xl leading-snug transition-colors group-hover:text-signal-ink md:text-3xl">
                    {digest.title}
                  </h2>
                  {digest.intro ? (
                    <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-2">{digest.intro}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-4 md:flex-col md:items-end md:justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
                    {digest.itemCount ?? 0} entries
                  </span>
                  <span className="font-mono text-[10px] text-muted">{formatDate(digest.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-16">
            <p className="display text-4xl">The first issue is being set.</p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-2">
              Run the ingestion pipeline to build this week&apos;s issue, or read the live ledger in
              the meantime.
            </p>
            <Link href="/trending" className="mt-6 inline-block border border-line-strong px-4 py-2 text-sm hover:border-ink hover:bg-ink hover:text-paper">
              Open the ledger
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
