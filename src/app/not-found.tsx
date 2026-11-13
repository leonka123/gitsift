import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="page flex min-h-[60vh] flex-col justify-center py-20">
      <p className="eyebrow">404 · off the ledger</p>
      <h1 className="display mt-4 max-w-3xl text-[clamp(2.8rem,7vw,6rem)] leading-[0.96]">
        This one did not
        <br />
        make the cut.
      </h1>
      <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-2">
        The page is missing, the repository was not tracked, or the issue has not been published yet.
        The radar is still running.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/trending"
          className="inline-flex h-11 items-center gap-2 bg-ink px-5 text-sm font-medium text-paper transition-colors hover:bg-signal"
        >
          Back to the ledger <ArrowRight className="size-4" aria-hidden />
        </Link>
        <Link
          href="/search"
          className="inline-flex h-11 items-center border border-line-strong px-5 text-sm font-medium transition-colors hover:border-ink hover:bg-ink hover:text-paper"
        >
          Search by problem
        </Link>
      </div>
    </div>
  );
}
