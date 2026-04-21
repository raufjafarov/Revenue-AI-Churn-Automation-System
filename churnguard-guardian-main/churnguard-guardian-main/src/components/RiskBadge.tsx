import { cn } from "@/lib/utils";
import { getRiskLevel } from "@/types/churn";

export function RiskBadge({ score, className }: { score?: number; className?: string }) {
  const r = getRiskLevel(score);
  const label = score === undefined || score === null ? "Analiz olunmayıb" : `${score} • ${r.level}`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        r.bg,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
