"use client";

// Editor da grade de horários: toggle dia × hora, otimista, grava em kaha_horarios.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { celulaKey, DIAS_UI, SLOTS } from "@/lib/kaha/grade";
import type { Horario } from "@/lib/kaha/professores";
import { toggleHorarioAction } from "../actions";

export function GradeEditor({
  professorId,
  horariosIniciais,
}: {
  professorId: string;
  horariosIniciais: Horario[];
}) {
  const router = useRouter();
  const [marcados, setMarcados] = useState<Set<string>>(
    () => new Set(horariosIniciais.map((h) => celulaKey(h.dia_semana, h.hora))),
  );
  // Células em voo, para desabilitar re-toque e evitar corrida.
  const [emVoo, setEmVoo] = useState<Set<string>>(new Set());

  async function toggle(dia: number, hora: string) {
    const key = celulaKey(dia, hora);
    if (emVoo.has(key)) return;

    const marcar = !marcados.has(key);

    // Otimista.
    setMarcados((prev) => {
      const next = new Set(prev);
      if (marcar) next.add(key);
      else next.delete(key);
      return next;
    });
    setEmVoo((prev) => new Set(prev).add(key));

    const res = await toggleHorarioAction(professorId, dia, hora, marcar);

    setEmVoo((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

    if (!res.ok) {
      // Reverte em caso de falha.
      setMarcados((prev) => {
        const next = new Set(prev);
        if (marcar) next.delete(key);
        else next.add(key);
        return next;
      });
    } else {
      // Atualiza a agenda semanal (server component) abaixo.
      router.refresh();
    }
  }

  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-1">
      <div className="min-w-[560px]">
        {/* Cabeçalho: dias */}
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

        {/* Linhas: horas */}
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
                const on = marcados.has(key);
                const busy = emVoo.has(key);
                return (
                  <button
                    key={d.dia}
                    type="button"
                    onClick={() => toggle(d.dia, slot)}
                    aria-pressed={on}
                    className={`h-9 rounded-md border text-xs transition-colors ${
                      on
                        ? "border-brand bg-brand/20 text-brand"
                        : "border-border bg-surface-2 text-transparent hover:border-muted-2"
                    } ${busy ? "opacity-50" : ""}`}
                  >
                    {on ? "•" : "·"}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
