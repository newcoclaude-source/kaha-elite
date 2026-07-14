// Chip — pílula de estado. Tons mapeados aos tokens do tailwind.config.

export type ChipTone =
  | "neutral"
  | "brand"
  | "ok"
  | "warn"
  | "risk"
  | "confirmed";

const TONS: Record<ChipTone, string> = {
  neutral: "border-border bg-surface-2 text-muted",
  brand: "border-brand/40 bg-brand/15 text-brand",
  ok: "border-ok/40 bg-ok/15 text-ok",
  warn: "border-warn/40 bg-warn/15 text-warn",
  risk: "border-risk/40 bg-risk/15 text-risk",
  confirmed: "border-confirmed/40 bg-confirmed/15 text-confirmed",
};

export function Chip({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: ChipTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONS[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
