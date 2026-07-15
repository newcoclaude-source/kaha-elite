"use client";

// D3 — Agenda. Grade semanal com cor por professor (estável, igual à de
// Professores/Alunos), toggle de horários livres, popover com a ação certa por
// estado da sessão e, no mobile, vista de dia. Só apresentação + as ações que
// já existem no servidor (mudarEstado / marcarSessao). Nada financeiro na UI.

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { Card, CardHeader } from "@/components/ui/card";
import { corProfessor } from "@/lib/kaha/cores";
import {
  ESTADO_SESSAO,
  iniciais,
  NOME_DIA,
  type EstadoSessao,
} from "@/lib/kaha/ui";
import type { AlunoFila, SessaoBoard, SlotLivre } from "@/lib/kaha/sessoes";
import { SemaforoUso } from "../alunos/semaforo-uso";
import { MarcarSessao } from "./marcar-sessao";
import { marcarSessaoAction, mudarEstadoAction } from "./actions";

const HORA_INI = 6;
const HORA_FIM = 21;
const HORA_H = 48; // px por hora — casa com o design de referência
const HORAS = Array.from({ length: HORA_FIM - HORA_INI + 1 }, (_, i) => HORA_INI + i);

type Coluna = { dia: number; label: string; diaMes: number; hoje: boolean };
type ProfInfo = { id: string; nome: string; count: number; cor: string; soft: string };

const CHIP_ESTADO: Record<EstadoSessao, string> = {
  pendente: "bg-line-2 text-muted",
  agendada: "bg-warn-soft text-warn",
  confirmada: "bg-blue-soft text-blue",
  realizada: "bg-ok-soft text-ok",
  faltou: "bg-red-soft text-risk",
  cancelada: "bg-line-2 text-muted-2",
};

// Posição vertical (px) de um horário "HH:MM" dentro da grade.
function topDe(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h - HORA_INI) * HORA_H + (m / 60) * HORA_H;
}

