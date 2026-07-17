"use client";

// Passo 4 · Importar alunos — PLACEHOLDER (commit do step 2).
// O upload .xlsx/.csv (SheetJS) + mapeamento + preview + validação chega no
// commit do step 4, substituindo este arquivo. Mantém o wizard navegável e o
// build verde enquanto isso.

import type { Plano } from "@/lib/kaha/onboarding";

export function ImportarAlunos({ planos }: { planos: Plano[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted">
        No último passo você importa seus alunos de uma planilha (.xlsx ou .csv):
        nome, telefone e plano. Com preview e validação antes de gravar.
      </p>
      <div className="rounded-xl border border-dashed border-line bg-surface-2 px-4 py-10 text-center">
        <p className="text-sm font-semibold text-ink-2">Importação por planilha</p>
        <p className="mt-1 text-[12px] text-muted-2">
          {planos.length > 0
            ? `${planos.length} plano(s) prontos para receber alunos.`
            : "Crie ao menos um plano antes de importar."}
        </p>
      </div>
      <p className="text-[12px] text-muted-2">
        Você pode concluir a configuração agora e importar depois.
      </p>
    </div>
  );
}
