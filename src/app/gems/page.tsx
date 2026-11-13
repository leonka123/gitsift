import type { Metadata } from "next";
import { getFeed } from "@/db/queries";
import { PageHeader } from "@/components/ui";
import { RepoRowList } from "@/components/repo-row";
import { SignalLegend } from "@/components/signal-meter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hidden gems",
  description:
    "Small open-source projects between 20 and 900 stars growing faster than one and a half stars per day. Before the crowd finds them.",
  alternates: { canonical: "/gems" },
  openGraph: {
    images: [
      {
        url: "/api/og?eyebrow=Hidden%20gems&title=Quiet%20compounds&subtitle=Small%20projects%20growing%20faster%20than%20the%20timeline%20notices.&meta=20%E2%80%93900%20stars%20%C2%B7%20%E2%89%A51.5%20stars%2Fday",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function GemsPage() {
  const feed = getFeed({ mode: "gems", limit: 40 });

  return (
    <>
      <PageHeader
        eyebrow="Hidden gems · 20–900 stars"
        title="Quiet compounds"
        intro="Not everything interesting happens at 50k stars. These projects are small enough that the maintainer still answers issues, and growing fast enough that the next six months matter."
        aside={
          <div className="space-y-5 text-sm leading-relaxed text-ink-2">
            <div>
              <p className="eyebrow">The bar</p>
              <ul className="mt-3 space-y-2 text-[13px]">
                <li className="flex gap-2 border-b border-line pb-2">
                  <span className="font-mono text-[10px] text-signal-ink">01</span>
                  Between 20 and 900 stars.
                </li>
                <li className="flex gap-2 border-b border-line pb-2">
                  <span className="font-mono text-[10px] text-signal-ink">02</span>
                  At least 1.5 stars per day since creation.
                </li>
                <li className="flex gap-2 border-b border-line pb-2">
                  <span className="font-mono text-[10px] text-signal-ink">03</span>
                  Pushed in the last 45 days, created within 400.
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-[10px] text-signal-ink">04</span>
                  Passes the quality floor and bot filter.
                </li>
              </ul>
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
        {feed.repos.length ? (
          <>
            <div className="mb-5 flex items-center justify-between border-b border-line pb-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                {feed.repos.length} projects in the current window
              </p>
              <p className="hidden font-mono text-[10px] uppercase tracking-[0.1em] text-muted sm:block">
                Rank · signal · repository · stars/day
              </p>
            </div>
            <RepoRowList repos={feed.repos} />
          </>
        ) : (
          <div className="py-16">
            <p className="display text-4xl">The gems are hiding well.</p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-2">
              No project currently meets every criterion. The filters are intentionally strict —
              lowering them would just produce another list of unfinished side projects.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
