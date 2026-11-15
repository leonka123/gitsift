import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ButtonLink } from "./ui";
import { REPO_URL, DISCUSSIONS_URL } from "@/lib/site";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/trending", label: "Rising" },
      { href: "/new", label: "New this week" },
      { href: "/gems", label: "Hidden gems" },
      { href: "/search", label: "Semantic search" },
    ],
  },
  {
    title: "Data",
    links: [
      { href: "/about", label: "Methodology" },
      { href: "/api/repos", label: "Public API", external: true },
      { href: "/rss.xml", label: "RSS", external: true },
      { href: "/topics", label: "Topics" },
    ],
  },
  {
    title: "Project",
    links: [
      { href: REPO_URL, label: "GitHub", external: true },
      { href: DISCUSSIONS_URL, label: "Discussions", external: true },
      { href: `${REPO_URL}/blob/main/CONTRIBUTING.md`, label: "Contributing", external: true },
      { href: `${REPO_URL}/blob/main/LICENSE`, label: "MIT license", external: true },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-paper-2/40">
      <div className="page py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow">The next wave</p>
            <h2 className="display mt-4 max-w-xl text-4xl md:text-5xl">
              The next wave is already on GitHub. See it first.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-2">
              GitSift is open source and self-hostable. If it saves you an afternoon, star the repo —
              that is how the next person finds it.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={REPO_URL} external>
                Star on GitHub
              </ButtonLink>
              <ButtonLink href="/rss.xml" variant="secondary">
                Subscribe via RSS
              </ButtonLink>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  {column.title}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink"
                        >
                          {link.label}
                          <ArrowUpRight className="size-3 opacity-50" aria-hidden />
                        </a>
                      ) : (
                        <Link href={link.href} className="text-sm text-ink-2 hover:text-ink">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-6 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 GitSift. MIT licensed.</span>
          <span className="font-mono uppercase tracking-[0.08em]">
            No paid placement · No bought stars · Data from the GitHub API
          </span>
        </div>
      </div>
    </footer>
  );
}
