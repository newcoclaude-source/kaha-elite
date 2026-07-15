// Chip — pílula de estado. Tons mapeados aos tokens do tailwind.config.

export type ChipTone =
  | "neutral"
  | "brand"
  | "ok"
  | "warn"
  | "risk"
  | "confirmed";

const TONS: Record<ChipTone, string> = {
  neutral: "border-line bg-line-2 text-muted",
  brand: "border-red/30 bg-red-soft text-red",
  ok: "border-ok/30 bg-ok-soft text-ok",
  warn: "border-warn/30 bg-warn-soft text-warn",
  risk: "border-risk/30 bg-red-soft text-risk",
  confirmed: "border-blue/30 bg-blue-soft text-blue",
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
