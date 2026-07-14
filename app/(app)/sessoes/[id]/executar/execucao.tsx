"use client";

// Tela de EXECUÇÃO (UI-2) — padrão Hevy Coach. Professor em pé, no treino.
// Última performance por exercício, progresso, PR badge, card colapsa ao concluir,
// salvar contínuo (debounce+blur). Concluir abre o questionário do professor.

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ExecucaoSessao } from "@/lib/kaha/cargas";
import type { FeedbackProfessor } from "@/lib/kaha/feedbacks";
import { useToast } from "@/components/ui/toast";
import { concluirSessaoAction, registrarCargaAction } from "../../actions";
import { QuestionarioProfessor } from "./questionario-professor";

type Row = { serie: number; reps: string; carga: string };
type Ex = {
  id: string;
  nome: string;
  meta: string;
  ultimaTexto: string | null;
  ultimaCarga: number | null;
  rows: Row[];
};

function metaLinha(e: ExecucaoSessao["exercicios"][number]): string {
  const alvo = e.carga_alvo ? ` · alvo ${e.carga_alvo}` : "";
  const series = e.series_meta != null ? e.series_meta : "–";
  const reps = e.reps_alvo ?? "–";
  return `${series}×${reps}${alvo}`;
}

function ultimaTexto(
  u: ExecucaoSessao["exercicios"][number]["ultima"],
): string | null {
  if (!u || u.carga == null) return null;
  const reps = u.reps != null ? ` · ${u.reps} reps` : "";
  return `última vez: ${u.carga}kg${reps}`;
}

function seedRows(e: ExecucaoSessao["exercicios"][number]): Row[] {
  const total = Math.max(e.registros.length, e.series_meta ?? 0, 1);
  const rows: Row[] = [];
  for (let n = 1; n <= total; n++) {
    const r = e.registros.find((x) => x.serie === n);
    rows.push({
      serie: n,
      reps: r?.reps != null ? String(r.reps) : "",
      carga: r?.carga != null ? String(r.carga) : "",
    });
  }
  return rows;
}

function num(s: string): number | null {
  if (s.trim() === "") return null;
  const v = parseFloat(s.replace(",", "."));
  return Number.isNaN(v) ? null : v;
}

