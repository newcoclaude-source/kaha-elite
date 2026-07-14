// EmptyState — ícone + frase + CTA. Nunca uma tela vazia sem orientação.

import Link from "next/link";
import { Icon, type IconName } from "./icons";

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  className = "",
}: {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center ${className}`}
    >
      {icon && (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-2 text-muted-2">
          <Icon name={icon} className="h-6 w-6" />
        </span>
      )}
      <p className="text-sm font-medium text-text">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
