"use client";

// Form de aluno (criar/editar) em modal, sem libs: estado local + Server Action.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarAlunoAction, desativarAlunoAction } from "./actions";

export type AlunoEditavel = {
  id: string;
  nome: string;
  telefone: string | null;
  objetivo: string | null;
  vencimento: string | null;
  valor_mensal: number | null;
};

function Campo({
  label,
  obrigatorio,
  children,
}: {
  label: string;
  obrigatorio?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-2">
        {label}
        {obrigatorio && <span className="text-brand"> *</span>}
      </span>
      {children}
    </label>
  );
}

function AlunoForm({
  aluno,
  onClose,
}: {
  aluno?: AlunoEditavel;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nome, setNome] = useState(aluno?.nome ?? "");
  const [whatsapp, setWhatsapp] = useState(aluno?.telefone ?? "");
  const [objetivo, setObjetivo] = useState(aluno?.objetivo ?? "");
  const [vencimento, setVencimento] = useState(aluno?.vencimento ?? "");
  // valor_mensal continua no payload (preserva o valor no banco), mas NÃO é
  // exibido: regra "nada financeiro na UI".
  const [valor] = useState(
    aluno?.valor_mensal != null ? String(aluno.valor_mensal) : "1000",
  );
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErro("Informe o nome do aluno.");
      return;
    }
    setErro(null);
    startTransition(async () => {
      const res = await salvarAlunoAction(aluno?.id ?? null, {
        nome: nomeLimpo,
        telefone: whatsapp,
        objetivo,
        vencimento,
        valor_mensal: valor.trim() === "" ? 1000 : Number(valor),
      });
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        setErro(res.erro);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-surface p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="title-brand mb-4 text-2xl">
          {aluno ? "Editar" : "Novo"} <span className="text-brand">aluno</span>
        </h2>

        <div className="space-y-4">
          <Campo label="Nome" obrigatorio>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
              placeholder="Ex.: João Pereira"
              className="input"
            />
          </Campo>

          <Campo label="WhatsApp">
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              inputMode="tel"
              placeholder="Ex.: 11971221994"
              className="input"
            />
          </Campo>

          <Campo label="Objetivo">
            <input
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Ex.: Perder 5kg até dezembro"
              className="input"
            />
          </Campo>

          <Campo label="Vencimento">
            <input
              type="date"
              value={vencimento ?? ""}
              onChange={(e) => setVencimento(e.target.value)}
              className="input"
            />
          </Campo>

          {erro && <p className="text-sm text-risk">{erro}</p>}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-muted transition-colors hover:text-text"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={pending}
            className="flex-1 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function NovoAlunoButton({
  variante = "brand",
}: {
  variante?: "brand" | "outline";
}) {
  const [aberto, setAberto] = useState(false);
  const cls =
    variante === "brand"
      ? "rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
      : "rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:border-muted-2";
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={cls}>
        Novo aluno
      </button>
      {aberto && <AlunoForm onClose={() => setAberto(false)} />}
    </>
  );
}

export function EditarAlunoButton({ aluno }: { aluno: AlunoEditavel }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:border-muted-2"
      >
        Editar
      </button>
      {aberto && (
        <AlunoForm aluno={aluno} onClose={() => setAberto(false)} />
      )}
    </>
  );
}

export function DesativarAlunoButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function desativar() {
    if (
      !confirm(
        "Desativar este aluno? Ele sai da lista, mas o histórico é mantido.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await desativarAlunoAction(id);
      if (res.ok) router.push("/alunos");
    });
  }
  return (
    <button
      type="button"
      onClick={desativar}
      disabled={pending}
      className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-risk hover:text-risk disabled:opacity-60"
    >
      {pending ? "Desativando…" : "Desativar"}
    </button>
  );
}
