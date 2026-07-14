// ListRow — linha de lista: avatar/ícone, título, subtítulo, meta à direita, chevron.

import Link from "next/link";
import { Icon } from "./icons";

export function ListRow({
  href,
  leading,
  title,
  subtitle,
  meta,
  chevron = true,
  onClick,
  className = "",
}: {
  href?: string;
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const conteudo = (
    <>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text">{title}</div>
        {subtitle && (
          <div className="truncate text-xs text-muted">{subtitle}</div>
        )}
      </div>
      {meta && <div className="shrink-0 text-right">{meta}</div>}
      {chevron && (href || onClick) && (
        <Icon name="chevron" className="h-4 w-4 shrink-0 text-muted-2" />
      )}
    </>
  );

  const base =
    "flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-muted-2";

  if (href) {
    return (
      <Link href={href} className={`${base} ${className}`}>
        {conteudo}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left ${base} ${className}`}
      >
        {conteudo}
      </button>
    );
  }
  return <div className={`${base} ${className}`}>{conteudo}</div>;
}

// Avatar quadrado com iniciais — usado como leading do ListRow.
export function Avatar({
  iniciais,
  className = "",
  size = "md",
}: {
  iniciais: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "lg"
      ? "h-14 w-14 text-lg"
      : size === "sm"
        ? "h-9 w-9 text-xs"
        : "h-12 w-12 text-sm";
  return (
    <span
      className={`flex items-center justify-center rounded-xl border font-bold ${dims} ${
        className || "border-border bg-surface-2 text-text"
      }`}
    >
      {iniciais}
    </span>
  );
}
