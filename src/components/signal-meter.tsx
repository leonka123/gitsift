import { signalBucket, signalWord } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const HEIGHTS = [6, 9, 13, 17, 22];

export function SignalMeter({
  heat,
  tone = "light",
  label = true,
  className,
}: {
  heat: number;
  tone?: "light" | "dark";
  label?: boolean;
  className?: string;
}) {
  const bucket = signalBucket(heat);
  const word = signalWord(heat);
  return (
    <span
      className={cn("inline-flex items-end gap-[2px]", className)}
      role={label ? "img" : undefined}
      aria-label={label ? `Signal ${bucket} of 5 — ${word}` : undefined}
      aria-hidden={label ? undefined : true}
      title={`Signal ${bucket}/5 — ${word}`}
    >
      {HEIGHTS.map((height, index) => {
        const filled = index < bucket;
        return (
          <span
            key={height}
            style={{ height }}
            className={cn(
              "w-[3px]",
              filled
                ? "bg-signal"
                : tone === "dark"
                  ? "bg-paper/25"
                  : "bg-line-strong/60",
            )}
          />
        );
      })}
    </span>
  );
}

export function SignalLegend({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.08em]",
        tone === "dark" ? "text-paper/55" : "text-muted",
      )}
    >
      {[
        { heat: 15, label: "Quiet" },
        { heat: 45, label: "Warming" },
        { heat: 65, label: "Rising" },
        { heat: 80, label: "Strong" },
        { heat: 95, label: "Peak" },
      ].map((step) => (
        <span key={step.label} className="inline-flex items-center gap-2">
          <SignalMeter heat={step.heat} tone={tone} label={false} />
          {step.label}
        </span>
      ))}
    </div>
  );
}
