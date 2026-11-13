"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, Search } from "lucide-react";
import type { SearchResponse, SearchResult } from "@/types";
import { cn } from "@/lib/utils";
import { RepoRow } from "./repo-row";

const STAR_FILTERS = [
  { label: "Any", value: 0 },
  { label: "100+", value: 100 },
  { label: "1k+", value: 1000 },
];

export function SearchExperience({
  initialQuery = "",
  examples,
}: {
  initialQuery?: string;
  examples: { label: string; query: string }[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [minStars, setMinStars] = useState(0);
  const [selfHosted, setSelfHosted] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasSearched = response !== null || loading;

  const runSearch = useCallback(
    async (raw: string, options: { minStars: number; selfHosted: boolean }) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        inputRef.current?.focus();
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ q: trimmed, limit: "12" });
      if (options.minStars > 0) params.set("minStars", String(options.minStars));
      if (options.selfHosted) params.set("selfHosted", "1");

      try {
        const res = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Search failed (${res.status})`);
        const json = (await res.json()) as SearchResponse;
        setResponse(json);
        const url = new URL(window.location.href);
        url.searchParams.set("q", trimmed);
        window.history.replaceState(null, "", url.toString());
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("Search is unavailable right now. Try again in a moment.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (initialQuery.trim()) {
      void runSearch(initialQuery, { minStars: 0, selfHosted: false });
    }
    // Only run for the query provided by the server on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const modeLabel =
    response?.mode === "hybrid"
      ? "hybrid: keywords + meaning"
      : response?.mode === "semantic"
        ? "ranked by meaning"
        : "ranked by keywords";

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch(query, { minStars, selfHosted });
        }}
        className="border border-line-strong bg-cream/60"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-2 sm:px-5">
          <Search className="size-5 shrink-0 text-muted" aria-hidden />
          <label htmlFor="search-input" className="sr-only">
            Describe what you are building
          </label>
          <input
            id="search-input"
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus={!initialQuery}
            maxLength={300}
            placeholder="I need a self-hosted analytics tool that works with Postgres…"
            className="h-12 w-full min-w-0 bg-transparent text-[15px] leading-snug outline-none placeholder:text-muted/80 sm:text-base"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xs bg-ink px-3.5 text-xs font-medium text-paper transition-colors hover:bg-signal disabled:opacity-60 sm:px-4"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            <span className="hidden sm:inline">{loading ? "Sifting" : "Sift"}</span>
            {!loading ? <ArrowRight className="size-3.5 sm:hidden" aria-hidden /> : null}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Stars</span>
            <div className="flex">
              {STAR_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setMinStars(filter.value)}
                  aria-pressed={minStars === filter.value}
                  className={cn(
                    "rounded-xs px-2 py-1 font-mono text-[10px] uppercase tracking-[0.05em] transition-colors",
                    minStars === filter.value
                      ? "bg-ink text-paper"
                      : "text-ink-2 hover:bg-paper-2",
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-2">
            <input
              type="checkbox"
              checked={selfHosted}
              onChange={(event) => setSelfHosted(event.target.checked)}
              className="size-3 accent-[var(--color-signal)]"
            />
            Self-hosted only
          </label>

          <p className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.06em] text-muted sm:block">
            English · Русский · hybrid retrieval
          </p>
        </div>
      </form>

      {!hasSearched ? (
        <div className="mt-8">
          <p className="eyebrow">Try describing a problem</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => {
                  setQuery(example.query);
                  void runSearch(example.query, { minStars: 0, selfHosted: false });
                }}
                className="group inline-flex items-center gap-2 border border-line bg-transparent px-3 py-2 text-left text-xs text-ink-2 transition-colors hover:border-ink hover:bg-paper-2 hover:text-ink"
              >
                <span>{example.label}</span>
                <ArrowRight
                  className="size-3 text-line-strong transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                  aria-hidden
                />
              </button>
            ))}
          </div>
          <div className="mt-10 grid gap-6 border-t border-line pt-6 text-sm leading-relaxed text-muted sm:grid-cols-3">
            <p>
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-ink">
                Describe the job
              </span>
              Not just a keyword. “A small Postgres-backed queue for side projects” works better than
              “queue”.
            </p>
            <p>
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-ink">
                Any language
              </span>
              Russian queries are translated and expanded into English concepts before ranking.
            </p>
            <p>
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-ink">
                Explainable
              </span>
              Every result shows what matched, why it surfaced and what to watch out for.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8" aria-live="polite">
        {loading ? (
          <div className="space-y-4 border-t border-line pt-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
              Sifting 1,240 repositories…
            </p>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex animate-pulse items-start gap-4 border-t border-line py-5">
                <div className="h-4 w-6 bg-paper-3" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 bg-paper-3" />
                  <div className="h-3 w-4/5 bg-paper-2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="border-l-2 border-signal pl-4 text-sm text-ink-2">{error}</p>
        ) : response ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                {response.results.length} {response.results.length === 1 ? "match" : "matches"} ·{" "}
                {response.tookMs}ms · {modeLabel}
              </p>
              <p className="max-w-md text-right text-[11px] leading-relaxed text-muted">
                {response.note}
              </p>
            </div>

            {response.results.length === 0 ? (
              <div className="py-10">
                <p className="display text-3xl">Nothing matched that.</p>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-2">
                  The index is deliberately small and filtered. Try removing a constraint, describing
                  the outcome instead of the tool, or using a broader category.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {examples.slice(0, 3).map((example) => (
                    <button
                      key={example.label}
                      type="button"
                      onClick={() => {
                        setQuery(example.query);
                        void runSearch(example.query, { minStars: 0, selfHosted: false });
                      }}
                      className="border border-line px-3 py-2 text-xs text-ink-2 hover:border-ink hover:text-ink"
                    >
                      {example.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-b border-line">
                {response.results.map((result: SearchResult, index) => (
                  <div key={result.repo.id}>
                    <RepoRow repo={result.repo} rank={index + 1} compact />
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-3 pl-0 md:pl-[3.75rem]">
                      {result.reason ? (
                        <p className="text-[12px] leading-relaxed text-ink-2">
                          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-signal-ink">
                            why it fits ·{" "}
                          </span>
                          {result.reason}
                        </p>
                      ) : result.matched.length ? (
                        <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
                          matched: {result.matched.join(" · ")}
                        </p>
                      ) : null}
                      {result.warning ? (
                        <p className="font-mono text-[10px] text-signal-ink">{result.warning}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
