import Link from "next/link";
import { notFound } from "next/navigation";
import { obterAluno } from "@/lib/kaha/alunos";
import { ultimaCargaPorExercicio } from "@/lib/kaha/cargas";
import { diasPara, formatarData, formatBRL, iniciais, STATUS } from "@/lib/kaha/ui";
import {
  DesativarAlunoButton,
  EditarAlunoButton,
} from "../aluno-form";
import { SemaforoUso } from "../semaforo-uso";

export const dynamic = "force-dynamic";

function renovaEm(vencimento: string | null): string {
  const d = diasPara(vencimento);
  if (d === null) return "sem data";
  if (d < 0) return `vencido há ${Math.abs(d)} ${Math.abs(d) === 1 ? "dia" : "dias"}`;
  if (d === 0) return "vence hoje";
  return `em ${d} ${d === 1 ? "dia" : "dias"}`;
}

export default async function AlunoPage({
  params,
}: {
  params: { id: string };
}) {
  const dados = await obterAluno(params.id);
  if (!dados) notFound();
  const { aluno, ficha, exercicios } = dados;
  const st = STATUS[aluno.semaforo];
  const ultimaCarga = await ultimaCargaPorExercicio(aluno.id);

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <Link
        href="/alunos"
        className="text-xs font-medium uppercase tracking-wide text-muted-2 hover:text-muted"
      >
        ← Alunos
      </Link>

      {/* Cabeçalho */}
      <header className="mb-6 mt-3 flex items-start gap-4">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border text-lg font-bold ${st.avatar}`}
        >
          {iniciais(aluno.nome)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-text">{aluno.nome}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.chip}`}
            >
              {st.label}
            </span>
            <SemaforoUso sessoes={aluno.sessoes_4sem} />
          </div>
        </div>
      </header>

      <div className="mb-8 flex gap-3">
        <EditarAlunoButton
          aluno={{
            id: aluno.id,
            nome: aluno.nome,
            telefone: aluno.telefone,
            objetivo: aluno.objetivo,
            vencimento: aluno.vencimento,
            valor_mensal: aluno.valor_mensal,
          }}
        />
        <DesativarAlunoButton id={aluno.id} />
      </div>

      {/* Dados do plano */}
      <section className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Dados do plano
        </h2>
        <dl className="space-y-2.5 text-sm">
          <Linha rotulo="WhatsApp">
            {aluno.telefone ? (
              <a
                href={`https://wa.me/${aluno.telefone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text underline decoration-muted-2 underline-offset-2 hover:decoration-text"
              >
                {aluno.telefone}
              </a>
            ) : (
              <span className="text-muted-2">—</span>
            )}
          </Linha>
          <Linha rotulo="Objetivo">
            {aluno.objetivo || <span className="text-muted-2">—</span>}
          </Linha>
          <Linha rotulo="Renova">{renovaEm(aluno.vencimento)}</Linha>
          <Linha rotulo="Valor">{formatBRL(aluno.valor_mensal)}/mês</Linha>
        </dl>
      </section>

      {/* Ficha de treino */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Ficha de treino
        </h2>

        {ficha ? (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-text">
                  {ficha.objetivo || "Treino"}
                </p>
                {ficha.divisao && (
                  <p className="text-sm text-muted">Divisão {ficha.divisao}</p>
                )}
              </div>
              <Link
                href={`/alunos/${aluno.id}/ficha`}
                className="shrink-0 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text transition-colors hover:border-muted-2"
              >
                Editar ficha
              </Link>
            </div>

            {exercicios.length === 0 ? (
              <p className="text-sm text-muted-2">Nenhum exercício ainda.</p>
            ) : (
              <ul className="divide-y divide-border">
                {exercicios.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">
                        {e.nome}
                      </p>
                      <p className="text-xs text-muted">
                        {[
                          e.series != null && e.reps_alvo
                            ? `${e.series}×${e.reps_alvo}`
                            : e.series != null
                              ? `${e.series} séries`
                              : e.reps_alvo || "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                    </div>
                    {e.carga_alvo && (
                      <span className="shrink-0 rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs text-muted">
                        {e.carga_alvo}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-warn/40 bg-warn/10 p-5 text-center">
            <p className="mb-4 text-sm font-medium text-warn">
              Sem ficha cadastrada
            </p>
            <Link
              href={`/alunos/${aluno.id}/ficha`}
              className="inline-block rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Montar treino agora
            </Link>
          </div>
        )}
      </section>

      {/* Cargas — última registrada por exercício (fecha o ciclo montar→executar) */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Cargas
        </h2>
        {exercicios.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface/50 py-5 text-center text-sm text-muted-2">
            Sem ficha para acompanhar cargas.
          </p>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <ul className="divide-y divide-border">
              {exercicios.map((e) => {
                const u = ultimaCarga.get(e.nome.toLowerCase());
                return (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="min-w-0 truncate text-sm text-text">
                      {e.nome}
                    </span>
                    {u && u.carga != null ? (
                      <span className="shrink-0 text-right text-xs text-muted">
                        <span className="font-semibold text-text">
                          {u.carga}kg
                        </span>
                        {u.reps != null && ` × ${u.reps}`}
                        <span className="ml-1 text-muted-2">
                          · {formatarData(u.data)}
                        </span>
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-2">
                        sem registro
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* A semana dele — chega no B5/B6 */}
      <section className="rounded-2xl border border-dashed border-border bg-surface/50 p-4">
        <p className="text-sm font-medium text-muted">A semana dele</p>
        <p className="mt-1 text-xs text-muted-2">em breve</p>
      </section>
    </main>
  );
}

function Linha({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-2">{rotulo}</dt>
      <dd className="text-right text-text">{children}</dd>
    </div>
  );
}
