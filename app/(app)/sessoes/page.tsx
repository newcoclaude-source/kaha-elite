import Link from "next/link";
import {
  horariosLivres,
  listarAlunosSemSessao,
  listarSessoesDaSemana,
  semanaComOffset,
  semanaRef,
  type SessaoBoard,
} from "@/lib/kaha/sessoes";
import { NOME_DIA, ordemDia } from "@/lib/kaha/ui";
import { SemaforoUso } from "../alunos/semaforo-uso";
import { MarcarSessao } from "./marcar-sessao";
import { SessaoItem } from "./sessao-item";

export const dynamic = "force-dynamic";

function ehSemana(v: string | undefined): string {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? semanaRef(new Date(v + "T12:00:00Z")) : semanaRef();
}

function rotuloSemana(semana: string): string {
  const ini = new Date(semana + "T12:00:00Z");
  const fim = new Date(ini);
  fim.setUTCDate(fim.getUTCDate() + 6);
  const f = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
  return `${f(ini)} – ${f(fim)}`;
}

export default async function SessoesPage({
  searchParams,
}: {
  searchParams: { semana?: string };
}) {
  const semana = ehSemana(searchParams.semana);
  const [sessoes, fila, livres] = await Promise.all([
    listarSessoesDaSemana(semana),
    listarAlunosSemSessao(semana),
    horariosLivres(semana),
  ]);

  // Agrupa sessões por dia (ordem Seg…Dom).
  const porDia = new Map<number, SessaoBoard[]>();
  for (const s of sessoes) {
    const arr = porDia.get(s.dia_semana) ?? [];
    arr.push(s);
    porDia.set(s.dia_semana, arr);
  }
  const dias = [...porDia.keys()].sort((a, b) => ordemDia(a) - ordemDia(b));

  const semanaAtual = semanaRef();
  const anterior = semanaComOffset(semana, -1);
  const proxima = semanaComOffset(semana, 1);

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <header className="mb-5">
        <Link
          href="/"
          className="text-xs font-medium uppercase tracking-wide text-muted-2 hover:text-muted"
        >
          ← Kaha Elite
        </Link>
        <h1 className="title-brand mt-1 text-4xl">
          Ses<span className="text-brand">sões</span>
        </h1>
      </header>

      {/* Seletor de semana */}
      <div className="mb-6 flex items-center justify-between rounded-xl border border-border bg-surface px-2 py-2">
        <Link
          href={`/sessoes?semana=${anterior}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-text"
          aria-label="Semana anterior"
        >
          ‹
        </Link>
        <div className="text-center">
          <p className="text-sm font-semibold text-text">{rotuloSemana(semana)}</p>
          {semana !== semanaAtual && (
            <Link href="/sessoes" className="text-[11px] text-brand hover:underline">
              voltar para esta semana
            </Link>
          )}
        </div>
        <Link
          href={`/sessoes?semana=${proxima}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-text"
          aria-label="Próxima semana"
        >
          ›
        </Link>
      </div>

      {/* Sessões da semana */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Sessões da semana
        </h2>
        {sessoes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface/50 py-6 text-center text-sm text-muted-2">
            Nenhuma sessão marcada nesta semana.
          </p>
        ) : (
          <div className="space-y-5">
            {dias.map((dia) => (
              <div key={dia}>
                <p className="mb-2 text-xs font-semibold text-muted-2">
                  {NOME_DIA[dia]}
                </p>
                <div className="space-y-2">
                  {(porDia.get(dia) ?? []).map((s) => (
                    <SessaoItem key={s.id} sessao={s} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sem sessão essa semana */}
      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Sem sessão essa semana
        </h2>
        <p className="mb-3 text-xs text-muted-2">
          Fila de resgate — mais frios primeiro.
        </p>
        {fila.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface/50 py-6 text-center text-sm text-muted-2">
            Todos os alunos ativos já têm sessão nesta semana. 🎯
          </p>
        ) : (
          <ul className="space-y-2">
            {fila.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/alunos/${a.id}`}
                    className="truncate font-semibold text-text hover:text-brand"
                  >
                    {a.nome}
                  </Link>
                  <div className="mt-1">
                    <SemaforoUso sessoes={a.sessoes_4sem} />
                  </div>
                </div>
                <MarcarSessao
                  aluno={{ id: a.id, nome: a.nome }}
                  semanaRef={semana}
                  slots={livres}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
