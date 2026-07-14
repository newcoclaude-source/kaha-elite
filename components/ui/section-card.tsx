// SectionCard — card padrão com header (título + ação "ver tudo").

import Link from "next/link";

export function SectionCard({
  title,
  actionLabel,
  actionHref,
  children,
  className = "",
}: {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-border bg-surface p-5 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {title}
        </h2>
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className="text-xs font-semibold text-brand hover:text-brand-hover"
          >
            {actionLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
