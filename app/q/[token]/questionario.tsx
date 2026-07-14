"use client";

// Questionário público do aluno (sem login). Mobile-first, identidade Kaha.

import { useState, useTransition } from "react";
import { responderQuestionarioAction } from "./actions";

const CURTIU = [
  "Os exercícios",
  "O professor",
  "A intensidade",
  "O ritmo",
  "O ambiente",
];

export function Questionario({
  token,
  nome,
}: {
  token: string;
  nome: string;
}) {
  const [pending, startTransition] = useTransition();
  const [nota, setNota] = useState<number | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [maisCurtiu, setMaisCurtiu] = useState("");
  const [mudaria, setMudaria] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function toggleChip(c: string) {
    setChips((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  function enviar() {
    if (nota === null) {
      setErro("Dá uma nota pro treino de hoje 🙂");
      return;
    }
    setErro(null);
    const gostou = [...chips, maisCurtiu.trim()].filter(Boolean).join(" · ");
    startTransition(async () => {
      const res = await responderQuestionarioAction({
        token,
        nota,
        gostou: gostou || null,
        mudaria: mudaria.trim() || null,
      });
      if (res.ok) setEnviado(true);
      else
        setErro(
          "Não consegui registrar — talvez este link já tenha sido usado.",
        );
    });
  }

  if (enviado) {
    return (
      <Centro>
        <div className="text-5xl">💪</div>
        <h1 className="title-brand mt-4 text-4xl">Valeu!</h1>
        <p className="mt-2 text-muted">
          Seu retorno chegou. Nos vemos no próximo treino.
        </p>
      </Centro>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-7 px-6 py-12">
      <header className="space-y-2">
        <span className="inline-block rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted">
          Kaha Elite
        </span>
        <h1 className="title-brand text-4xl">
          Como foi seu <span className="text-brand">treino</span>
          {nome ? `, ${nome}` : ""}?
        </h1>
      </header>

      {/* Nota */}
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">
          Sua nota
        </p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNota(n)}
              className={`h-14 flex-1 rounded-xl border text-lg font-bold transition-colors ${
                nota != null && n <= nota
                  ? "border-brand bg-brand/20 text-brand"
                  : "border-border bg-surface-2 text-muted-2"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      {/* O que curtiu */}
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">
          O que você curtiu?
        </p>
        <div className="flex flex-wrap gap-2">
          {CURTIU.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleChip(c)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                chips.includes(c)
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-surface text-muted hover:text-text"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <textarea
          value={maisCurtiu}
          onChange={(e) => setMaisCurtiu(e.target.value)}
          rows={2}
          placeholder="Conte mais (opcional)"
          className="input resize-none"
        />
      </section>

      {/* O que mudaria */}
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">
          O que você mudaria?
        </p>
        <textarea
          value={mudaria}
          onChange={(e) => setMudaria(e.target.value)}
          rows={2}
          placeholder="Opcional"
          className="input resize-none"
        />
      </section>

      {erro && <p className="text-sm text-risk">{erro}</p>}

      <button
        type="button"
        onClick={enviar}
        disabled={pending}
        className="min-h-[52px] w-full rounded-xl bg-brand px-4 text-base font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar"}
      </button>
    </main>
  );
}

export function Centro({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      {children}
    </main>
  );
}
