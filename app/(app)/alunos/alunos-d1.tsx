"use client";

// D1 — Alunos. Tabela densa no desktop, cards no mobile. Ordem por uso ascendente
// (mais frio primeiro). Ação principal muda pelo estado (Montar / Marcar / neutro).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import type { AlunoD1 } from "@/lib/kaha/alunos";
import type { SlotLivre } from "@/lib/kaha/sessoes";
import { ESTADO_SESSAO, iniciais, NOME_DIA, STATUS } from "@/lib/kaha/ui";
import { NovoAlunoButton } from "./aluno-form";
import { MarcarSessao } from "../agenda/marcar-sessao";

type Filtro = "todos" | "risco" | "oscilando" | "em_ritmo" | "sem_ficha" | "sem_sessao";

const AV: Record<string, string> = {
  verde: "bg-ok-soft text-ok",
  ambar: "bg-warn-soft text-warn",
  risco: "bg-red-soft text-risk",
};
const STCHIP: Record<string, string> = {
  verde: "bg-ok-soft text-ok",
  ambar: "bg-warn-soft text-warn",
  risco: "bg-red-soft text-risk",
};

function passa(a: AlunoD1, f: Filtro): boolean {
  switch (f) {
    case "risco":
      return a.semaforo === "risco";
    case "oscilando":
      return a.semaforo === "ambar";
    case "em_ritmo":
      return a.semaforo === "verde";
    case "sem_ficha":
      return !a.tem_ficha;
    case "sem_sessao":
      return !a.sessao_semana;
    default:
      return true;
  }
}

function ultimoTexto(dias: number | null): { txt: string; cold: boolean } {
  if (dias === null) return { txt: "nunca", cold: true };
  if (dias === 0) return { txt: "hoje", cold: false };
  return { txt: `há ${dias} ${dias === 1 ? "dia" : "dias"}`, cold: dias > 10 };
}

