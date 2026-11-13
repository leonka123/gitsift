import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { HeaderSearch } from "./header-search";

const NAV = [
  { href: "/trending", label: "Rising" },
  { href: "/new", label: "New" },
  { href: "/gems", label: "Gems" },
  { href: "/topics", label: "Topics" },
  { href: "/about", label: "Method" },
];

function SignalMark() {
  return (
    <span className="flex h-6 items-end gap-[2px]" aria-hidden>
      <span className="h-2 w-[3px] bg-signal" />
      <span className="h-3.5 w-[3px] bg-signal" />
      <span className="h-5 w-[3px] bg-signal" />
      <span className="h-6 w-[3px] bg-ink" />
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="page flex h-16 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3" aria-label="GitSift home">
          <SignalMark />
          <span className="font-serif text-[22px] leading-none tracking-[-0.02em]">GitSift</span>
          <span className="hidden border-l border-line pl-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted lg:inline">
            Open-source radar
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="link-slide text-[13px] font-medium text-ink-2 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <HeaderSearch />
          <a
            href="https://github.com/gitsift/gitsift"
            target="_blank"
            rel="noreferrer"
            className="hidden h-9 items-center gap-1.5 rounded-xs border border-line-strong px-3 text-xs font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper sm:flex"
          >
            GitHub
            <ArrowUpRight className="size-3.5" aria-hidden />
          </a>
        </div>
      </div>

      <nav
        className="no-scrollbar flex gap-5 overflow-x-auto border-t border-line px-5 py-2 md:hidden"
        aria-label="Main mobile"
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.1em] text-ink-2"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
