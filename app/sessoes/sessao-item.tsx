"use client";

// Linha de sessão no board + ações de estado (validadas no servidor).

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ESTADO_SESSAO, type EstadoSessao } from "@/lib/kaha/ui";
import type { SessaoBoard } from "@/lib/kaha/sessoes";
import { mudarEstadoAction } from "./actions";

export function SessaoItem({ sessao }: { sessao: SessaoBoard }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const st = ESTADO_SESSAO[sessao.estado];

  function agir(novo: EstadoSessao) {
    setErro(null);
    startTransition(async () => {
      const res = await mudarEstadoAction(sessao.id, novo);
      if (res.ok) router.refresh();
      else setErro(res.erro ?? "Não foi possível atualizar.");
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="w-12 shrink-0 text-sm font-bold tabular-nums text-text">
          {sessao.hora}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">
            {sessao.aluno_nome}
          </p>
          <p className="truncate text-xs text-muted">{sessao.professor_nome}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.chip}`}
        >
          {st.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {sessao.estado === "agendada" && (
          <Botao onClick={() => agir("confirmada")} disabled={pending} primary>
            Confirmar
          </Botao>
        )}
        {sessao.estado === "confirmada" && (
          <Link
            href={`/sessoes/${sessao.id}/executar`}
            className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Executar treino
          </Link>
        )}
        {sessao.estado === "realizada" && (
          <Link
            href={`/sessoes/${sessao.id}/executar`}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-center text-sm font-semibold text-text transition-colors hover:border-muted-2"
          >
            Ver treino
          </Link>
        )}
        {(sessao.estado === "agendada" || sessao.estado === "confirmada") && (
          <>
            <Botao onClick={() => agir("faltou")} disabled={pending}>
              Faltou
            </Botao>
            <Botao onClick={() => agir("cancelada")} disabled={pending}>
              Cancelar
            </Botao>
          </>
        )}
      </div>

      {erro && <p className="mt-2 text-xs text-risk">{erro}</p>}
    </div>
  );
}

function Botao({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[40px] rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
        primary
          ? "flex-1 bg-brand text-white hover:bg-brand-hover"
          : "border border-border text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
