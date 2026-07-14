import Link from "next/link";
import { notFound } from "next/navigation";
import { celulaKey, DIAS_UI, SLOTS } from "@/lib/kaha/grade";
import {
  listarSessoesSemana,
  obterProfessor,
  type SessaoAgenda,
} from "@/lib/kaha/professores";
import {
  DesativarProfessorButton,
  EditarProfessorButton,
} from "../professor-form";
import { GradeEditor } from "./grade-editor";

export const dynamic = "force-dynamic";

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const a = partes[0]?.[0] ?? "";
  const b = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (a + b).toUpperCase() || "?";
}

export default async function ProfessorDetalhePage({
  params,
}: {
  params: { id: string };
}) {
  const dados = await obterProfessor(params.id);
  if (!dados) notFound();
  const { professor, horarios } = dados;
  const sessoes = await listarSessoesSemana(params.id);

  const horariosSet = new Set(
    horarios.map((h) => celulaKey(h.dia_semana, h.hora)),
  );
  const sessoesMap = new Map<string, SessaoAgenda>();
  for (const s of sessoes) sessoesMap.set(celulaKey(s.dia_semana, s.hora), s);

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <Link
        href="/professores"
        className="text-xs font-medium uppercase tracking-wide text-muted-2 hover:text-muted"
      >
        ← Professores
      </Link>

      <header className="mb-8 mt-3 flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-lg font-bold text-text">
          {iniciais(professor.nome)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-text">
            {professor.nome}
          </h1>
          <p className="truncate text-sm text-muted">
            {professor.especialidade || "Sem especialidade"}
          </p>
          {professor.telefone && (
            <p className="mt-0.5 text-xs text-muted-2">
              WhatsApp {professor.telefone}
            </p>
          )}
          {!professor.ativo && (
            <span className="mt-1 inline-block rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-2">
              Inativo
            </span>
          )}
        </div>
      </header>

      <div className="mb-8 flex gap-3">
        <EditarProfessorButton professor={professor} />
        <DesativarProfessorButton id={professor.id} />
      </div>

      {/* Passo 4 — editor da grade */}
      <section className="mb-10">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Grade de horários
        </h2>
        <p className="mb-3 text-xs text-muted-2">
          Toque numa célula para marcar quando o professor atende.
        </p>
        <GradeEditor
          professorId={professor.id}
          horariosIniciais={horarios}
        />
      </section>

      {/* Passo 5 — agenda semanal (leitura, do banco) */}
      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Agenda da semana
        </h2>
        <p className="mb-3 text-xs text-muted-2">
          Nos horários da grade: verde = livre, vermelho = ocupado.
        </p>

        <div className="-mx-5 overflow-x-auto px-5 pb-1">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] gap-1">
              <div />
              {DIAS_UI.map((d) => (
                <div
                  key={d.dia}
                  className="pb-1 text-center text-xs font-semibold text-muted"
                >
                  {d.label}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              {SLOTS.map((slot) => (
                <div
                  key={slot}
                  className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] gap-1"
                >
                  <div className="flex items-center text-[11px] tabular-nums text-muted-2">
                    {slot}
                  </div>
                  {DIAS_UI.map((d) => {
                    const key = celulaKey(d.dia, slot);
                    const temHorario = horariosSet.has(key);
                    const sessao = sessoesMap.get(key);

                    if (temHorario && sessao) {
                      // Ocupada — link para o aluno fica inerte até a B3.
                      return (
                        <span
                          key={d.dia}
                          title={`${sessao.aluno_nome} · ${sessao.estado}`}
                          className="flex h-9 items-center justify-center truncate rounded-md border border-risk/40 bg-risk/15 px-1 text-[10px] font-medium text-risk"
                        >
                          {sessao.aluno_nome}
                        </span>
                      );
                    }
                    if (temHorario) {
                      return (
                        <span
                          key={d.dia}
                          className="flex h-9 items-center justify-center rounded-md border border-ok/40 bg-ok/15 text-[10px] font-semibold text-ok"
                        >
                          LIVRE
                        </span>
                      );
                    }
                    return (
                      <span
                        key={d.dia}
                        className="flex h-9 items-center justify-center rounded-md border border-dashed border-border text-muted-2/40"
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legenda dos três estados */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-ok/40 bg-ok/15" />
            Livre
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-risk/40 bg-risk/15" />
            Ocupada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-dashed border-border" />
            Fora do expediente
          </span>
        </div>
      </section>
    </main>
  );
}
