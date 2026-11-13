"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function HeaderSearch() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable) return;
      event.preventDefault();
      router.push("/search");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <button
      type="button"
      onClick={() => router.push("/search")}
      className="group flex h-9 items-center gap-2 rounded-xs border border-line bg-paper/60 px-3 text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
      aria-label="Search repositories"
    >
      <Search className="size-3.5" aria-hidden />
      <span className="hidden text-xs sm:inline">Search</span>
      <kbd className="hidden rounded-xs border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline">
        /
      </kbd>
    </button>
  );
}
