"use client";

// Editor de ficha (B3.5): exercícios vêm de um seletor sobre a biblioteca.
// Cada linha tem nome fixo (da biblioteca) + séries/reps/carga editáveis
// (inputs 16px). Add/remover/reordenar. Salva transacional via Server Action.

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ExercicioBiblioteca } from "@/lib/kaha/biblioteca";
import { OBJETIVOS_FICHA } from "@/lib/kaha/ui";
import { criarExercicioCustomAction, salvarFichaAction } from "../../actions";
import { SeletorExercicios } from "./seletor-exercicios";

type Linha = {
  key: number;
  nome: string;
  biblioteca_id: string | null;
  series: string;
  reps_alvo: string;
  carga_alvo: string;
};

type ExercicioInicial = {
  nome: string;
  series: number | null;
  reps_alvo: string | null;
  carga_alvo: string | null;
  biblioteca_id: string | null;
};

export function FichaEditor({
  alunoId,
  objetivoInicial,
  divisaoInicial,
  exerciciosIniciais,
  bibliotecaInicial,
}: {
  alunoId: string;
  objetivoInicial: string;
  divisaoInicial: string;
  exerciciosIniciais: ExercicioInicial[];
  bibliotecaInicial: ExercicioBiblioteca[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const contador = useRef(0);
  const novaKey = () => ++contador.current;

  const [objetivo, setObjetivo] = useState(objetivoInicial);
  const [divisao, setDivisao] = useState(divisaoInicial);
  const [biblioteca, setBiblioteca] =
    useState<ExercicioBiblioteca[]>(bibliotecaInicial);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    exerciciosIniciais.map((e) => ({
      key: novaKey(),
      nome: e.nome,
      biblioteca_id: e.biblioteca_id,
      series: e.series != null ? String(e.series) : "",
      reps_alvo: e.reps_alvo ?? "",
      carga_alvo: e.carga_alvo ?? "",
    })),
  );
  const [erro, setErro] = useState<string | null>(null);

  function adicionar(ex: ExercicioBiblioteca) {
    setLinhas((prev) => [
      ...prev,
      {
        key: novaKey(),
        nome: ex.nome,
        biblioteca_id: ex.id,
        series: "",
        reps_alvo: "",
        carga_alvo: "",
      },
    ]);
  }

  async function criarCustom(dados: {
    nome: string;
    grupo: string;
    equipamento?: string | null;
  }): Promise<{ ok: boolean; erro?: string }> {
    const res = await criarExercicioCustomAction(dados);
    if (!res.ok) return { ok: false, erro: res.erro };
    // Passa a aparecer nas buscas seguintes (ordena grupo → nome).
    setBiblioteca((prev) =>
      [...prev, res.exercicio].sort(
        (a, b) =>
          a.grupo.localeCompare(b.grupo) || a.nome.localeCompare(b.nome),
      ),
    );
    adicionar(res.exercicio);
    return { ok: true };
  }

  function atualizar(
    key: number,
    campo: "series" | "reps_alvo" | "carga_alvo",
    valor: string,
  ) {
    setLinhas((prev) =>
      prev.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)),
    );
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
        biblioteca_id: l.biblioteca_id,
      }));

    if (exercicios.length === 0) {
      setErro("Adicione ao menos um exercício.");
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

        {linhas.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-surface/50 py-6 text-center text-sm text-muted-2">
            Toque em “Adicionar exercício” para montar o treino.
          </p>
        )}

        {linhas.map((l, i) => (
          <div
            key={l.key}
            className="space-y-3 rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-xs font-semibold text-muted-2">
                  #{i + 1}
                </span>
                <span className="truncate text-sm font-medium text-text">
                  {l.nome}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
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

            <div className="grid grid-cols-3 gap-2">
              <CampoNum
                valor={l.series}
                onChange={(v) => atualizar(l.key, "series", v)}
                placeholder="Séries"
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
          onClick={() => setSeletorAberto(true)}
          className="w-full rounded-xl border border-dashed border-brand/50 py-3 text-sm font-semibold text-brand transition-colors hover:bg-brand/10"
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

      {seletorAberto && (
        <SeletorExercicios
          biblioteca={biblioteca}
          onEscolher={adicionar}
          onCriarCustom={criarCustom}
          onClose={() => setSeletorAberto(false)}
        />
      )}
    </div>
  );
}

function CampoNum({
  valor,
  onChange,
  placeholder,
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      inputMode="numeric"
      placeholder={placeholder}
      className="input"
    />
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
