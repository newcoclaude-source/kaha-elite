import Link from "next/link";
import { listarProfessores } from "@/lib/kaha/professores";
import { NovoProfessorButton } from "./professor-form";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const a = partes[0]?.[0] ?? "";
  const b = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (a + b).toUpperCase() || "?";
}

export default async function ProfessoresPage() {
  const professores = await listarProfessores();

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-medium uppercase tracking-wide text-muted-2 hover:text-muted"
            >
              ← Kaha Elite
            </Link>
            <span className="text-muted-2">·</span>
            <LogoutButton />
          </div>
          <h1 className="title-brand text-4xl">
            Profes<span className="text-brand">sores</span>
          </h1>
        </div>
        <NovoProfessorButton />
      </header>

      {professores.length === 0 ? (
        <div className="mt-16 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm text-muted">
            Cadastre o primeiro professor para montar a grade.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {professores.map((p) => (
            <li key={p.id}>
              <Link
                href={`/professores/${p.id}`}
                className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-muted-2"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-sm font-bold text-text">
                  {iniciais(p.nome)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text">{p.nome}</p>
                  <p className="truncate text-sm text-muted">
                    {p.especialidade || "Sem especialidade"}
                  </p>
                  <div className="mt-1.5 flex gap-3 text-xs text-muted-2">
                    <span>
                      <span className="font-semibold text-muted">
                        {p.horarios_count}
                      </span>{" "}
                      {p.horarios_count === 1 ? "horário" : "horários"}
                    </span>
                    <span>
                      <span className="font-semibold text-muted">
                        {p.sessoes_semana}
                      </span>{" "}
                      {p.sessoes_semana === 1 ? "sessão" : "sessões"}/sem
                    </span>
                  </div>
                </div>
                <span className="text-muted-2">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