export function Execucao({ execucao }: { execucao: ExecucaoSessao }) {
  const router = useRouter();
  const { toast } = useToast();
  const sessaoId = execucao.sessao.id;
  const [pendingConcluir, startConcluir] = useTransition();
  const [sheetAberto, setSheetAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [exercicios, setExercicios] = useState<Ex[]>(() =>
    execucao.exercicios.map((e) => ({
      id: e.id,
      nome: e.nome,
      meta: metaLinha(e),
      ultimaTexto: ultimaTexto(e.ultima),
      ultimaCarga: e.ultima?.carga ?? null,
      rows: seedRows(e),
    })),
  );
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());

  const ref = useRef(exercicios);
  useEffect(() => {
    ref.current = exercicios;
  }, [exercicios]);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [status, setStatus] = useState<
    Record<string, "salvando" | "salvo" | "erro">
  >({});

  const total = exercicios.length;
  const feitos = colapsados.size;

  function editar(exId: string, serie: number, campo: "reps" | "carga", valor: string) {
    setExercicios((prev) =>
      prev.map((e) =>
        e.id !== exId
          ? e
          : {
              ...e,
              rows: e.rows.map((r) =>
                r.serie === serie ? { ...r, [campo]: valor } : r,
              ),
            },
      ),
    );
    agendar(exId, serie);
  }

  function agendar(exId: string, serie: number) {
    const key = `${exId}:${serie}`;
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => salvar(exId, serie), 700);
  }

  function flush(exId: string, serie: number) {
    const key = `${exId}:${serie}`;
    if (timers.current[key]) {
      clearTimeout(timers.current[key]);
      delete timers.current[key];
    }
    salvar(exId, serie);
  }

  async function salvar(exId: string, serie: number) {
    const ex = ref.current.find((e) => e.id === exId);
    const row = ex?.rows.find((r) => r.serie === serie);
    if (!row) return;
    const reps = num(row.reps);
    const carga = num(row.carga);
    if (reps === null && carga === null) return;

    const key = `${exId}:${serie}`;
    setStatus((s) => ({ ...s, [key]: "salvando" }));
    const res = await registrarCargaAction({
      sessao_id: sessaoId,
      exercicio_id: exId,
      serie,
      reps: reps === null ? null : Math.round(reps),
      carga,
    });
    setStatus((s) => ({ ...s, [key]: res.ok ? "salvo" : "erro" }));
  }

  function adicionarSerie(exId: string) {
    setExercicios((prev) =>
      prev.map((e) =>
        e.id !== exId
          ? e
          : { ...e, rows: [...e.rows, { serie: e.rows.length + 1, reps: "", carga: "" }] },
      ),
    );
  }

  function toggleColapso(exId: string) {
    setColapsados((prev) => {
      const next = new Set(prev);
      if (next.has(exId)) next.delete(exId);
      else next.add(exId);
      return next;
    });
  }

  function concluir(feedback: FeedbackProfessor | null) {
    startConcluir(async () => {
      const res = await concluirSessaoAction(sessaoId, feedback);
      if (res.ok) {
        toast("Sessão concluída");
        router.push("/sessoes");
        router.refresh();
      } else {
        setErro(res.erro ?? "Não foi possível concluir.");
        setSheetAberto(false);
      }
    });
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 pb-28 pt-6 lg:px-8">
      {/* Cabeçalho: aluno + progresso */}
      <header className="mb-6">
        <button
          type="button"
          onClick={() => router.push("/sessoes")}
          className="text-xs font-medium uppercase tracking-wide text-muted-2 hover:text-muted"
        >
          ← Sessões
        </button>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-text">
              {execucao.sessao.aluno_nome}
            </h1>
            <p className="truncate text-sm text-muted">
              {execucao.sessao.aluno_objetivo ||
                execucao.sessao.ficha_objetivo ||
                "Treino"}
            </p>
          </div>
          {total > 0 && (
            <span className="shrink-0 text-sm font-semibold tabular-nums text-muted">
              <span className="text-text">{feitos}</span>/{total} exercícios
            </span>
          )}
        </div>
        {total > 0 && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${(feitos / total) * 100}%` }}
            />
          </div>
        )}
      </header>

      {execucao.exercicios.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface/50 py-8 text-center text-sm text-muted">
          Este aluno ainda não tem ficha de treino cadastrada.
        </p>
      ) : (
        <div className="space-y-3">
          {exercicios.map((e) => {
            const colapsado = colapsados.has(e.id);
            const cargas = e.rows
              .map((r) => num(r.carga))
              .filter((c): c is number => c != null);
            const maiorCarga = cargas.length ? Math.max(...cargas) : null;
            const temPR =
              e.ultimaCarga != null &&
              maiorCarga != null &&
              maiorCarga > e.ultimaCarga;
            const preenchidas = cargas.length;

            if (colapsado) {
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => toggleColapso(e.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-ok/30 bg-ok/5 p-4 text-left"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ok/20 text-xs text-ok">
                    ✓
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text">
                      {e.nome}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {preenchidas} {preenchidas === 1 ? "série" : "séries"}
                      {maiorCarga != null && ` · ${maiorCarga}kg`}
                    </p>
                  </div>
                  {temPR && <PRBadge />}
                </button>
              );
            }

            return (
              <div
                key={e.id}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-text">{e.nome}</p>
                    <p className="text-xs text-muted">{e.meta}</p>
                    {e.ultimaTexto && (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-confirmed/10 px-1.5 py-0.5 text-xs text-confirmed">
                        {e.ultimaTexto}
                      </p>
                    )}
                  </div>
                  {temPR && <PRBadge />}
                </div>

                <div className="space-y-2">
                  {e.rows.map((r) => {
                    const key = `${e.id}:${r.serie}`;
                    const c = num(r.carga);
                    const rowPR =
                      e.ultimaCarga != null && c != null && c > e.ultimaCarga;
                    return (
                      <div key={r.serie} className="flex items-center gap-2">
                        <span className="w-14 shrink-0 text-xs font-semibold text-muted-2">
                          Série {r.serie}
                        </span>
                        <input
                          value={r.reps}
                          onChange={(ev) =>
                            editar(e.id, r.serie, "reps", ev.target.value)
                          }
                          onBlur={() => flush(e.id, r.serie)}
                          inputMode="numeric"
                          placeholder="reps"
                          className="input min-h-[48px] text-center"
                        />
                        <input
                          value={r.carga}
                          onChange={(ev) =>
                            editar(e.id, r.serie, "carga", ev.target.value)
                          }
                          onBlur={() => flush(e.id, r.serie)}
                          inputMode="decimal"
                          placeholder="carga"
                          className="input min-h-[48px] text-center"
                        />
                        <span className="w-10 shrink-0 text-center text-[10px]">
                          {rowPR ? (
                            <span className="font-bold text-ok">PR↑</span>
                          ) : status[key] === "salvando" ? (
                            <span className="text-muted-2">…</span>
                          ) : status[key] === "salvo" ? (
                            <span className="text-ok">✓</span>
                          ) : status[key] === "erro" ? (
                            <span className="text-risk">!</span>
                          ) : (
                            ""
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => adicionarSerie(e.id)}
                    className="min-h-[44px] flex-1 rounded-xl border border-dashed border-border text-sm font-medium text-muted transition-colors hover:border-muted-2 hover:text-text"
                  >
                    + série
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleColapso(e.id)}
                    disabled={preenchidas === 0}
                    className="min-h-[44px] flex-1 rounded-xl border border-ok/40 text-sm font-semibold text-ok transition-colors hover:bg-ok/10 disabled:opacity-40"
                  >
                    ✓ Concluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {erro && <p className="mt-4 text-sm text-risk">{erro}</p>}

      {/* Concluir sessão — fixo no rodapé (respeita a sidebar no desktop) */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 px-5 py-4 backdrop-blur lg:pl-60">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={() => {
              setErro(null);
              setSheetAberto(true);
            }}
            disabled={pendingConcluir}
            className="min-h-[52px] w-full rounded-xl bg-brand px-4 text-base font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {execucao.sessao.estado === "realizada"
              ? "Sessão concluída ✓ · revisar"
              : "Concluir sessão"}
          </button>
        </div>
      </div>

      {sheetAberto && (
        <QuestionarioProfessor
          alunoNome={execucao.sessao.aluno_nome}
          pending={pendingConcluir}
          onConfirmar={(fb) => concluir(fb)}
          onPular={() => concluir(null)}
          onClose={() => !pendingConcluir && setSheetAberto(false)}
        />
      )}
    </main>
  );
}

function PRBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-ok/40 bg-ok/15 px-2 py-0.5 text-[11px] font-bold text-ok">
      PR ↑
    </span>
  );
}
