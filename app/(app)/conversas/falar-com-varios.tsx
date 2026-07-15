"use client";

// "Falar com vários" — cada aluno recebe uma mensagem PRÓPRIA (renderizada com os
// dados dele). Nunca texto igual. Envio um a um (revisão + gesto por aluno).

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icons";
import type { FilaItem } from "@/lib/julia/fila";

type Filtro = "todos" | "sem_sessao" | "renova";

export function FalarComVarios({
  candidatos,
  textoDe,
  onEnviar,
  onClose,
}: {
  candidatos: FilaItem[];
  textoDe: (item: FilaItem) => string;
  onEnviar: (item: FilaItem) => void;
  onClose: () => void;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [sel, setSel] = useState<Set<string>>(
    () => new Set(candidatos.map((c) => c.aluno_id)),
  );
  const [fila, setFila] = useState<FilaItem[] | null>(null); // stepper
  const [idx, setIdx] = useState(0);

  const filtrados = useMemo(() => {
    if (filtro === "sem_sessao")
      return candidatos.filter((c) => c.tipo === "resgate" || c.tipo === "presenca");
    if (filtro === "renova")
      return candidatos.filter((c) => c.tipo === "renovacao");
    return candidatos;
  }, [candidatos, filtro]);

  function toggle(id: string) {
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const selecionados = filtrados.filter((c) => sel.has(c.aluno_id));

  function iniciarEnvio() {
    if (selecionados.length === 0) return;
    setFila(selecionados);
    setIdx(0);
  }

  // ── Stepper de envio ──
  if (fila) {
    const atual = fila[idx];
    if (!atual) {
      onClose();
      return null;
    }
    function enviarAtual() {
      onEnviar(atual);
      if (idx + 1 >= fila!.length) onClose();
      else setIdx(idx + 1);
    }
    function pular() {
      if (idx + 1 >= fila!.length) onClose();
      else setIdx(idx + 1);
    }
    return (
      <Overlay onClose={onClose}>
        <div className="flex items-start gap-3 p-5 pb-0">
          <div className="flex-1">
            <h2 className="font-display text-lg font-extrabold italic uppercase">
              Enviar um a um
            </h2>
            <p className="mt-1 text-xs text-muted">
              {idx + 1} de {fila.length} · revise e envie no WhatsApp
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-2">
            <Icon name="chevron" className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          <div className="rounded-xl border border-line bg-card p-3">
            <p className="mb-1 text-[12.5px] font-semibold">{atual.aluno_nome}</p>
            <p className="text-[12.5px] leading-relaxed text-ink-2">
              {textoDe(atual)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-line p-4">
          <button
            type="button"
            onClick={pular}
            className="rounded-lg px-3 py-2.5 text-xs font-semibold text-muted hover:text-ink"
          >
            Pular
          </button>
          <button
            type="button"
            onClick={enviarAtual}
            className="ml-auto flex items-center gap-2 rounded-lg bg-zap px-4 py-2.5 text-xs font-bold text-[#0B1A12]"
          >
            <Icon name="conversas" className="h-4 w-4" />
            Enviar no WhatsApp
          </button>
        </div>
      </Overlay>
    );
  }

  // ── Seleção ──
  return (
    <Overlay onClose={onClose}>
      <div className="flex items-start gap-3 p-5 pb-0">
        <div className="flex-1">
          <h2 className="font-display text-lg font-extrabold italic uppercase">
            Falar com vários
          </h2>
          <p className="mt-1 text-xs text-muted">
            Escolha quem precisa de um toque. Cada um recebe uma mensagem diferente.
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-muted-2">
          <Icon name="chevron" className="h-5 w-5" />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto px-5 pt-4">
        {(
          [
            ["todos", `Todos · ${candidatos.length}`],
            ["sem_sessao", "Sem sessão esta semana"],
            ["renova", "Renova em 7 dias"],
          ] as [Filtro, string][]
        ).map(([f, label]) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
              filtro === f
                ? "border-ink bg-ink text-white"
                : "border-line bg-card text-ink-2"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mx-5 mt-4 flex items-start gap-2.5 rounded-xl border border-[#BBF7D0] bg-ok-soft p-3">
        <Icon name="check" className="mt-0.5 h-4 w-4 flex-none text-ok" />
        <p className="text-[11.5px] leading-relaxed text-[#14532D]">
          <b className="text-[#052E16]">Cada aluno recebe uma mensagem própria</b>,
          com o nome, o tempo parado e a última carga dele — enviadas uma a uma.
          Ninguém recebe texto igual ao do colega.
        </p>
      </div>

      <div className="flex max-h-[46vh] flex-col gap-2 overflow-y-auto p-5">
        {filtrados.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            Ninguém neste filtro.
          </p>
        ) : (
          filtrados.map((c) => {
            const on = sel.has(c.aluno_id);
            return (
              <button
                key={c.aluno_id}
                type="button"
                onClick={() => toggle(c.aluno_id)}
                className={`flex gap-3 rounded-xl border p-3 text-left ${
                  on ? "border-red bg-red-soft" : "border-line"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-[17px] w-[17px] flex-none items-center justify-center rounded-[5px] border ${
                    on ? "border-red bg-red text-white" : "border-line bg-card"
                  }`}
                >
                  {on && <Icon name="check" className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-[12.5px] font-semibold">
                    {c.aluno_nome}
                  </span>
                  <span className="mt-1.5 block rounded-lg border border-line bg-card p-2 text-[11.5px] leading-relaxed text-ink-2">
                    {textoDe(c)}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-line p-4">
        <p className="flex-1 text-xs text-muted">
          <b className="font-bold text-ink">{selecionados.length}</b> de{" "}
          {filtrados.length} selecionados
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-line px-3 py-2.5 text-xs font-semibold text-ink-2"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={iniciarEnvio}
          disabled={selecionados.length === 0}
          className="flex items-center gap-2 rounded-lg bg-zap px-4 py-2.5 text-xs font-bold text-[#0B1A12] disabled:opacity-50"
        >
          <Icon name="conversas" className="h-4 w-4" />
          Revisar e enviar um a um
        </button>
      </div>
    </Overlay>
  );
}

function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-[640px] flex-col overflow-hidden rounded-shell bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
