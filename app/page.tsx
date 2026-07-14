import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-12">
      <header className="space-y-3">
        <span className="inline-block rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted">
          CT Kaha · Jundiaí
        </span>
        <h1 className="title-brand text-5xl">
          Kaha <span className="text-brand">Elite</span>
        </h1>
        <p className="text-muted">
          Gestão e <span className="font-semibold text-text">presença</span> do
          plano Elite. Cada aluno, uma sessão por semana — e ninguém fica para
          trás.
        </p>
      </header>

      {/* Amostra do semáforo de uso (últimas 4 semanas) */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-2">
          Semáforo de presença
        </h2>
        <ul className="space-y-2">
          {[
            { nome: "3+ sessões", cor: "bg-ok", label: "Em dia" },
            { nome: "2 sessões", cor: "bg-warn", label: "Atenção" },
            { nome: "≤1 sessão", cor: "bg-risk", label: "Risco" },
          ].map((s) => (
            <li
              key={s.nome}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${s.cor}`} />
                <span className="text-sm text-text">{s.nome}</span>
              </div>
              <span className="text-xs text-muted">{s.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="space-y-3">
        <Link
          href="/sessoes"
          className="block rounded-xl bg-brand px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          Sessões da semana
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/alunos"
            className="rounded-xl border border-border px-4 py-3 text-center text-sm font-semibold text-text transition-colors hover:border-muted-2"
          >
            Alunos
          </Link>
          <Link
            href="/professores"
            className="rounded-xl border border-border px-4 py-3 text-center text-sm font-semibold text-text transition-colors hover:border-muted-2"
          >
            Professores
          </Link>
        </div>
      </div>
    </main>
  );
}
