"use client";

// Tela de EXECUÇÃO — o professor usa em pé, no meio do treino.
// Salva contínuo (debounce no change + flush no blur). Nunca um form gigante.

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ExecucaoSessao } from "@/lib/kaha/cargas";
import { ESTADO_SESSAO } from "@/lib/kaha/ui";
import { mudarEstadoAction, registrarCargaAction } from "../../actions";

type Row = { serie: number; reps: string; carga: string };
type Ex = {
  id: string;
  nome: string;
  meta: string;
  ultima: string | null;
  rows: Row[];
};

function metaLinha(e: ExecucaoSessao["exercicios"][number]): string {
  const alvo = e.carga_alvo ? ` · alvo ${e.carga_alvo}` : "";
  const series = e.series_meta != null ? e.series_meta : "–";
  const reps = e.reps_alvo ?? "–";
  return `${series}×${reps}${alvo}`;
}

function ultimaLinha(
  u: ExecucaoSessao["exercicios"][number]["ultima"],
): string | null {
  if (!u || u.carga == null) return null;
  const reps = u.reps != null ? ` × ${u.reps}` : "";
  return `da última vez: ${u.carga}kg${reps}`;
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

export function Execucao({ execucao }: { execucao: ExecucaoSessao }) {
  const router = useRouter();
  const sessaoId = execucao.sessao.id;
  const [pendingConcluir, startConcluir] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [exercicios, setExercicios] = useState<Ex[]>(() =>
    execucao.exercicios.map((e) => ({
      id: e.id,
      nome: e.nome,
      meta: metaLinha(e),
      ultima: ultimaLinha(e.ultima),
      rows: seedRows(e),
    })),
  );

  // Espelho em ref para os saves debounced lerem o estado atual.
  const ref = useRef(exercicios);
  useEffect(() => {
    ref.current = exercicios;
  }, [exercicios]);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [status, setStatus] = useState<
    Record<string, "salvando" | "salvo" | "erro">
  >({});

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

    const reps = row.reps.trim() === "" ? null : parseInt(row.reps, 10);
    const carga =
      row.carga.trim() === "" ? null : parseFloat(row.carga.replace(",", "."));
    if (reps === null && carga === null) return; // nada a salvar

    const key = `${exId}:${serie}`;
    setStatus((s) => ({ ...s, [key]: "salvando" }));
    const res = await registrarCargaAction({
      sessao_id: sessaoId,
      exercicio_id: exId,
      serie,
      reps: reps != null && Number.isNaN(reps) ? null : reps,
      carga: carga != null && Number.isNaN(carga) ? null : carga,
    });
    setStatus((s) => ({ ...s, [key]: res.ok ? "salvo" : "erro" }));
  }

  function adicionarSerie(exId: string) {
    setExercicios((prev) =>
      prev.map((e) =>
        e.id !== exId
          ? e
          : {
              ...e,
              rows: [
                ...e.rows,
                { serie: e.rows.length + 1, reps: "", carga: "" },
              ],
            },
      ),
    );
  }

  function concluir() {
    setErro(null);
    startConcluir(async () => {
      const res = await mudarEstadoAction(sessaoId, "realizada");
      if (res.ok) {
        router.push("/sessoes");
        router.refresh();
      } else {
        setErro(res.erro ?? "Não foi possível concluir.");
      }
    });
  }

  const st = ESTADO_SESSAO[execucao.sessao.estado];

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-6">
      {/* Cabeçalho enxuto */}
      <header className="mb-6">
        <button
          type="button"
          onClick={() => router.push("/sessoes")}
          className="text-xs font-medium uppercase tracking-wide text-muted-2 hover:text-muted"
        >
          ← Sessões
        </button>
        <div className="mt-2 flex items-start justify-between gap-3">
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
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.chip}`}
          >
            {st.label}
          </span>
        </div>
      </header>

      {execucao.exercicios.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface/50 py-8 text-center text-sm text-muted">
          Este aluno ainda não tem ficha de treino cadastrada.
        </p>
      ) : (
        <div className="space-y-4">
          {exercicios.map((e) => (
            <div
              key={e.id}
              className="rounded-2xl border border-border bg-surface p-4"
            >
              <div className="mb-3">
                <p className="font-semibold text-text">{e.nome}</p>
                <p className="text-xs text-muted">{e.meta}</p>
                {e.ultima && (
                  <p className="mt-0.5 text-xs text-confirmed">{e.ultima}</p>
                )}
              </div>

              <div className="space-y-2">
                {e.rows.map((r) => {
                  const key = `${e.id}:${r.serie}`;
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
                      <span className="w-10 shrink-0 text-center text-[10px] text-muted-2">
                        {status[key] === "salvando"
                          ? "…"
                          : status[key] === "salvo"
                            ? "✓"
                            : status[key] === "erro"
                              ? "!"
                              : ""}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => adicionarSerie(e.id)}
                className="mt-3 min-h-[44px] w-full rounded-xl border border-dashed border-border text-sm font-medium text-muted transition-colors hover:border-muted-2 hover:text-text"
              >
                + série
              </button>
            </div>
          ))}
        </div>
      )}

      {erro && <p className="mt-4 text-sm text-risk">{erro}</p>}

      {/* Concluir — fixo no rodapé */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-bg/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={concluir}
            disabled={pendingConcluir}
            className="min-h-[52px] w-full rounded-xl bg-brand px-4 text-base font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {pendingConcluir
              ? "Concluindo…"
              : execucao.sessao.estado === "realizada"
                ? "Sessão concluída ✓"
                : "Concluir sessão"}
          </button>
        </div>
      </div>
    </main>
  );
}
