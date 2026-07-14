"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AlunoLista } from "@/lib/kaha/alunos";
import { iniciais, STATUS } from "@/lib/kaha/ui";
import { SemaforoUso } from "./semaforo-uso";

export function ListaAlunos({ alunos }: { alunos: AlunoLista[] }) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return alunos;
    return alunos.filter((a) => a.nome.toLowerCase().includes(q));
  }, [alunos, busca]);

  return (
    <div className="space-y-4">
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por nome…"
        className="input"
      />

      {filtrados.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          Nenhum aluno encontrado.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtrados.map((a) => {
            const st = STATUS[a.semaforo];
            return (
              <li key={a.id}>
                <Link
                  href={`/alunos/${a.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-muted-2"
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${st.avatar}`}
                  >
                    {iniciais(a.nome)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-text">{a.nome}</p>
                    {a.tem_ficha ? (
                      <p className="truncate text-sm text-muted">
                        {a.objetivo || "Treino cadastrado"}
                      </p>
                    ) : (
                      <p className="truncate text-sm text-warn">
                        sem treino cadastrado
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      <SemaforoUso sessoes={a.sessoes_4sem} />
                      <span className={`text-xs font-medium ${st.text}`}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                  <span className="text-muted-2">›</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
