"use client";

// Wizard de onboarding self-service. 4 passos, todos puláveis, mobile-first,
// design system do D0. Fora do shell (sem sidebar). Sem ToastProvider aqui, então
// feedback de erro é inline. O passo 4 (importar) vem no import-alunos.tsx.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import type { SetupData } from "@/lib/kaha/onboarding";
import { ImportarAlunos } from "./import-alunos";
import {
  concluirOnboarding,
  criarPlano,
  criarProfessor,
  removerPlano,
  removerProfessor,
  salvarAcademia,
} from "./actions";

const PASSOS = ["Academia", "Planos", "Professores", "Alunos"] as const;

export function Wizard({ inicial, preview }: { inicial: SetupData; preview: boolean }) {
  const router = useRouter();
  const [passo, setPasso] = useState(0);
  const [concluindo, iniciarConclusao] = useTransition();

  function avancar() {
    setPasso((p) => Math.min(p + 1, PASSOS.length - 1));
  }
  function voltar() {
    setPasso((p) => Math.max(p - 1, 0));
  }
  function concluir() {
    iniciarConclusao(async () => {
      await concluirOnboarding();
      router.replace("/agenda");
      router.refresh();
    });
  }

  const ultimo = passo === PASSOS.length - 1;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 py-8">
      {/* marca */}
      <div className="mb-6 flex items-center gap-2.5">
        <div className="grid h-9 w-9 place-items-center rounded-[9px] bg-brand font-display text-lg font-black italic text-white">
          K
        </div>
        <div>
          <div className="font-display text-[15px] font-extrabold italic uppercase leading-none">
            CT Kaha
          </div>
          <div className="text-[9.5px] uppercase tracking-[0.14em] text-muted">
            Configuração inicial
          </div>
        </div>
        {preview && (
          <span className="ml-auto rounded-full bg-warn-soft px-2 py-1 text-[10px] font-bold text-warn">
            pré-visualização
          </span>
        )}
      </div>

      {/* progresso */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-bold">{PASSOS[passo]}</span>
          <span className="text-[11.5px] text-muted">
            Passo {passo + 1} de {PASSOS.length}
          </span>
        </div>
        <div className="flex gap-1.5">
          {PASSOS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= passo ? "bg-brand" : "bg-line-2"}`}
            />
          ))}
        </div>
      </div>

      {/* conteúdo do passo */}
      <div className="flex-1">
        {passo === 0 && <PassoAcademia inicial={inicial} onOk={avancar} />}
        {passo === 1 && <PassoPlanos inicial={inicial} />}
        {passo === 2 && <PassoProfessores inicial={inicial} />}
        {passo === 3 && <ImportarAlunos planos={inicial.planos} />}
      </div>

      {/* navegação */}
      <div className="mt-6 flex items-center gap-3 border-t border-line pt-4">
        {passo > 0 ? (
          <button
            type="button"
            onClick={voltar}
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink-2 hover:border-muted-2"
          >
            Voltar
          </button>
        ) : (
          <span />
        )}
        <div className="ml-auto flex items-center gap-3">
          {!ultimo && (
            <button
              type="button"
              onClick={avancar}
              className="text-sm font-semibold text-muted hover:text-ink"
            >
              Pular
            </button>
          )}
          {ultimo ? (
            <button
              type="button"
              onClick={concluir}
              disabled={concluindo}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {concluindo ? "Concluindo…" : "Concluir configuração"}
            </button>
          ) : (
            <button
              type="button"
              onClick={avancar}
              className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Continuar
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

// ── Passo 1 · Academia ───────────────────────────────────────────────────────
function PassoAcademia({ inicial, onOk }: { inicial: SetupData; onOk: () => void }) {
  const router = useRouter();
  const [nome, setNome] = useState(inicial.config.academia_nome ?? "");
  const [horarios, setHorarios] = useState(inicial.config.academia_horarios ?? "");
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    setErro(null);
    start(async () => {
      const r = await salvarAcademia({ nome, horarios });
      if (r.ok) {
        router.refresh();
        onOk();
      } else setErro(r.erro ?? "Não foi possível salvar.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted">
        Comece pelo básico da sua academia. Dá pra ajustar depois em Configurações.
      </p>
      <Campo label="Nome da academia">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: CT Kaha"
          className="w-full rounded-[10px] border border-line px-3 py-2.5 text-sm outline-none focus:border-muted-2"
        />
      </Campo>
      <Campo label="Horário de funcionamento">
        <textarea
          value={horarios}
          onChange={(e) => setHorarios(e.target.value)}
          placeholder="Ex.: Seg a Sex 6h–22h · Sáb 8h–13h"
          rows={2}
          className="w-full resize-none rounded-[10px] border border-line px-3 py-2.5 text-sm outline-none focus:border-muted-2"
        />
      </Campo>
      {erro && <p className="text-xs text-risk">{erro}</p>}
      <button
        type="button"
        onClick={salvar}
        disabled={pending}
        className="self-start rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar"}
      </button>
    </div>
  );
}

// ── Passo 2 · Planos ─────────────────────────────────────────────────────────
function PassoPlanos({ inicial }: { inicial: SetupData }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [meta, setMeta] = useState("3");
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function add() {
    setErro(null);
    const m = parseInt(meta, 10);
    start(async () => {
      const r = await criarPlano({ nome, meta_semanal: m });
      if (r.ok) {
        setNome("");
        setMeta("3");
        router.refresh();
      } else setErro(r.erro ?? "Não foi possível criar.");
    });
  }
  function remover(id: string) {
    start(async () => {
      await removerPlano(id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted">
        Cada aluno segue um plano com uma meta de treinos por semana. A capacidade da
        academia é a soma das metas.
      </p>

      <div className="flex flex-col gap-2">
        {inicial.planos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted-2">
            Nenhum plano ainda. Adicione o primeiro abaixo.
          </p>
        ) : (
          inicial.planos.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.nome}</div>
                <div className="text-[11.5px] text-muted">
                  {p.meta_semanal}× por semana
                </div>
              </div>
              <button
                type="button"
                onClick={() => remover(p.id)}
                disabled={pending}
                className="text-muted-2 hover:text-risk"
                aria-label="Remover plano"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="rounded-xl border border-line bg-surface-2 p-3">
        <div className="flex gap-2">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do plano (ex.: Elite)"
            className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-muted-2"
          />
          <input
            value={meta}
            onChange={(e) => setMeta(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className="w-16 rounded-lg border border-line px-2 py-2 text-center text-sm outline-none focus:border-muted-2"
            aria-label="Meta semanal"
          />
          <button
            type="button"
            onClick={add}
            disabled={pending}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            Adicionar
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-2">Meta = treinos por semana.</p>
        {erro && <p className="mt-1 text-xs text-risk">{erro}</p>}
      </div>
    </div>
  );
}

// ── Passo 3 · Professores ────────────────────────────────────────────────────
function PassoProfessores({ inicial }: { inicial: SetupData }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [esp, setEsp] = useState("");
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function add() {
    setErro(null);
    start(async () => {
      const r = await criarProfessor({ nome, especialidade: esp });
      if (r.ok) {
        setNome("");
        setEsp("");
        router.refresh();
      } else setErro(r.erro ?? "Não foi possível adicionar.");
    });
  }
  function remover(id: string) {
    start(async () => {
      await removerProfessor(id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted">
        Quem dá os treinos. Você monta a grade de horários de cada um depois, em
        Professores.
      </p>

      <div className="flex flex-col gap-2">
        {inicial.professores.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted-2">
            Nenhum professor ainda.
          </p>
        ) : (
          inicial.professores.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.nome}</div>
                {p.especialidade && (
                  <div className="truncate text-[11.5px] text-muted">
                    {p.especialidade}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => remover(p.id)}
                disabled={pending}
                className="text-muted-2 hover:text-risk"
                aria-label="Remover professor"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="rounded-xl border border-line bg-surface-2 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome"
            className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-muted-2"
          />
          <input
            value={esp}
            onChange={(e) => setEsp(e.target.value)}
            placeholder="Especialidade (opcional)"
            className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-muted-2"
          />
          <button
            type="button"
            onClick={add}
            disabled={pending}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            Adicionar
          </button>
        </div>
        {erro && <p className="mt-1 text-xs text-risk">{erro}</p>}
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-ink-2">{label}</span>
      {children}
    </label>
  );
}
