"use client";

// Form de professor (criar/editar) em modal, sem libs de form: estado local + action.
// Também exporta os botões que abrem o modal e o botão de desativar.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Professor } from "@/lib/kaha/professores";
import { desativarProfessorAction, salvarProfessorAction } from "./actions";

type FormProps = {
  professor?: Professor;
  onClose: () => void;
};

function ProfessorForm({ professor, onClose }: FormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nome, setNome] = useState(professor?.nome ?? "");
  const [especialidade, setEspecialidade] = useState(
    professor?.especialidade ?? "",
  );
  const [whatsapp, setWhatsapp] = useState(professor?.telefone ?? "");
  const [ativo, setAtivo] = useState(professor?.ativo ?? true);
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErro("Informe o nome do professor.");
      return;
    }
    setErro(null);
    startTransition(async () => {
      const res = await salvarProfessorAction(professor?.id ?? null, {
        nome: nomeLimpo,
        especialidade,
        telefone: whatsapp,
        ativo,
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-border bg-surface p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="title-brand mb-4 text-2xl">
          {professor ? "Editar" : "Novo"}{" "}
          <span className="text-brand">professor</span>
        </h2>

        <div className="space-y-4">
          <Campo label="Nome" obrigatorio>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
              placeholder="Ex.: Marina Alves"
              className="input"
            />
          </Campo>

          <Campo label="Especialidade">
            <input
              value={especialidade}
              onChange={(e) => setEspecialidade(e.target.value)}
              placeholder="Ex.: Musculação, Funcional"
              className="input"
            />
          </Campo>

          <Campo label="WhatsApp">
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              inputMode="tel"
              placeholder="Ex.: 5511999998888"
              className="input"
            />
          </Campo>

          <label className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3">
            <span className="text-sm text-text">Ativo</span>
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="h-5 w-5 accent-brand"
            />
          </label>

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

export function NovoProfessorButton() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
      >
        Novo professor
      </button>
      {aberto && <ProfessorForm onClose={() => setAberto(false)} />}
    </>
  );
}

export function EditarProfessorButton({ professor }: { professor: Professor }) {
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
        <ProfessorForm
          professor={professor}
          onClose={() => setAberto(false)}
        />
      )}
    </>
  );
}

export function DesativarProfessorButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function desativar() {
    if (!confirm("Desativar este professor? Ele sai da lista, mas o histórico é mantido.")) {
      return;
    }
    startTransition(async () => {
      const res = await desativarProfessorAction(id);
      if (res.ok) router.push("/professores");
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
