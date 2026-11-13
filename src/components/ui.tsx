import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = {
  primary:
    "inline-flex h-11 items-center justify-center gap-2 rounded-xs bg-ink px-5 text-sm font-medium text-paper transition-colors duration-150 hover:bg-signal focus-visible:bg-signal",
  secondary:
    "inline-flex h-11 items-center justify-center gap-2 rounded-xs border border-line-strong bg-transparent px-5 text-sm font-medium text-ink transition-colors duration-150 hover:border-ink hover:bg-ink hover:text-paper",
  ghost:
    "inline-flex h-11 items-center justify-center gap-2 rounded-xs px-3 text-sm font-medium text-ink-2 transition-colors duration-150 hover:bg-paper-2 hover:text-ink",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

export function ButtonLink({
  href,
  variant = "primary",
  external = false,
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  external?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const classes = cn(buttonVariants[variant], className);
  if (external || href.startsWith("http")) {
    return (
      <a className={classes} href={href} target="_blank" rel="noreferrer">
        {children}
        <ArrowUpRight className="size-4" aria-hidden />
      </a>
    );
  }
  return (
    <Link className={classes} href={href}>
      {children}
    </Link>
  );
}

export function Chip({
  href,
  active = false,
  className,
  children,
}: {
  href?: string;
  active?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const classes = cn(
    "inline-flex items-center gap-1.5 rounded-xs border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors duration-150",
    active
      ? "border-ink bg-ink text-paper"
      : "border-line bg-transparent text-ink-2 hover:border-line-strong hover:text-ink",
    className,
  );
  if (href) {
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    );
  }
  return <span className={classes}>{children}</span>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  action,
  note,
}: {
  eyebrow: string;
  title: string;
  action?: { href: string; label: string };
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="display mt-2 text-3xl md:text-4xl">{title}</h2>
      </div>
      {action ? (
        <Link
          href={action.href}
          className="link-slide font-mono text-[11px] uppercase tracking-[0.08em] text-ink-2 hover:text-ink"
        >
          {action.label} →
        </Link>
      ) : note ? (
        <p className="max-w-xs text-right text-xs leading-relaxed text-muted">{note}</p>
      ) : null}
    </div>
  );
}

export function StatBlock({
  value,
  label,
  hint,
  dark = false,
}: {
  value: string;
  label: string;
  hint?: string;
  dark?: boolean;
}) {
  return (
    <div>
      <div
        className={cn(
          "font-serif text-4xl tracking-tight md:text-5xl",
          dark ? "text-paper" : "text-ink",
        )}
      >
        {value}
      </div>
      <div
        className={cn(
          "mt-2 font-mono text-[10px] uppercase tracking-[0.12em]",
          dark ? "text-paper/55" : "text-muted",
        )}
      >
        {label}
      </div>
      {hint ? (
        <p className={cn("mt-2 text-xs leading-relaxed", dark ? "text-paper/55" : "text-muted")}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  intro,
  aside,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro?: string;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="page border-b border-line pb-10 pt-12 md:pb-14 md:pt-16">
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className={aside ? "lg:col-span-8" : "lg:col-span-10"}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="display mt-3 text-[clamp(2.5rem,5.5vw,4.75rem)] text-ink">{title}</h1>
          {intro ? (
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-2">{intro}</p>
          ) : null}
          {children}
        </div>
        {aside ? (
          <div className="border-t border-line pt-5 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-1">
            {aside}
          </div>
        ) : null}
      </div>
    </header>
  );
}
