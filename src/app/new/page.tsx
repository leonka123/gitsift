import type { Metadata } from "next";
import Link from "next/link";
import { getFeed } from "@/db/queries";
import { PageHeader } from "@/components/ui";
import { RepoRowList } from "@/components/repo-row";
import { SignalLegend } from "@/components/signal-meter";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New repositories",
  description:
    "Open-source repositories created in the last 7, 30 or 90 days, filtered for quality and ranked by early momentum.",
  alternates: { canonical: "/new" },
  openGraph: {
    images: [
      {
        url: "/api/og?eyebrow=New%20arrivals&title=Just%20landed&subtitle=Repositories%20created%20in%20the%20last%207%2C%2030%20or%2090%20days.",
        width: 1200,
        height: 630,
      },
    ],
  },
};

const WINDOWS = [7, 30, 90];

export default async function NewPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const params = await searchParams;
  const windowDays = WINDOWS.includes(Number(params.window)) ? Number(params.window) : 30;
  const feed = getFeed({ mode: "new", limit: 40, windowDays });

  return (
    <>
      <PageHeader
        eyebrow="New arrivals"
        title="Just landed"
        intro="Projects with no star history to lean on. The ranking here is deliberately harsh: momentum is computed from age, not reputation, and an empty README can keep a fast repo out of the list."
        aside={
          <div className="space-y-5">
            <div>
              <p className="eyebrow">Window</p>
              <div className="mt-3 flex gap-2">
                {WINDOWS.map((days) => (
                  <Link
                    key={days}
                    href={`/new?window=${days}`}
                    className={cn(
                      "border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.06em] transition-colors",
                      windowDays === days
                        ? "border-ink bg-ink text-paper"
                        : "border-line text-ink-2 hover:border-line-strong hover:text-ink",
                    )}
                  >
                    {days} days
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow">Signal scale</p>
              <div className="mt-3">
                <SignalLegend />
              </div>
            </div>
          </div>
        }
      />

      <section className="page py-10">
        <div className="mb-5 flex items-center justify-between border-b border-line pb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            Created in the last {windowDays} days
          </p>
          <p className="hidden font-mono text-[10px] uppercase tracking-[0.1em] text-muted sm:block">
            Rank · signal · repository · age
          </p>
        </div>

        {feed.repos.length ? (
          <RepoRowList repos={feed.repos} />
        ) : (
          <div className="py-16">
            <p className="display text-4xl">Nothing new passed the bar.</p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-2">
              The window is real: on quiet days, few repositories meet the quality floor. Try a
              wider window or look at what is rising instead.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/new?window=90"
                className="border border-line-strong px-4 py-2 text-sm hover:border-ink hover:bg-ink hover:text-paper"
              >
                Open 90 days
              </Link>
              <Link
                href="/trending"
                className="border border-line px-4 py-2 text-sm text-ink-2 hover:border-ink hover:text-ink"
              >
                See what is rising
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