export function AlunosD1({
  alunos,
  slots,
  semana,
}: {
  alunos: AlunoD1[];
  slots: SlotLivre[];
  semana: string;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");

  const contagens = useMemo(
    () => ({
      todos: alunos.length,
      risco: alunos.filter((a) => a.semaforo === "risco").length,
      oscilando: alunos.filter((a) => a.semaforo === "ambar").length,
      em_ritmo: alunos.filter((a) => a.semaforo === "verde").length,
      sem_ficha: alunos.filter((a) => !a.tem_ficha).length,
      sem_sessao: alunos.filter((a) => !a.sessao_semana).length,
    }),
    [alunos],
  );

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return alunos.filter(
      (a) => passa(a, filtro) && (!q || a.nome.toLowerCase().includes(q)),
    );
  }, [alunos, filtro, busca]);

  const FILTROS: { key: Filtro; label: string; dot?: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "risco", label: "Em risco", dot: "#B91C1C" },
    { key: "oscilando", label: "Oscilando", dot: "#D97706" },
    { key: "em_ritmo", label: "Em ritmo", dot: "#15A34A" },
    { key: "sem_ficha", label: "Sem ficha", dot: "#D97706" },
    { key: "sem_sessao", label: "Sem sessão esta semana", dot: "#B91C1C" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-6">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-[160px] flex-1">
          <h1 className="title-brand text-2xl">Alunos</h1>
          <p className="text-xs text-muted">
            Do mais frio ao mais em dia.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2">
          <Icon name="search" className="h-4 w-4 text-muted-2" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar aluno…"
            className="w-40 bg-transparent text-[12.5px] outline-none placeholder:text-muted-2"
          />
        </div>
        <NovoAlunoButton />
      </header>

      {/* Filtros */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-0.5">
        {FILTROS.map((f) => {
          const on = filtro === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFiltro(f.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-[12.5px] font-semibold ${
                on ? "border-ink bg-ink text-white" : "border-line bg-card text-ink-2"
              }`}
            >
              {f.dot && (
                <i className="h-[7px] w-[7px] rounded-full" style={{ background: f.dot }} />
              )}
              {f.label}
              <b className={`font-semibold ${on ? "text-white/50" : "text-muted"}`}>
                {contagens[f.key]}
              </b>
            </button>
          );
        })}
      </div>

      {alunos.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-card/60 px-6 py-12 text-center text-sm text-muted">
          Cadastre o primeiro aluno do Elite.
        </div>
      ) : (
        <>
          {/* TABELA (desktop) */}
          <div className="hidden overflow-hidden rounded-card border border-line bg-card lg:block">
            <div className="m-[18px] mb-3.5 flex h-5 items-center justify-between">
              <h3 className="text-[13px] font-bold">Todos os alunos</h3>
              <span className="text-[11.5px] text-muted">
                Ordenado por uso · mais frio primeiro
              </span>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[820px]">
                <Row header />
                {lista.map((a) => (
                  <TabelaRow key={a.id} a={a} slots={slots} semana={semana} />
                ))}
                {lista.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted">
                    Nenhum aluno neste filtro.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* CARDS (mobile) */}
          <div className="flex flex-col gap-2.5 lg:hidden">
            {lista.map((a) => (
              <CardAluno key={a.id} a={a} slots={slots} semana={semana} />
            ))}
            {lista.length === 0 && (
              <p className="py-8 text-center text-sm text-muted">
                Nenhum aluno neste filtro.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const COLS =
  "grid grid-cols-[1.7fr_132px_118px_1.5fr_1.25fr_96px] items-center gap-3 px-[18px]";

function Row({ header }: { header?: boolean }) {
  if (!header) return null;
  return (
    <div
      className={`${COLS} border-y border-line bg-[#FCFCFD] text-[10px] font-bold uppercase tracking-wide text-muted`}
    >
      <div className="py-2.5">Aluno</div>
      <div className="py-2.5">Uso · 4 semanas</div>
      <div className="py-2.5">Último treino</div>
      <div className="py-2.5">Esta semana</div>
      <div className="py-2.5">Treino</div>
      <div className="flex justify-end py-2.5">Ações</div>
    </div>
  );
}

function Dots({ n }: { n: number }) {
  const v = Math.max(0, Math.min(4, n));
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: 4 }).map((_, i) => (
        <i
          key={i}
          className="h-[13px] w-[13px] rounded"
          style={{ background: i < v ? "#15A34A" : "#FEE2E4" }}
        />
      ))}
    </div>
  );
}

function AcaoPrincipal({
  a,
  slots,
  semana,
}: {
  a: AlunoD1;
  slots: SlotLivre[];
  semana: string;
}) {
  if (!a.tem_ficha) {
    return (
      <Link
        href={`/alunos/${a.id}/ficha`}
        onClick={(e) => e.stopPropagation()}
        className="rounded-lg bg-red px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-red-hover"
      >
        Montar
      </Link>
    );
  }
  if (!a.sessao_semana) {
    return (
      <span onClick={(e) => e.stopPropagation()}>
        <MarcarSessao
          aluno={{ id: a.id, nome: a.nome }}
          semanaRef={semana}
          slots={slots}
        />
      </span>
    );
  }
  return null;
}

function ZapBtn({ telefone }: { telefone: string | null }) {
  if (!telefone) return null;
  const num = telefone.replace(/\D/g, "");
  const ddi = num.startsWith("55") ? num : `55${num}`;
  return (
    <a
      href={`https://wa.me/${ddi}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-line text-ink-2 hover:border-red hover:text-red"
      title="Abrir WhatsApp"
    >
      <Icon name="conversas" className="h-3.5 w-3.5" />
    </a>
  );
}

function TabelaRow({
  a,
  slots,
  semana,
}: {
  a: AlunoD1;
  slots: SlotLivre[];
  semana: string;
}) {
  const router = useRouter();
  const ult = ultimoTexto(a.ultimo_treino_dias);
  return (
    <div
      onClick={() => router.push(`/alunos/${a.id}`)}
      className={`${COLS} cursor-pointer border-b border-line-2 last:border-0 hover:bg-[#FCFCFD]`}
    >
      <div className="flex min-w-0 items-center gap-3 py-3">
        <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] text-[12px] font-bold ${AV[a.semaforo]}`}>
          {iniciais(a.nome)}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold">
            {a.nome}
            {a.dor_queixa && (
              <span className="text-warn" title={a.dor_queixa}>⚠</span>
            )}
          </p>
          <p className="truncate text-[11.5px] text-muted">
            {a.objetivo || "—"}
            {a.dor_queixa && ` · ${a.dor_queixa}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 py-3">
        <Dots n={a.sessoes_4sem} />
        <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${STCHIP[a.semaforo]}`}>
          {STATUS[a.semaforo].label}
        </span>
      </div>

      <div className={`py-3 text-[12px] ${ult.cold ? "font-semibold text-risk" : "text-ink-2"}`}>
        {ult.txt}
      </div>

      <div className="py-3 text-[12px]">
        {a.sessao_semana ? (
          <div className="flex items-center gap-2">
            <span className="h-[7px] w-[7px] flex-none rounded-full" style={{ background: a.sessao_semana.cor }} />
            <div className="min-w-0">
              <b className="block truncate text-[12.5px] font-semibold">
                {NOME_DIA[a.sessao_semana.dia_semana].slice(0, 3)} {a.sessao_semana.hora}
              </b>
              <span className="text-[10.5px] text-muted">
                com {a.sessao_semana.professor_nome} · {ESTADO_SESSAO[a.sessao_semana.estado].label.toLowerCase()}
              </span>
            </div>
          </div>
        ) : (
          <span className="font-semibold text-risk">Sem sessão</span>
        )}
      </div>

      <div className="py-3 text-[12px]">
        {a.tem_ficha ? (
          <>
            <b className="block truncate text-[12.5px] font-semibold">
              {a.ficha_divisao || "Treino"}
            </b>
            <span className="text-[10.5px] text-muted">{a.ficha_ex} exercícios</span>
          </>
        ) : (
          <span className="font-semibold text-warn">⚠ Sem ficha</span>
        )}
      </div>

      <div className="flex justify-end gap-1.5 py-3">
        <AcaoPrincipal a={a} slots={slots} semana={semana} />
        <ZapBtn telefone={a.telefone} />
      </div>
    </div>
  );
}

function CardAluno({
  a,
  slots,
  semana,
}: {
  a: AlunoD1;
  slots: SlotLivre[];
  semana: string;
}) {
  const router = useRouter();
  const ult = ultimoTexto(a.ultimo_treino_dias);
  return (
    <div
      onClick={() => router.push(`/alunos/${a.id}`)}
      className="cursor-pointer rounded-2xl border border-line bg-card p-3.5"
    >
      <div className="mb-3 flex items-center gap-3">
        <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] text-[12px] font-bold ${AV[a.semaforo]}`}>
          {iniciais(a.nome)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
            {a.nome} {a.dor_queixa && <span className="text-warn">⚠</span>}
          </p>
          <p className="truncate text-[11.5px] text-muted">
            {a.objetivo || "—"}
            {a.tem_ficha && a.ficha_divisao ? ` · ${a.ficha_divisao}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${STCHIP[a.semaforo]}`}>
          {STATUS[a.semaforo].label}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 border-y border-line-2 py-2.5">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-2">
            Uso · 4 semanas
          </p>
          <Dots n={a.sessoes_4sem} />
        </div>
        <div className="text-right">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-2">
            Último treino
          </p>
          <p className={`text-[12px] ${ult.cold ? "font-semibold text-risk" : "text-ink-2"}`}>
            {ult.txt}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 pt-3">
        <div className="min-w-0 flex-1 text-[12px]">
          {a.sessao_semana ? (
            <span className="flex items-center gap-1.5">
              <span className="h-[7px] w-[7px] flex-none rounded-full" style={{ background: a.sessao_semana.cor }} />
              <b className="font-semibold">
                {NOME_DIA[a.sessao_semana.dia_semana].slice(0, 3)} {a.sessao_semana.hora}
              </b>
              <span className="truncate text-muted">
                com {a.sessao_semana.professor_nome}
              </span>
            </span>
          ) : !a.tem_ficha ? (
            <span className="font-semibold text-warn">⚠ Sem ficha</span>
          ) : (
            <span className="font-semibold text-risk">Sem sessão esta semana</span>
          )}
        </div>
        <AcaoPrincipal a={a} slots={slots} semana={semana} />
        <ZapBtn telefone={a.telefone} />
      </div>
    </div>
  );
}