export function AgendaD3({
  semana,
  semanaLabel,
  naSemanaAtual,
  anterior,
  proxima,
  colunas,
  hojeISO,
  hojeDia,
  sessoes,
  livres,
  fila,
}: {
  semana: string;
  semanaLabel: string;
  naSemanaAtual: boolean;
  anterior: string;
  proxima: string;
  colunas: Coluna[];
  hojeISO: string;
  hojeDia: number | null;
  sessoes: SessaoBoard[];
  livres: SlotLivre[];
  fila: AlunoFila[];
}) {
  const { toast } = useToast();

  // Professores presentes nesta semana (aulas + grade livre), com cor estável.
  const profs = useMemo<ProfInfo[]>(() => {
    const m = new Map<string, ProfInfo>();
    for (const s of sessoes) {
      if (!s.professor_id) continue;
      const e =
        m.get(s.professor_id) ??
        ({
          id: s.professor_id,
          nome: s.professor_nome,
          count: 0,
          ...corProfessor(s.professor_id),
        } as ProfInfo);
      e.count += 1;
      m.set(s.professor_id, e);
    }
    for (const l of livres) {
      if (!m.has(l.professor_id)) {
        m.set(l.professor_id, {
          id: l.professor_id,
          nome: l.professor_nome,
          count: 0,
          ...corProfessor(l.professor_id),
        });
      }
    }
    return [...m.values()].sort((a, b) => b.count - a.count || a.nome.localeCompare(b.nome));
  }, [sessoes, livres]);

  const [ativos, setAtivos] = useState<Set<string>>(() => new Set(profs.map((p) => p.id)));
  const [mostrarLivres, setMostrarLivres] = useState(true);
  const [selDia, setSelDia] = useState<number>(hojeDia ?? 1);
  const [pop, setPop] = useState<{ sessao: SessaoBoard; anchor: AnchorRect } | null>(null);
  const [criar, setCriar] = useState<SlotLivre | null>(null);

  function toggleProf(id: string) {
    setAtivos((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const corDe = useMemo(() => {
    const m = new Map<string, { cor: string; soft: string }>();
    for (const p of profs) m.set(p.id, { cor: p.cor, soft: p.soft });
    return m;
  }, [profs]);

  const visSessoes = useMemo(
    () => sessoes.filter((s) => !s.professor_id || ativos.has(s.professor_id)),
    [sessoes, ativos],
  );
  const visLivres = useMemo(
    () => (mostrarLivres ? livres.filter((l) => ativos.has(l.professor_id)) : []),
    [livres, ativos, mostrarLivres],
  );

  const totalAulas = sessoes.length;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-6">
      {/* TOPO */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-[170px] flex-1">
          <h1 className="title-brand text-2xl">Agenda</h1>
          <p className="text-xs text-muted">Quem treina, com quem e a que horas.</p>
        </div>

        <div className="flex items-center gap-1 rounded-[10px] border border-line bg-card p-[3px]">
          <Link
            href={`/agenda?semana=${anterior}`}
            aria-label="Semana anterior"
            className="grid h-7 w-7 place-items-center rounded-[7px] text-ink-2 hover:bg-line-2"
          >
            <Icon name="chevron" className="h-4 w-4 rotate-180" />
          </Link>
          <Link
            href="/agenda"
            className="rounded-[7px] px-[11px] py-1 text-xs font-semibold text-ink-2 hover:bg-line-2"
          >
            Hoje
          </Link>
          <Link
            href={`/agenda?semana=${proxima}`}
            aria-label="Próxima semana"
            className="grid h-7 w-7 place-items-center rounded-[7px] text-ink-2 hover:bg-line-2"
          >
            <Icon name="chevron" className="h-4 w-4" />
          </Link>
        </div>

        <div className="font-display text-[15px] font-extrabold italic">{semanaLabel}</div>

        <label className="ml-auto flex cursor-pointer items-center gap-2 rounded-[10px] border border-line bg-card px-3 py-[9px] text-xs font-semibold text-ink-2">
          <input
            type="checkbox"
            checked={mostrarLivres}
            onChange={(e) => setMostrarLivres(e.target.checked)}
            className="peer sr-only"
          />
          <span className="relative h-[17px] w-[30px] flex-none rounded-full bg-line transition-colors peer-checked:bg-brand after:absolute after:left-[2px] after:top-[2px] after:h-[13px] after:w-[13px] after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-[13px]" />
          Horários livres
        </label>
      </div>

      {!naSemanaAtual && (
        <div className="mb-3">
          <Link href="/agenda" className="text-[11px] font-semibold text-brand hover:underline">
            ← voltar para esta semana
          </Link>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_274px]">
        {/* COLUNA PRINCIPAL */}
        <div className="min-w-0">
          {/* GRADE SEMANAL — desktop */}
          <div className="hidden overflow-hidden rounded-card border border-line bg-card lg:block">
            {/* cabeçalho de dias */}
            <div className="grid grid-cols-[54px_repeat(7,1fr)] border-b border-line">
              <div className="border-r border-line-2" />
              {colunas.map((c) => (
                <div
                  key={c.dia}
                  className="border-r border-line-2 px-1.5 py-2.5 text-center last:border-r-0"
                >
                  <div
                    className={`text-[10px] font-bold uppercase tracking-wide ${c.hoje ? "text-brand" : "text-muted"}`}
                  >
                    {c.label}
                  </div>
                  <div
                    className={`mx-auto mt-1 grid h-[30px] w-[30px] place-items-center rounded-full font-display text-[18px] font-extrabold italic leading-none ${c.hoje ? "bg-brand text-white" : ""}`}
                  >
                    {c.diaMes}
                  </div>
                </div>
              ))}
            </div>

            {/* corpo rolável */}
            <div className="max-h-[calc(100vh-230px)] overflow-auto">
              <div className="grid grid-cols-[54px_repeat(7,1fr)]">
                {/* coluna de horas */}
                <div className="border-r border-line-2">
                  {HORAS.map((h) => (
                    <div key={h} className="relative" style={{ height: HORA_H }}>
                      <span className="absolute right-[7px] top-[-7px] bg-card px-0.5 text-[10.5px] text-muted-2">
                        {String(h).padStart(2, "0")}:00
                      </span>
                    </div>
                  ))}
                </div>

                {/* colunas de dias */}
                {colunas.map((c) => (
                  <DiaColuna
                    key={c.dia}
                    coluna={c}
                    sessoes={visSessoes.filter((s) => s.dia_semana === c.dia)}
                    livres={visLivres.filter((l) => l.dia_semana === c.dia)}
                    corDe={corDe}
                    onEvento={openPop}
                    onLivre={(slot) => setCriar(slot)}
                  />
                ))}
              </div>
            </div>

            {/* legenda */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-3.5 py-2.5 text-[11px] text-muted">
              {profs.map((p) => (
                <span key={p.id} className="flex items-center gap-1.5">
                  <i className="h-2.5 w-2.5 rounded" style={{ background: p.cor }} />
                  {p.nome.split(" ")[0]}
                </span>
              ))}
              <span className="ml-auto flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded border border-dashed border-muted-2" />
                Aguarda confirmação
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="check" className="h-3 w-3 text-muted" />
                Realizada
              </span>
            </div>
          </div>

          {/* VISTA DE DIA — mobile */}
          <div className="rounded-card border border-line bg-card p-[18px] lg:hidden">
            <div className="mb-3 flex gap-1 overflow-x-auto">
              {colunas.map((c) => {
                const on = c.dia === selDia;
                return (
                  <button
                    key={c.dia}
                    type="button"
                    onClick={() => setSelDia(c.dia)}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-center ${on ? "bg-ink text-white" : "hover:bg-line-2"}`}
                  >
                    <div className={`text-[10px] font-bold uppercase ${on ? "text-white/70" : c.hoje ? "text-brand" : "text-muted"}`}>
                      {c.label}
                    </div>
                    <div className="font-display text-sm font-extrabold italic">{c.diaMes}</div>
                  </button>
                );
              })}
            </div>
            <DiaMobile
              dia={selDia}
              sessoes={visSessoes.filter((s) => s.dia_semana === selDia)}
              livres={visLivres.filter((l) => l.dia_semana === selDia)}
              corDe={corDe}
              onEvento={openPop}
              onLivre={(slot) => setCriar(slot)}
            />
          </div>
        </div>

        {/* RAIL */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <MiniCalendario semana={semana} hojeISO={hojeISO} />

          <Card className="lg:col-span-1">
            <CardHeader
              title="Professores"
              action={`${totalAulas} ${totalAulas === 1 ? "aula" : "aulas"}`}
            />
            {profs.length === 0 ? (
              <p className="py-2 text-[12px] text-muted-2">Nenhum professor com grade nesta semana.</p>
            ) : (
              profs.map((p) => {
                const on = ativos.has(p.id);
                return (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2.5 py-[7px]">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleProf(p.id)}
                      className="h-[15px] w-[15px] flex-none rounded-[4px] border-[1.5px]"
                      style={on ? { background: p.cor, borderColor: p.cor, accentColor: p.cor } : { borderColor: "#E7E7EA" }}
                    />
                    <span className="flex-1 text-[12.5px] font-medium">{p.nome.split(" ")[0]}</span>
                    <span className="text-[11px] text-muted">{p.count}</span>
                  </label>
                );
              })
            )}
          </Card>

          <Card>
            <CardHeader title="Sem sessão esta semana" action={String(fila.length)} />
            {fila.length === 0 ? (
              <p className="py-2 text-[12px] text-muted-2">
                Todos os alunos ativos já têm sessão nesta semana. 🎯
              </p>
            ) : (
              <div className="flex flex-col">
                {fila.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2.5 border-b border-line-2 py-2.5 last:border-0"
                  >
                    <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-line-2 text-[10.5px] font-bold text-ink-2">
                      {iniciais(a.nome)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/alunos/${a.id}`}
                        className="block truncate text-[12.5px] font-semibold hover:text-brand"
                      >
                        {a.nome}
                      </Link>
                      <div className="mt-0.5">
                        <SemaforoUso sessoes={a.sessoes_4sem} />
                      </div>
                    </div>
                    <MarcarSessao aluno={{ id: a.id, nome: a.nome }} semanaRef={semana} slots={livres} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* POPOVER de detalhe */}
      {pop && (
        <PopoverSessao
          sessao={pop.sessao}
          anchor={pop.anchor}
          cor={corDe.get(pop.sessao.professor_id ?? "")?.cor ?? "#71717A"}
          onClose={() => setPop(null)}
          toast={toast}
        />
      )}

      {/* MODAL: escolher aluno para um horário livre */}
      {criar && (
        <EscolherAluno
          slot={criar}
          semana={semana}
          fila={fila}
          onClose={() => setCriar(null)}
          toast={toast}
        />
      )}
    </div>
  );

  function openPop(sessao: SessaoBoard, anchor: AnchorRect) {
    setPop({ sessao, anchor });
  }
}

// ─────────────────────────────────────────────────────────────────────────────

type AnchorRect = { top: number; left: number; right: number; bottom: number };
type CorMap = Map<string, { cor: string; soft: string }>;

function eventoEstilo(estado: EstadoSessao, cor: string, soft: string): {
  className: string;
  style: React.CSSProperties;
} {
  if (estado === "faltou") {
    return {
      className: "border-l-[3px]",
      style: {
        borderLeftColor: "#A1A1AA",
        background:
          "repeating-linear-gradient(45deg,#FAFAFA,#FAFAFA 5px,#F1F1F3 5px,#F1F1F3 10px)",
      },
    };
  }
  if (estado === "agendada" || estado === "pendente") {
    return {
      className: "border border-dashed border-l-[3px]",
      style: { borderColor: cor, borderLeftColor: cor, background: "#FFFFFF" },
    };
  }
  return {
    className: "border-l-[3px]",
    style: { borderLeftColor: cor, background: soft },
  };
}

// Coluna de um dia na grade semanal (desktop).
function DiaColuna({
  coluna,
  sessoes,
  livres,
  corDe,
  onEvento,
  onLivre,
}: {
  coluna: Coluna;
  sessoes: SessaoBoard[];
  livres: SlotLivre[];
  corDe: CorMap;
  onEvento: (s: SessaoBoard, a: AnchorRect) => void;
  onLivre: (slot: SlotLivre) => void;
}) {
  return (
    <div
      className={`relative border-r border-line-2 last:border-r-0 ${coluna.hoje ? "bg-[#FFFAFA]" : ""}`}
    >
      {HORAS.map((h) => (
        <div key={h} className="border-b border-line-2" style={{ height: HORA_H }} />
      ))}

      {livres.map((l) => (
        <button
          key={`f-${l.professor_id}-${l.hora}`}
          type="button"
          onClick={() => onLivre(l)}
          className="group absolute left-[3px] right-[3px] flex items-center justify-center gap-1 rounded-[7px] border border-dashed border-line text-[9.5px] font-semibold text-muted-2 hover:border-solid hover:border-brand hover:bg-red-soft hover:text-brand"
          style={{ top: topDe(l.hora), height: HORA_H - 4 }}
          title={`Livre · ${l.professor_nome} · ${l.hora}`}
        >
          <Icon name="plus" className="h-2.5 w-2.5" />
          livre
        </button>
      ))}

      {sessoes.map((s) => {
        const { cor, soft } = corDe.get(s.professor_id ?? "") ?? {
          cor: "#71717A",
          soft: "#F1F1F3",
        };
        const est = eventoEstilo(s.estado, cor, soft);
        return (
          <button
            key={s.id}
            type="button"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onEvento(s, { top: r.top, left: r.left, right: r.right, bottom: r.bottom });
            }}
            className={`absolute left-[3px] right-[3px] flex flex-col justify-center gap-px overflow-hidden rounded-[7px] px-[7px] py-[5px] text-left ${est.className} ${s.estado === "realizada" ? "opacity-60" : ""}`}
            style={{ top: topDe(s.hora), height: HORA_H - 4, ...est.style }}
          >
            <b
              className={`truncate text-[11px] font-bold leading-tight ${s.estado === "faltou" ? "text-muted line-through" : ""}`}
              style={s.estado === "faltou" ? undefined : { color: cor }}
            >
              {s.aluno_nome}
            </b>
            <span className="truncate text-[9.5px] opacity-75" style={{ color: cor }}>
              {s.professor_nome.split(" ")[0]} · {rotuloEstado(s.estado)}
            </span>
            {s.estado === "realizada" && (
              <span className="absolute right-1.5 top-1.5" style={{ color: cor }}>
                <Icon name="check" className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function rotuloEstado(estado: EstadoSessao): string {
  if (estado === "faltou") return "faltou";
  if (estado === "confirmada") return "confirmada";
  if (estado === "agendada") return "a confirmar";
  if (estado === "realizada") return "feita";
  return ESTADO_SESSAO[estado].label.toLowerCase();
}

// Lista de um dia (mobile).
function DiaMobile({
  dia,
  sessoes,
  livres,
  corDe,
  onEvento,
  onLivre,
}: {
  dia: number;
  sessoes: SessaoBoard[];
  livres: SlotLivre[];
  corDe: CorMap;
  onEvento: (s: SessaoBoard, a: AnchorRect) => void;
  onLivre: (slot: SlotLivre) => void;
}) {
  // Junta sessões e livres numa timeline ordenada por hora.
  const linhas = useMemo(() => {
    const arr: Array<{ hora: string; sessao?: SessaoBoard; slot?: SlotLivre }> = [
      ...sessoes.map((s) => ({ hora: s.hora, sessao: s })),
      ...livres.map((l) => ({ hora: l.hora, slot: l })),
    ];
    return arr.sort((a, b) => a.hora.localeCompare(b.hora));
  }, [sessoes, livres]);

  if (linhas.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-2">Nada marcado em {NOME_DIA[dia]}.</p>;
  }

  return (
    <div className="flex flex-col">
      {linhas.map((ln, i) => {
        if (ln.sessao) {
          const s = ln.sessao;
          const { cor, soft } = corDe.get(s.professor_id ?? "") ?? { cor: "#71717A", soft: "#F1F1F3" };
          return (
            <div key={`s-${s.id}`} className="flex gap-3 border-b border-line-2 py-3 last:border-0">
              <div className="w-11 flex-none pt-0.5 font-display text-sm font-extrabold italic">
                {s.hora}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  onEvento(s, { top: r.top, left: r.left, right: r.right, bottom: r.bottom });
                }}
                className="min-w-0 flex-1 rounded-lg border-l-[3px] px-3 py-2.5 text-left"
                style={{ borderLeftColor: cor, background: soft }}
              >
                <b className="block truncate text-[13px]" style={{ color: cor }}>
                  {s.aluno_nome}
                </b>
                <span className="text-[11px]" style={{ color: cor, opacity: 0.75 }}>
                  {s.professor_nome.split(" ")[0]}
                </span>
                <div className="mt-1.5">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${CHIP_ESTADO[s.estado]}`}>
                    {ESTADO_SESSAO[s.estado].label}
                  </span>
                </div>
              </button>
            </div>
          );
        }
        const l = ln.slot!;
        return (
          <div key={`f-${i}`} className="flex gap-3 border-b border-line-2 py-3 last:border-0">
            <div className="w-11 flex-none pt-0.5 font-display text-sm font-extrabold italic text-muted-2">
              {l.hora}
            </div>
            <button
              type="button"
              onClick={() => onLivre(l)}
              className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2.5 text-left text-[11.5px] font-semibold text-muted-2 hover:border-brand hover:text-brand"
            >
              <Icon name="plus" className="h-3 w-3" />
              Livre · {l.professor_nome.split(" ")[0]}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

type ToastFn = (msg: string, tipo?: "sucesso" | "erro" | "info") => void;

function horaFim(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  return `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Popover de detalhe (padrão Google Calendar) com a ação certa por estado.
function PopoverSessao({
  sessao,
  anchor,
  cor,
  onClose,
  toast,
}: {
  sessao: SessaoBoard;
  anchor: AnchorRect;
  cor: string;
  onClose: () => void;
  toast: ToastFn;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const executarHref = `/agenda/${sessao.id}/executar`;

  function agir(novo: EstadoSessao) {
    startTransition(async () => {
      const res = await mudarEstadoAction(sessao.id, novo);
      if (res.ok) {
        onClose();
        router.refresh();
      } else {
        toast(res.erro ?? "Não foi possível atualizar.", "erro");
      }
    });
  }

  // Posição fixa: à direita da âncora, ou à esquerda se não couber.
  const W = 262;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const cabeDireita = anchor.right + 8 + W <= vw;
  const left = cabeDireita ? anchor.right + 8 : Math.max(8, anchor.left - 8 - W);
  const top = Math.min(Math.max(8, anchor.top), vh - 300);

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute w-[262px] overflow-hidden rounded-[14px] border border-line bg-card shadow-[0_16px_42px_rgba(10,10,12,.16),0_3px_10px_rgba(10,10,12,.06)]"
        style={{ left, top }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2.5 p-3.5 pb-0">
          <span className="min-h-[34px] w-1 flex-none self-stretch rounded" style={{ background: cor }} />
          <div className="min-w-0 flex-1">
            <b className="block text-sm font-bold leading-tight">{sessao.aluno_nome}</b>
            <span className="mt-0.5 block text-[11.5px] text-muted">
              {NOME_DIA[sessao.dia_semana]} · {sessao.hora} – {horaFim(sessao.hora)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-none p-0.5 text-muted-2 hover:text-ink"
            aria-label="Fechar"
          >
            <Icon name="chevron" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2.5 p-3.5">
          <div className="flex items-center gap-2.5 text-[11.5px] text-ink-2">
            <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md bg-line-2 text-[9px] font-bold text-ink-2">
              {iniciais(sessao.professor_nome)}
            </span>
            com <b className="font-semibold">{sessao.professor_nome}</b>
          </div>
          <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${CHIP_ESTADO[sessao.estado]}`}>
            {ESTADO_SESSAO[sessao.estado].label}
          </span>
        </div>

        <div className="flex gap-2 p-3.5 pt-0">
          {(sessao.estado === "confirmada" || sessao.estado === "realizada") && (
            <Link
              href={executarHref}
              className="flex-[1.4] rounded-[9px] bg-brand px-3 py-2.5 text-center text-[11.5px] font-semibold text-white hover:bg-brand-hover"
            >
              {sessao.estado === "realizada" ? "Ver treino" : "Dar o treino"}
            </Link>
          )}
          {sessao.estado === "agendada" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => agir("confirmada")}
              className="flex-[1.4] rounded-[9px] bg-brand px-3 py-2.5 text-[11.5px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
            >
              Confirmar
            </button>
          )}
          {sessao.estado === "pendente" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => agir("agendada")}
              className="flex-[1.4] rounded-[9px] bg-brand px-3 py-2.5 text-[11.5px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
            >
              Agendar
            </button>
          )}

          {(sessao.estado === "agendada" || sessao.estado === "confirmada") && (
            <button
              type="button"
              disabled={pending}
              onClick={() => agir("faltou")}
              className="flex-1 rounded-[9px] border border-line px-3 py-2.5 text-[11.5px] font-semibold text-ink-2 hover:border-muted-2 disabled:opacity-60"
            >
              Faltou
            </button>
          )}
          {sessao.estado !== "realizada" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => agir("cancelada")}
              className="flex-1 rounded-[9px] border border-line px-3 py-2.5 text-[11.5px] font-semibold text-ink-2 hover:border-muted-2 disabled:opacity-60"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal: escolher qual aluno vai ocupar um horário livre clicado na grade.
function EscolherAluno({
  slot,
  semana,
  fila,
  onClose,
  toast,
}: {
  slot: SlotLivre;
  semana: string;
  fila: AlunoFila[];
  onClose: () => void;
  toast: ToastFn;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function escolher(aluno: AlunoFila) {
    startTransition(async () => {
      const res = await marcarSessaoAction({
        aluno_id: aluno.id,
        professor_id: slot.professor_id,
        dia: slot.dia_semana,
        hora: slot.hora,
        semana_ref: semana,
      });
      if (res.ok) {
        onClose();
        router.refresh();
      } else {
        toast(res.erro ?? "Não foi possível marcar.", "erro");
        router.refresh();
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-2xl border border-line bg-card sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line p-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold">Marcar sessão</h2>
            <p className="truncate text-xs text-muted">
              {NOME_DIA[slot.dia_semana]} · {slot.hora} · {slot.professor_nome}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-2">
            Quem treina neste horário?
          </p>
          {fila.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              Todos os alunos ativos já têm sessão nesta semana.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {fila.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  disabled={pending}
                  onClick={() => escolher(a)}
                  className="flex min-h-[48px] items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-left hover:border-brand disabled:opacity-60"
                >
                  <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-card text-[10.5px] font-bold text-ink-2">
                    {iniciais(a.nome)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{a.nome}</span>
                    <span className="mt-0.5 block">
                      <SemaforoUso sessoes={a.sessoes_4sem} />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mini-calendário do mês (só leitura) — destaca a semana atual e "hoje".
function MiniCalendario({ semana, hojeISO }: { semana: string; hojeISO: string }) {
  const { titulo, celulas, fimSemana } = useMemo(() => {
    const ref = new Date(semana + "T12:00:00Z");
    const y = ref.getUTCFullYear();
    const m = ref.getUTCMonth();
    const primeiro = new Date(Date.UTC(y, m, 1));
    const dow = primeiro.getUTCDay(); // 0=Dom
    const lead = (dow + 6) % 7; // segunda-first
    const inicio = new Date(primeiro);
    inicio.setUTCDate(inicio.getUTCDate() - lead);

    const fim = new Date(semana + "T00:00:00Z");
    fim.setUTCDate(fim.getUTCDate() + 6);
    const fimSemana = fim.toISOString().slice(0, 10);

    const celulas = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio);
      d.setUTCDate(d.getUTCDate() + i);
      const iso = d.toISOString().slice(0, 10);
      return { iso, num: d.getUTCDate(), noMes: d.getUTCMonth() === m };
    });

    const titulo = primeiro.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    return { titulo, celulas, fimSemana };
  }, [semana]);

  return (
    <Card className="hidden xl:flex">
      <div className="mb-2.5 flex items-center justify-between">
        <b className="text-[12.5px] font-bold capitalize">{titulo}</b>
      </div>
      <div className="grid grid-cols-7 text-center">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
          <span key={i} className="pb-1.5 text-[9.5px] font-semibold text-muted-2">
            {d}
          </span>
        ))}
        {celulas.map((c) => {
          const naSemana = c.iso >= semana && c.iso <= fimSemana;
          const hoje = c.iso === hojeISO;
          return (
            <span key={c.iso} className="py-px">
              <span
                className={`mx-auto grid h-[26px] w-[26px] place-items-center rounded-full text-[11px] ${
                  hoje
                    ? "bg-brand font-bold text-white"
                    : naSemana
                      ? "bg-red-soft text-ink-2"
                      : c.noMes
                        ? "text-ink-2"
                        : "text-muted-2/50"
                }`}
              >
                {c.num}
              </span>
            </span>
          );
        })}
      </div>
    </Card>
  );
}
