// StatCard — número grande + label + contexto/delta. Base do dashboard.

export type StatTone = "default" | "risk" | "warn" | "ok";

const VALOR_TOM: Record<StatTone, string> = {
  default: "text-text",
  risk: "text-risk",
  warn: "text-warn",
  ok: "text-ok",
};

export function StatCard({
  label,
  value,
  suffix,
  context,
  tone = "default",
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  suffix?: React.ReactNode;
  context?: React.ReactNode;
  tone?: StatTone;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-4 ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-1">
        <span className={`text-3xl font-bold tabular-nums ${VALOR_TOM[tone]}`}>
          {value}
        </span>
        {suffix && <span className="text-sm text-muted-2">{suffix}</span>}
      </p>
      {context && <p className="mt-1 text-xs text-muted">{context}</p>}
    </div>
  );
}
