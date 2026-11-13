import { cn } from "@/lib/utils";
import type { Repo } from "@/types";

export type SparkPoint = { date: string; stars: number };

/**
 * A deterministic "what the average growth rate implies" line. Only used where
 * real daily snapshots do not exist yet, and always labelled as modeled.
 */
export function modeledSeries(repo: Pick<Repo, "stars" | "starsPerDay">, days = 30): SparkPoint[] {
  const today = Date.now();
  const points: SparkPoint[] = [];
  const perDay = Math.max(repo.starsPerDay, repo.stars / Math.max(days, 1) / 4);
  const start = Math.max(repo.stars - perDay * days, Math.min(repo.stars, 1));
  for (let i = days; i >= 0; i--) {
    const value = start + ((repo.stars - start) * (days - i)) / days;
    points.push({
      date: new Date(today - i * 86_400_000).toISOString().slice(0, 10),
      stars: Math.max(0, Math.round(value)),
    });
  }
  return points;
}

function buildPath(points: SparkPoint[], width: number, height: number, pad: number) {
  const values = points.map((p) => p.stars);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const coords = points.map((p, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * innerW;
    const y = pad + innerH - ((p.stars - min) / span) * innerH;
    return { x, y };
  });
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
  const last = coords[coords.length - 1];
  const first = coords[0];
  const area = `${line} L${last.x.toFixed(2)},${(height - pad).toFixed(2)} L${first.x.toFixed(2)},${(
    height - pad
  ).toFixed(2)} Z`;
  return { line, area, last };
}

export function Sparkline({
  points,
  width = 84,
  height = 24,
  modeled = false,
  className,
  accent = false,
}: {
  points: SparkPoint[];
  width?: number;
  height?: number;
  modeled?: boolean;
  className?: string;
  accent?: boolean;
}) {
  if (points.length < 2) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className={cn("text-line-strong", className)}
        aria-hidden
      >
        <line x1="2" y1={height - 3} x2={width - 2} y2={height - 3} stroke="currentColor" strokeWidth="1" />
        <circle cx={width - 4} cy={height - 3} r="1.6" fill={accent ? "var(--color-signal)" : "currentColor"} />
      </svg>
    );
  }

  const { line, area, last } = buildPath(points, width, height, 2);
  const stroke = accent ? "var(--color-signal)" : "var(--color-ink-2)";
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      aria-label={modeled ? "Modeled 30-day star trend" : "Star history"}
      role="img"
    >
      <path d={area} fill={stroke} opacity={accent ? 0.08 : 0.05} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={modeled ? "2 2" : undefined}
      />
      <circle cx={last.x} cy={last.y} r="1.7" fill={stroke} />
    </svg>
  );
}
