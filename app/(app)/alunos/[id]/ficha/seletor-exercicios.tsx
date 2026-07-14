"use client";

// Seletor de exercícios (bottom sheet mobile-first): busca + chips de grupo +
// lista da biblioteca. Toque adiciona à ficha. Rodapé cria exercício custom.

import { useMemo, useState, useTransition } from "react";
import type { ExercicioBiblioteca } from "@/lib/kaha/biblioteca";
import { EQUIPAMENTOS, GRUPOS } from "@/lib/kaha/ui";

export function SeletorExercicios({
  biblioteca,
  onEscolher,
  onCriarCustom,
  onClose,
}: {
  biblioteca: ExercicioBiblioteca[];
  onEscolher: (ex: ExercicioBiblioteca) => void;
  onCriarCustom: (dados: {
    nome: string;
    grupo: string;
    equipamento?: string | null;
  }) => Promise<{ ok: boolean; erro?: string }>;
  onClose: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [grupoSel, setGrupoSel] = useState<string | null>(null);
  const [adicionados, setAdicionados] = useState(0);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return biblioteca.filter(
      (e) =>
        (!grupoSel || e.grupo === grupoSel) &&
        (!q || e.nome.toLowerCase().includes(q)),
    );
  }, [biblioteca, busca, grupoSel]);

  function escolher(ex: ExercicioBiblioteca) {
    onEscolher(ex);
    setAdicionados((n) => n + 1);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[88vh] w-full max-w-md flex-col rounded-t-2xl border border-border bg-surface sm:h-[80vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho + busca (sticky) */}
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text">
              Adicionar exercício
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:text-text"
            >
              ✕
            </button>
          </div>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoFocus
            placeholder="Buscar exercício…"
            className="input"
          />
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <Chip ativo={!grupoSel} onClick={() => setGrupoSel(null)}>
              Todos
            </Chip>
            {GRUPOS.map((g) => (
              <Chip
                key={g}
                ativo={grupoSel === g}
                onClick={() => setGrupoSel(g)}
              >
                {g}
              </Chip>
            ))}
          </div>
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtrados.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              Nenhum exercício encontrado.
            </p>
          ) : (
            <ul className="space-y-2">
              {filtrados.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => escolher(ex)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 text-left transition-colors hover:border-brand"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">
                        {ex.nome}
                        {ex.custom && (
                          <span className="ml-2 text-[10px] uppercase text-muted-2">
                            custom
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-2">{ex.grupo}</p>
                    </div>
                    {ex.equipamento && (
                      <span className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] text-muted">
                        {ex.equipamento}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Rodapé: criar custom + concluir */}
        <div className="border-t border-border p-4">
          <MiniFormCustom
            grupoPadrao={grupoSel ?? GRUPOS[0]}
            onCriar={onCriarCustom}
          />
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Concluir{adicionados > 0 ? ` · ${adicionados} adicionado${adicionados > 1 ? "s" : ""}` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

function Chip({
  children,
  ativo,
  onClick,
}: {
  children: React.ReactNode;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        ativo
          ? "border-brand bg-brand text-white"
          : "border-border bg-surface text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function MiniFormCustom({
  grupoPadrao,
  onCriar,
}: {
  grupoPadrao: string;
  onCriar: (dados: {
    nome: string;
    grupo: string;
    equipamento?: string | null;
  }) => Promise<{ ok: boolean; erro?: string }>;
}) {
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();
  const [nome, setNome] = useState("");
  const [grupo, setGrupo] = useState(grupoPadrao);
  const [equipamento, setEquipamento] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="w-full rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-muted transition-colors hover:border-muted-2 hover:text-text"
      >
        Não achou? Criar exercício
      </button>
    );
  }

  function criar() {
    if (!nome.trim()) {
      setErro("Informe o nome.");
      return;
    }
    setErro(null);
    startTransition(async () => {
      const res = await onCriar({
        nome: nome.trim(),
        grupo,
        equipamento: equipamento || null,
      });
      if (res.ok) {
        setNome("");
        setEquipamento("");
        setAberto(false);
      } else {
        setErro(res.erro ?? "Não foi possível criar.");
      }
    });
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface-2 p-3">
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome do exercício"
        className="input"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={grupo}
          onChange={(e) => setGrupo(e.target.value)}
          className="input"
        >
          {GRUPOS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          value={equipamento}
          onChange={(e) => setEquipamento(e.target.value)}
          className="input"
        >
          <option value="">Equipamento…</option>
          {EQUIPAMENTOS.map((eq) => (
            <option key={eq} value={eq}>
              {eq}
            </option>
          ))}
        </select>
      </div>
      {erro && <p className="text-xs text-risk">{erro}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAberto(false)}
          disabled={pending}
          className="flex-1 rounded-lg border border-border py-2 text-xs font-semibold text-muted hover:text-text"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={criar}
          disabled={pending}
          className="flex-1 rounded-lg bg-brand py-2 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? "Criando…" : "Criar e adicionar"}
        </button>
      </div>
    </div>
  );
}
