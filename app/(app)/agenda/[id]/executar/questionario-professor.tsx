"use client";

// Questionário do professor — bottom sheet de 4 toques ao concluir a sessão.

import { useState } from "react";
import type {
  Evolucao,
  FeedbackProfessor,
  RiscoPercebido,
} from "@/lib/kaha/feedbacks";

const EVOLUCAO: { valor: Evolucao; label: string }[] = [
  { valor: "evoluiu", label: "Evoluiu" },
  { valor: "manteve", label: "Manteve" },
  { valor: "regrediu", label: "Regrediu" },
];

const RISCO: { valor: RiscoPercebido; label: string; cls: string }[] = [
  { valor: "nao", label: "Não", cls: "border-ok/50 bg-ok/15 text-ok" },
  { valor: "talvez", label: "Talvez", cls: "border-warn/50 bg-warn/15 text-warn" },
  { valor: "sim", label: "Sim", cls: "border-risk/50 bg-risk/15 text-risk" },
];

export function QuestionarioProfessor({
  alunoNome,
  pending,
  onConfirmar,
  onPular,
  onClose,
}: {
  alunoNome: string;
  pending: boolean;
  onConfirmar: (fb: FeedbackProfessor) => void;
  onPular: () => void;
  onClose: () => void;
}) {
  const [empenho, setEmpenho] = useState<number | null>(null);
  const [evolucao, setEvolucao] = useState<Evolucao | null>(null);
  const [dor, setDor] = useState("");
  const [risco, setRisco] = useState<RiscoPercebido | null>(null);

  function confirmar() {
    onConfirmar({
      empenho,
      evolucao,
      dor_queixa: dor.trim() || null,
      risco_percebido: risco,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[55] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-surface p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden" />
        <h2 className="title-brand text-2xl">
          Como foi o <span className="text-brand">treino?</span>
        </h2>
        <p className="mb-5 text-sm text-muted">{alunoNome}</p>

        {/* Empenho */}
        <Campo label="Empenho">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setEmpenho(n)}
                className={`h-11 flex-1 rounded-xl border text-sm font-bold transition-colors ${
                  empenho != null && n <= empenho
                    ? "border-brand bg-brand/20 text-brand"
                    : "border-border bg-surface-2 text-muted-2"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </Campo>

        {/* Evolução */}
        <Campo label="Evolução">
          <div className="flex gap-2">
            {EVOLUCAO.map((e) => (
              <button
                key={e.valor}
                type="button"
                onClick={() => setEvolucao(e.valor)}
                className={`min-h-[44px] flex-1 rounded-xl border text-sm font-semibold transition-colors ${
                  evolucao === e.valor
                    ? "border-brand bg-brand/20 text-brand"
                    : "border-border bg-surface-2 text-muted"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </Campo>

        {/* Dor ou queixa */}
        <Campo label="Dor ou queixa (opcional)">
          <textarea
            value={dor}
            onChange={(e) => setDor(e.target.value)}
            rows={2}
            placeholder="Ex.: reclamou do ombro no supino"
            className="input resize-none"
          />
        </Campo>

        {/* Risco de cancelamento */}
        <Campo label="Vê risco de cancelamento?">
          <div className="flex gap-2">
            {RISCO.map((r) => (
              <button
                key={r.valor}
                type="button"
                onClick={() => setRisco(r.valor)}
                className={`min-h-[44px] flex-1 rounded-xl border text-sm font-semibold transition-colors ${
                  risco === r.valor
                    ? r.cls
                    : "border-border bg-surface-2 text-muted"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </Campo>

        <button
          type="button"
          onClick={confirmar}
          disabled={pending}
          className="mt-5 min-h-[52px] w-full rounded-xl bg-brand px-4 text-base font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar e concluir"}
        </button>
        <button
          type="button"
          onClick={onPular}
          disabled={pending}
          className="mt-2 w-full py-2 text-center text-sm font-medium text-muted-2 hover:text-muted disabled:opacity-60"
        >
          Pular questionário
        </button>
      </div>
    </div>
  );
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">
        {label}
      </p>
      {children}
    </div>
  );
}
