import Link from "next/link";
import { repoHref } from "@/lib/utils";
import type { Repo } from "@/types";

export function Ticker({
  repos,
}: {
  repos: Pick<Repo, "fullName" | "stars" | "createdAt">[];
}) {
  if (!repos.length) return null;
  const doubled = [...repos, ...repos];

  return (
    <div className="ticker group relative flex items-stretch overflow-hidden border-y border-line bg-paper-2/50">
      <div className="relative z-10 flex shrink-0 items-center gap-2 border-r border-line bg-paper px-3 py-2.5 sm:px-4">
        <span className="live-dot size-1.5 rounded-full bg-signal" aria-hidden />
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink">Just tracked</span>
      </div>
      <div className="ticker-viewport relative min-w-0 flex-1 overflow-hidden">
        <div className="ticker-track flex w-max items-center">
          {doubled.map((repo, index) => (
            <Link
              key={`${repo.fullName}-${index}`}
              href={repoHref(repo.fullName)}
              aria-hidden={index >= repos.length}
              tabIndex={index >= repos.length ? -1 : undefined}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap border-r border-line/70 px-4 py-2.5 font-mono text-[11px] text-ink-2 hover:text-ink"
            >
              <span>{repo.fullName}</span>
              <span className="tnum text-muted">{repo.stars.toLocaleString("en-US")}★</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
