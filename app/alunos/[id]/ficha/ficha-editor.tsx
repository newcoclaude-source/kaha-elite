"use client";

// Editor de ficha (momento-chave). Objetivo + divisão + tabela de exercícios
// com adicionar/remover/reordenar. Salva via Server Action (substituição
// transacional). Inputs 16px (classe .input) para não dar zoom no iOS.

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OBJETIVOS_FICHA } from "@/lib/kaha/ui";
import { salvarFichaAction } from "../../actions";

type Linha = {
  key: number;
  nome: string;
  series: string;
  reps_alvo: string;
  carga_alvo: string;
};

type ExercicioInicial = {
  nome: string;
  series: number | null;
  reps_alvo: string | null;
  carga_alvo: string | null;
};

export function FichaEditor({
  alunoId,
  objetivoInicial,
  divisaoInicial,
  exerciciosIniciais,
}: {
  alunoId: string;
  objetivoInicial: string;
  divisaoInicial: string;
  exerciciosIniciais: ExercicioInicial[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const contador = useRef(0);
  const novaKey = () => ++contador.current;

  const [objetivo, setObjetivo] = useState(objetivoInicial);
  const [divisao, setDivisao] = useState(divisaoInicial);
  const [linhas, setLinhas] = useState<Linha[]>(() => {
    const base =
      exerciciosIniciais.length > 0
        ? exerciciosIniciais
        : [{ nome: "", series: null, reps_alvo: "", carga_alvo: "" }];
    return base.map((e) => ({
      key: novaKey(),
      nome: e.nome ?? "",
      series: e.series != null ? String(e.series) : "",
      reps_alvo: e.reps_alvo ?? "",
      carga_alvo: e.carga_alvo ?? "",
    }));
  });
  const [erro, setErro] = useState<string | null>(null);

  function atualizar(key: number, campo: keyof Omit<Linha, "key">, valor: string) {
    setLinhas((prev) =>
      prev.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)),
    );
  }

  function adicionar() {
    setLinhas((prev) => [
      ...prev,
      { key: novaKey(), nome: "", series: "", reps_alvo: "", carga_alvo: "" },
    ]);
  }

  function remover(key: number) {
    setLinhas((prev) => prev.filter((l) => l.key !== key));
  }

  function mover(index: number, delta: number) {
    setLinhas((prev) => {
      const alvo = index + delta;
      if (alvo < 0 || alvo >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[alvo]] = [next[alvo], next[index]];
      return next;
    });
  }

  function salvar() {
    const exercicios = linhas
      .filter((l) => l.nome.trim())
      .map((l) => ({
        nome: l.nome.trim(),
        series: l.series.trim() === "" ? null : Number(l.series),
        reps_alvo: l.reps_alvo.trim() || null,
        carga_alvo: l.carga_alvo.trim() || null,
      }));

    if (exercicios.length === 0) {
      setErro("Adicione ao menos um exercício com nome.");
      return;
    }
    setErro(null);

    startTransition(async () => {
      const res = await salvarFichaAction(alunoId, {
        objetivo,
        divisao,
        exercicios,
      });
      if (res.ok) {
        router.push(`/alunos/${alunoId}`);
        router.refresh();
      } else {
        setErro(res.erro ?? "Não foi possível salvar a ficha.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-2">
          Objetivo
        </span>
        <select
          value={objetivo}
          onChange={(e) => setObjetivo(e.target.value)}
          className="input"
        >
          <option value="">Selecione…</option>
          {OBJETIVOS_FICHA.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-2">
          Divisão
        </span>
        <input
          value={divisao}
          onChange={(e) => setDivisao(e.target.value)}
          placeholder="Ex.: A / B / C"
          className="input"
        />
      </label>

      <div className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-2">
          Exercícios
        </span>

        {linhas.map((l, i) => (
          <div
            key={l.key}
            className="space-y-3 rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-2">
                #{i + 1}
              </span>
              <div className="flex items-center gap-1">
                <BotaoIcone onClick={() => mover(i, -1)} disabled={i === 0}>
                  ↑
                </BotaoIcone>
                <BotaoIcone
                  onClick={() => mover(i, 1)}
                  disabled={i === linhas.length - 1}
                >
                  ↓
                </BotaoIcone>
                <BotaoIcone onClick={() => remover(l.key)} perigo>
                  ✕
                </BotaoIcone>
              </div>
            </div>

            <input
              value={l.nome}
              onChange={(e) => atualizar(l.key, "nome", e.target.value)}
              placeholder="Nome do exercício"
              className="input"
            />

            <div className="grid grid-cols-3 gap-2">
              <input
                value={l.series}
                onChange={(e) => atualizar(l.key, "series", e.target.value)}
                inputMode="numeric"
                placeholder="Séries"
                className="input"
              />
              <input
                value={l.reps_alvo}
                onChange={(e) => atualizar(l.key, "reps_alvo", e.target.value)}
                placeholder="Reps"
                className="input"
              />
              <input
                value={l.carga_alvo}
                onChange={(e) => atualizar(l.key, "carga_alvo", e.target.value)}
                placeholder="Carga"
                className="input"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={adicionar}
          className="w-full rounded-xl border border-dashed border-border py-3 text-sm font-semibold text-muted transition-colors hover:border-muted-2 hover:text-text"
        >
          + Adicionar exercício
        </button>
      </div>

      {erro && <p className="text-sm text-risk">{erro}</p>}

      <div className="sticky bottom-4 flex gap-3">
        <button
          type="button"
          onClick={() => router.push(`/alunos/${alunoId}`)}
          disabled={pending}
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-muted transition-colors hover:text-text"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={salvar}
          disabled={pending}
          className="flex-[2] rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar ficha"}
        </button>
      </div>
    </div>
  );
}

function BotaoIcone({
  children,
  onClick,
  disabled,
  perigo,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  perigo?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border text-sm transition-colors disabled:opacity-30 ${
        perigo
          ? "text-muted hover:border-risk hover:text-risk"
          : "text-muted hover:border-muted-2 hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
