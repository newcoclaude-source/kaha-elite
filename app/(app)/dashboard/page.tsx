import Link from "next/link";
import { Icon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const ATALHOS = [
  { href: "/sessoes", icon: "sessoes" as const, label: "Sessões da semana", desc: "Marcar e executar treinos" },
  { href: "/alunos", icon: "alunos" as const, label: "Alunos", desc: "Fichas, cargas e semáforo" },
  { href: "/professores", icon: "professores" as const, label: "Professores", desc: "Grade de horários" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="title-brand text-4xl">
          Dash<span className="text-brand">board</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          O painel completo — números, atenção e feed — chega no próximo bloco.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ATALHOS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-muted-2"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
              <Icon name={a.icon} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-text">{a.label}</p>
              <p className="truncate text-xs text-muted">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
