import Link from "next/link";
import {
  contarAlunos,
  listarAlunos,
  type FiltroAluno,
} from "@/lib/kaha/alunos";
import { NovoAlunoButton } from "./aluno-form";
import { ListaAlunos } from "./lista";

export const dynamic = "force-dynamic";

const FILTROS: { chave: FiltroAluno; label: string }[] = [
  { chave: "todos", label: "Todos" },
  { chave: "sem_ficha", label: "Sem ficha" },
  { chave: "risco", label: "Em risco" },
  { chave: "em_ritmo", label: "Em ritmo" },
];

function ehFiltro(v: string | undefined): FiltroAluno {
  return v === "sem_ficha" || v === "risco" || v === "em_ritmo"
    ? v
    : "todos";
}

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: { f?: string };
}) {
  const filtro = ehFiltro(searchParams.f);
  const [alunos, contagens] = await Promise.all([
    listarAlunos({ filtro }),
    contarAlunos(),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/"
            className="text-xs font-medium uppercase tracking-wide text-muted-2 hover:text-muted"
          >
            ← Kaha Elite
          </Link>
          <h1 className="title-brand text-4xl">
            Alu<span className="text-brand">nos</span>
          </h1>
        </div>
        <NovoAlunoButton />
      </header>

      {contagens.todos === 0 ? (
        <div className="mt-16 space-y-5 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm text-muted">
            Cadastre o primeiro aluno do Elite.
          </p>
          <div className="flex justify-center">
            <NovoAlunoButton />
          </div>
        </div>
      ) : (
        <>
          {/* Filtros */}
          <nav className="mb-5 flex flex-wrap gap-2">
            {FILTROS.map((f) => {
              const ativo = f.chave === filtro;
              const n = contagens[f.chave];
              return (
                <Link
                  key={f.chave}
                  href={f.chave === "todos" ? "/alunos" : `/alunos?f=${f.chave}`}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    ativo
                      ? "border-brand bg-brand text-white"
                      : "border-border bg-surface text-muted hover:text-text"
                  }`}
                >
                  {f.label}
                  <span
                    className={`rounded-full px-1.5 text-[10px] ${
                      ativo ? "bg-white/20" : "bg-surface-2 text-muted-2"
                    }`}
                  >
                    {n}
                  </span>
                </Link>
              );
            })}
          </nav>

          <ListaAlunos alunos={alunos} />
        </>
      )}
    </main>
  );
}
