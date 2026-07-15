"use client";

// D2 — Professores (master-detail). Números derivados da grade real. Slot com
// aula fica travado. Cor por professor (estável, igual na Agenda e Alunos).

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { DIAS_UI } from "@/lib/kaha/grade";
import type { AulaSemana, ProfessorD2 } from "@/lib/kaha/professores";
import { ESTADO_SESSAO, iniciais, NOME_DIA } from "@/lib/kaha/ui";
import { toggleHorarioAction } from "./actions";
import {
  DesativarProfessorButton,
  EditarProfessorButton,
  NovoProfessorButton,
} from "./professor-form";

const HORAS = Array.from({ length: 16 }, (_, i) =>
  `${String(6 + i).padStart(2, "0")}:00`,
);

const CHIP_ESTADO: Record<string, string> = {
  realizada: "bg-ok-soft text-ok",
  confirmada: "bg-blue-soft text-blue",
  agendada: "bg-warn-soft text-warn",
  faltou: "bg-red-soft text-risk",
  pendente: "bg-line-2 text-muted",
  cancelada: "bg-line-2 text-muted-2",
};

export function ProfessoresD2({ profs }: { profs: ProfessorD2[] }) {
  const [selId, setSelId] = useState<string | null>(
    profs[0]?.professor.id ?? null,
  );
  const sel = profs.find((p) => p.professor.id === selId) ?? null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-6">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex-1">
          <h1 className="title-brand text-2xl">Professores</h1>
          <p className="text-xs text-muted">
            Quem atende, quando atende e quanto espaço ainda tem.
          </p>
        </div>
        <NovoProfessorButton />
      </header>

      {profs.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-card/60 px-6 py-12 text-center text-sm text-muted">
          Cadastre o primeiro professor para montar a grade.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[258px_1fr] lg:items-start">
          {/* MASTER */}
          <div className="rounded-card border border-line bg-card p-[18px]">
            <div className="mb-3.5 flex h-5 items-center justify-between">
              <h3 className="text-[13px] font-bold">Time</h3>
              <span className="text-[11.5px] text-muted">
                {profs.length} ativos
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {profs.map((p) => {
                const on = p.professor.id === selId;
                return (
                  <button
                    key={p.professor.id}
                    type="button"
                    onClick={() => setSelId(p.professor.id)}
                    className={`flex items-center gap-3 rounded-xl border p-2.5 text-left ${
                      on
                        ? "border-ink bg-ink"
                        : "border-transparent hover:border-line hover:bg-line-2/40"
                    }`}
                  >
                    <span
                      className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border-[1.5px] text-[12px] font-bold"
                      style={{
                        background: p.soft,
                        color: p.cor,
                        borderColor: p.cor,
                      }}
                    >
                      {iniciais(p.professor.nome)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-[13px] font-semibold ${on ? "text-white" : "text-ink"}`}
                      >
                        {p.professor.nome}
                      </span>
                      <span
                        className={`block truncate text-[11px] ${on ? "text-white/50" : "text-muted"}`}
                      >
                        {p.professor.especialidade || "—"}
                      </span>
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${on ? "text-white/50" : "text-muted"}`}
                    >
                      {p.aulas.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DETALHE */}
          {sel && <Detalhe key={sel.professor.id} p={sel} />}
        </div>
      )}
    </div>
  );
}

function Detalhe({ p }: { p: ProfessorD2 }) {
  const router = useRouter();
  const { toast } = useToast();

  const occupiedSet = useMemo(
    () => new Set(p.aulas.map((a) => `${a.dia_semana}-${a.hora}`)),
    [p.aulas],
  );
  const [grade, setGrade] = useState<Set<string>>(
    () => new Set(p.horarios.map((h) => `${h.dia_semana}-${h.hora}`)),
  );
  const [emVoo, setEmVoo] = useState<Set<string>>(new Set());
  useEffect(() => {
    setGrade(new Set(p.horarios.map((h) => `${h.dia_semana}-${h.hora}`)));
  }, [p.horarios]);

  const horariosTotal = grade.size;
  const livres = [...grade].filter((k) => !occupiedSet.has(k)).length;

  async function toggle(dia: number, hora: string) {
    const key = `${dia}-${hora}`;
    if (occupiedSet.has(key)) {
      toast("Há uma aula marcada nesse horário", "erro");
      return;
    }
    if (emVoo.has(key)) return;
    const marcar = !grade.has(key);
    setGrade((prev) => {
      const n = new Set(prev);
      if (marcar) n.add(key);
      else n.delete(key);
      return n;
    });
    setEmVoo((prev) => new Set(prev).add(key));
    const res = await toggleHorarioAction(p.professor.id, dia, hora, marcar);
    setEmVoo((prev) => {
      const n = new Set(prev);
      n.delete(key);
      return n;
    });
    if (!res.ok) {
      setGrade((prev) => {
        const n = new Set(prev);
        if (marcar) n.delete(key);
        else n.add(key);
        return n;
      });
      toast(res.erro ?? "Não foi possível atualizar", "erro");
    } else {
      router.refresh();
    }
  }

  return (
    <div className="overflow-hidden rounded-card border border-line bg-card">
      {/* header */}
      <div className="flex flex-wrap items-center gap-4 border-b border-line p-[18px]">
        <span
          className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl border-2 font-display text-xl font-black italic"
          style={{ background: p.soft, color: p.cor, borderColor: p.cor }}
        >
          {iniciais(p.professor.nome)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-extrabold italic">
            {p.professor.nome}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
            {p.professor.especialidade && <span>{p.professor.especialidade}</span>}
            {p.professor.telefone && <span>{p.professor.telefone}</span>}
            <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[10.5px] font-bold text-ok">
              {p.professor.ativo ? "Ativo" : "Inativo"}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <EditarProfessorButton professor={p.professor} />
          <DesativarProfessorButton id={p.professor.id} />
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 border-b border-line md:grid-cols-4">
        <Stat label="Aulas esta semana" valor={p.aulas.length} />
        <Stat label="Horários na grade" valor={horariosTotal} sufixo="/sem" />
        <Stat label="Ainda livres" valor={livres} cor="text-red" desc="espaço pra mais alunos" />
        <Stat
          label="Nota dos alunos"
          valor={p.nota_media != null ? p.nota_media.toString().replace(".", ",") : "—"}
          sufixo={p.nota_media != null ? "/5" : undefined}
          desc={`${p.nota_respostas} ${p.nota_respostas === 1 ? "resposta" : "respostas"} no mês`}
        />
      </div>

      {/* grade */}
      <div className="p-[18px]">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-[13px] font-bold">Grade de horários</h3>
            <p className="mt-0.5 text-[11.5px] text-muted">
              Toque para marcar quando {p.professor.nome.split(" ")[0]} atende.
              Horários com aula marcada ficam travados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => toast("A grade vale para todas as semanas", "info")}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[11.5px] font-semibold text-ink-2 hover:border-muted-2"
          >
            <Icon name="collapse" className="h-3.5 w-3.5" />
            Copiar semana anterior
          </button>
        </div>

        <div className="-mx-[18px] overflow-x-auto px-[18px]">
          <div className="min-w-[520px]">
            <div className="grid grid-cols-[46px_repeat(7,1fr)] gap-1">
              <div />
              {DIAS_UI.map((d) => (
                <div
                  key={d.dia}
                  className="pb-1 text-center text-[10px] font-bold uppercase tracking-wide text-muted"
                >
                  {d.label}
                </div>
              ))}
              {HORAS.map((hora) => (
                <FragmentRow
                  key={hora}
                  hora={hora}
                  cor={p.cor}
                  soft={p.soft}
                  grade={grade}
                  occupied={occupiedSet}
                  emVoo={emVoo}
                  onToggle={toggle}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-4 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <i className="h-3 w-3 rounded" style={{ background: p.soft, border: `1px solid ${p.cor}` }} />
            Atende
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-3 w-3 rounded" style={{ background: p.cor }} />
            Com aula marcada
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-3 w-3 rounded bg-line-2" />
            Não atende
          </span>
          <span className="ml-auto font-semibold" style={{ color: p.cor }}>
            {livres} horários livres nesta semana
          </span>
        </div>
      </div>

      {/* aulas da semana */}
      <div className="border-t border-line p-[18px]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[13px] font-bold">
            Aulas de {p.professor.nome.split(" ")[0]} · esta semana
          </h3>
          <span className="text-[11.5px] text-muted">
            {p.aulas.length} {p.aulas.length === 1 ? "aula" : "aulas"}
          </span>
        </div>
        {p.aulas.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-2">
            Nenhuma aula marcada nesta semana.
          </p>
        ) : (
          p.aulas.map((a) => <Aula key={a.sessao_id} a={a} />)
        )}
      </div>
    </div>
  );
}

function FragmentRow({
  hora,
  cor,
  soft,
  grade,
  occupied,
  emVoo,
  onToggle,
}: {
  hora: string;
  cor: string;
  soft: string;
  grade: Set<string>;
  occupied: Set<string>;
  emVoo: Set<string>;
  onToggle: (dia: number, hora: string) => void;
}) {
  return (
    <>
      <div className="flex h-7 items-center justify-end pr-1.5 text-[10.5px] text-muted-2">
        {hora}
      </div>
      {DIAS_UI.map((d) => {
        const key = `${d.dia}-${hora}`;
        const busy = occupied.has(key);
        const on = grade.has(key);
        return (
          <button
            key={d.dia}
            type="button"
            onClick={() => onToggle(d.dia, hora)}
            className={`h-7 rounded-md border transition-colors ${emVoo.has(key) ? "opacity-50" : ""}`}
            style={
              busy
                ? { background: cor, borderColor: cor }
                : on
                  ? { background: soft, borderColor: cor }
                  : { background: "#F1F1F3", borderColor: "transparent" }
            }
            title={busy ? "Aula marcada (travado)" : on ? "Atende" : "Não atende"}
          >
            {busy && (
              <Icon name="check" className="mx-auto h-3 w-3 text-white opacity-90" />
            )}
          </button>
        );
      })}
    </>
  );
}

function Stat({
  label,
  valor,
  sufixo,
  desc,
  cor,
}: {
  label: string;
  valor: React.ReactNode;
  sufixo?: string;
  desc?: string;
  cor?: string;
}) {
  return (
    <div className="border-r border-line-2 p-[15px] last:border-r-0">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-2">
        {label}
      </p>
      <p className={`font-display text-2xl font-black italic leading-none ${cor ?? "text-ink"}`}>
        {valor}
        {sufixo && (
          <span className="text-[13px] font-semibold not-italic text-muted-2">
            {sufixo}
          </span>
        )}
      </p>
      {desc && <p className="mt-1 text-[11px] text-muted">{desc}</p>}
    </div>
  );
}

function Aula({ a }: { a: AulaSemana }) {
  const chip = CHIP_ESTADO[a.estado] ?? "bg-line-2 text-muted";
  return (
    <div className="flex items-center gap-3 border-b border-line-2 py-2.5 last:border-0">
      <span className="w-[78px] flex-none font-display text-[13px] font-extrabold italic text-ink-2">
        {NOME_DIA[a.dia_semana].slice(0, 3)} {a.hora}
      </span>
      <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-line-2 text-[10.5px] font-bold text-ink-2">
        {iniciais(a.aluno_nome)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-semibold">{a.aluno_nome}</p>
        {a.treino && <p className="truncate text-[10.5px] text-muted">{a.treino}</p>}
      </div>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${chip}`}>
        {ESTADO_SESSAO[a.estado].label}
      </span>
    </div>
  );
}
