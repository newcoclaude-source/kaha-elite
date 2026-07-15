// FilterChip — chip de filtro com contagem opcional. Link (href) ou botão (onClick).

import Link from "next/link";

export function FilterChip({
  children,
  ativo,
  count,
  href,
  onClick,
}: {
  children: React.ReactNode;
  ativo?: boolean;
  count?: number;
  href?: string;
  onClick?: () => void;
}) {
  const cls = `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
    ativo
      ? "border-red bg-red text-white"
      : "border-line bg-card text-muted hover:text-ink"
  }`;
  const inner = (
    <>
      {children}
      {count != null && (
        <span
          className={`rounded-full px-1.5 text-[10px] ${
            ativo ? "bg-white/25 text-white" : "bg-line-2 text-muted-2"
          }`}
        >
          {count}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
