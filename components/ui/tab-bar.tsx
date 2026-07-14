"use client";

// TabBar — abas internas de página (ex.: perfil do aluno), via query param.

import Link from "next/link";

export type Tab = { key: string; label: string; href: string };

export function TabBar({
  tabs,
  activeKey,
  className = "",
}: {
  tabs: Tab[];
  activeKey: string;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1 ${className}`}
      role="tablist"
    >
      {tabs.map((t) => {
        const ativo = t.key === activeKey;
        return (
          <Link
            key={t.key}
            href={t.href}
            role="tab"
            aria-selected={ativo}
            scroll={false}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-center text-sm font-semibold transition-colors ${
              ativo
                ? "bg-surface-2 text-text"
                : "text-muted hover:text-text"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
