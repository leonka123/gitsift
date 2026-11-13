import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDigestByWeek } from "@/db/queries";
import { formatDate, weekLabel } from "@/lib/utils";
import { RepoCard } from "@/components/repo-card";
import { SignalLegend } from "@/components/signal-meter";
import { Eyebrow } from "@/components/ui";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ week: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { week } = await params;
  const digest = getDigestByWeek(week);
  if (!digest) return { title: "Issue not found" };
  return {
    title: digest.title,
    description: digest.intro ?? `GitSift weekly issue ${digest.week}.`,
    alternates: { canonical: `/digest/${digest.week}` },
    openGraph: {
      title: digest.title,
      description: digest.intro ?? undefined,
      type: "article",
      images: [
        {
          url: `/api/og?eyebrow=${encodeURIComponent(`The weekly issue · ${digest.week}`)}&title=${encodeURIComponent(
            digest.title,
          )}&subtitle=${encodeURIComponent(digest.intro ?? "What moved this week.")}&meta=${encodeURIComponent(
            `${digest.items.length} entries · edited by hand`,
          )}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function DigestPage({ params }: Params) {
  const { week } = await params;
  if (!/^\d{4}-W\d{2}$/.test(week)) notFound();
  const digest = getDigestByWeek(week);
  if (!digest) notFound();

  return (
    <>
      <header className="page border-b border-line pb-10 pt-10 md:pt-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Eyebrow>Weekly issue · {formatDate(digest.createdAt)}</Eyebrow>
          <Link href="/digest" className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-2 hover:text-ink">
            ← All issues
          </Link>
        </div>

        <div className="mt-7 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <h1 className="display text-pretty text-[clamp(2.6rem,5.4vw,4.6rem)] leading-[0.98]">{digest.title}</h1>
            {digest.intro ? (
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-2">{digest.intro}</p>
            ) : null}
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              {weekLabel(digest.week)} · {digest.items.length} entries · every entry carries a signal score
            </p>
          </div>
          <div className="hidden lg:col-span-4 lg:block">
            <div className="border-l border-line pl-7">
              <p className="eyebrow">In this issue</p>
              <ol className="mt-3 space-y-2">
                {digest.items.map((item) => (
                  <li key={item.repo.id}>
                    <a
                      href={`#entry-${item.position}`}
                      className="group flex items-baseline gap-2.5 text-[12px] text-ink-2 hover:text-ink"
                    >
                      <span className="tnum font-mono text-[9px] text-muted">
                        {String(item.position).padStart(2, "0")}
                      </span>
                      <span className="truncate">{item.repo.fullName}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </header>

      <div className="page py-10">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-8">
            {digest.items.map((item, index) => (
              <div key={item.repo.id} id={`entry-${item.position}`} className="scroll-mt-24">
                <RepoCard item={item} large={index === 0} />
              </div>
            ))}
          </div>

          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <div className="border border-line bg-paper-2/40 p-5">
                <p className="eyebrow">How this was built</p>
                <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
                  The shortlist is the top of the rising ledger, capped at two entries per primary
                  topic. Each entry is then written up with its actual metrics — no new numbers, no
                  rounded-up claims.
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
                  If a project looked good but had no license, no README or a suspicious star curve, it
                  is not here.
                </p>
                <Link
                  href="/about"
                  className="mt-4 inline-block border-b border-line-strong pb-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink hover:border-ink"
                >
                  Read the method
                </Link>
              </div>

              <div className="mt-6 border-t border-line pt-5">
                <p className="eyebrow">Keep reading</p>
                <div className="mt-3 space-y-2 text-sm">
                  <Link href="/trending" className="flex items-center justify-between gap-3 border-b border-line py-2.5 hover:text-signal-ink">
                    <span>The live ledger</span>
                    <span className="font-mono text-[10px] text-muted">→</span>
                  </Link>
                  <Link href="/digest" className="flex items-center justify-between gap-3 border-b border-line py-2.5 hover:text-signal-ink">
                    <span>All issues</span>
                    <span className="font-mono text-[10px] text-muted">→</span>
                  </Link>
                  <Link href="/rss.xml" className="flex items-center justify-between gap-3 py-2.5 hover:text-signal-ink">
                    <span>RSS</span>
                    <span className="font-mono text-[10px] text-muted">→</span>
                  </Link>
                </div>
              </div>

              <div className="mt-6 border-t border-line pt-5">
                <p className="eyebrow">Signal scale</p>
                <div className="mt-3">
                  <SignalLegend />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
