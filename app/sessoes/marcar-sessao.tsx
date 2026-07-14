"use client";

// Botão "Marcar sessão" + modal com os horários livres reais (de horariosLivres).

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SlotLivre } from "@/lib/kaha/sessoes";
import { NOME_DIA, ordemDia } from "@/lib/kaha/ui";
import { marcarSessaoAction } from "./actions";

export function MarcarSessao({
  aluno,
  semanaRef,
  slots,
}: {
  aluno: { id: string; nome: string };
  semanaRef: string;
  slots: SlotLivre[];
}) {
  const [aberto, setAberto] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const porDia = useMemo(() => {
    const m = new Map<number, SlotLivre[]>();
    for (const s of slots) {
      const arr = m.get(s.dia_semana) ?? [];
      arr.push(s);
      m.set(s.dia_semana, arr);
    }
    return [...m.entries()].sort((a, b) => ordemDia(a[0]) - ordemDia(b[0]));
  }, [slots]);

  function escolher(slot: SlotLivre) {
    setErro(null);
    startTransition(async () => {
      const res = await marcarSessaoAction({
        aluno_id: aluno.id,
        professor_id: slot.professor_id,
        dia: slot.dia_semana,
        hora: slot.hora,
        semana_ref: semanaRef,
      });
      if (res.ok) {
        setAberto(false);
        router.refresh();
      } else {
        setErro(res.erro ?? "Não foi possível marcar.");
        router.refresh(); // se o slot foi ocupado por outro, some da lista
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErro(null);
          setAberto(true);
        }}
        className="shrink-0 rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-hover"
      >
        Marcar sessão
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
          onClick={() => setAberto(false)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-2xl border border-border bg-surface sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-text">Marcar sessão</h2>
                <p className="truncate text-xs text-muted">{aluno.nome}</p>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:text-text"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {erro && (
                <p className="mb-3 rounded-lg border border-risk/40 bg-risk/10 px-3 py-2 text-sm text-risk">
                  {erro}
                </p>
              )}

              {slots.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">
                  Nenhum horário livre nesta semana. Monte a grade dos
                  professores em Professores.
                </p>
              ) : (
                <div className="space-y-4">
                  {porDia.map(([dia, lista]) => (
                    <div key={dia}>
                      <p className="mb-2 text-xs font-semibold text-muted-2">
                        {NOME_DIA[dia]}
                      </p>
                      <div className="space-y-2">
                        {lista.map((slot) => (
                          <button
                            key={`${slot.professor_id}-${slot.hora}`}
                            type="button"
                            disabled={pending}
                            onClick={() => escolher(slot)}
                            className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 text-left transition-colors hover:border-brand disabled:opacity-60"
                          >
                            <span className="text-sm font-bold tabular-nums text-text">
                              {slot.hora}
                            </span>
                            <span className="truncate text-sm text-muted">
                              {slot.professor_nome}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
