// D8 — Dashboard. A primeira tela: o que precisa de você, a semana do Elite,
// aulas de hoje, atenção, movimento e a fila da Julia. Server component
// (display-only). TODOS os números vêm do banco. Capacidade da semana = SOMA
// das metas dos alunos (não alunos×N). Nada financeiro na UI.

import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { corProfessor } from "@/lib/kaha/cores";
import { ESTADO_SESSAO, iniciais, type EstadoSessao } from "@/lib/kaha/ui";
import type { DashboardData } from "@/lib/kaha/dashboard";
import { OnboardingPendingCard } from "@/components/onboarding/pending-card";

const CHIP: Record<EstadoSessao, string> = {
  realizada: "bg-ok-soft text-ok",
  confirmada: "bg-blue-soft text-blue",
  agendada: "bg-warn-soft text-warn",
  faltou: "bg-red-soft text-risk",
  pendente: "bg-line-2 text-muted",
  cancelada: "bg-line-2 text-muted-2",
};

export function DashboardD8({
  data,
  hojeDia,
  hojeLabel,
  diasParaFechar,
}: {
  data: DashboardData;
  hojeDia: number;
  hojeLabel: string;
  diasParaFechar: number;
}) {
  const semSessao = data.fila.length;
  const cap = data.capacidade || 1;
  const sessoesSemana = data.sessoes.length;
  const delta = sessoesSemana - data.sessoesPassada;

  // Donut da semana (base = capacidade).
  const R = 72;
  const C = 2 * Math.PI * R;
  const realArc = Math.min(1, data.realizadas / cap) * C;
  const marcArc = Math.min(1, data.marcadas / cap) * C;
  const restante = Math.max(0, data.capacidade - data.realizadas - data.marcadas);
  const usoPct = Math.round(((data.realizadas + data.marcadas) / cap) * 100);

  const aulasHoje = data.sessoes
    .filter((s) => s.dia_semana === hojeDia)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  const fecha =
    diasParaFechar <= 0
      ? "a semana fecha hoje"
      : `a semana fecha em ${diasParaFechar} ${diasParaFechar === 1 ? "dia" : "dias"}`;

  const maxB = Math.max(1, ...data.porSemana.map((b) => b.realizadas));
  const maxA = Math.max(1, ...data.usoPorProfessor.map((p) => p.aulas));

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-6">
      <header className="mb-4">
        <h1 className="title-brand text-2xl">Dashboard</h1>
        <p className="text-xs text-muted">A semana do Elite, aluno por aluno.</p>
      </header>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-4">
        {/* Onboarding pendente (some sozinho quando concluído) */}
        <OnboardingPendingCard />
        {/* HERO — precisa de você */}
        <section className="relative flex flex-col overflow-hidden rounded-card border border-ink bg-ink p-[18px] text-white">
          <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(225,29,46,.42),transparent_68%)]" />
          <div className="relative mb-3.5 flex h-5 items-center justify-between">
            <h3 className="text-[13px] font-bold">Precisa de você</h3>
            <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(225,29,46,.34)] bg-[rgba(225,29,46,.16)] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[#FF8A94]">
              {semSessao > 0 ? "Urgente" : "Em dia"}
            </span>
          </div>
          {semSessao > 0 ? (
            <>
              <div className="relative mb-1.5 font-display text-[34px] font-black italic leading-none">
                {semSessao}
              </div>
              <div className="relative text-[12px] leading-relaxed text-[#B4B4BD]">
                alunos <b className="text-white">sem sessão</b> nesta semana
                <br />
                {fecha}
              </div>
              <div className="relative mt-auto pt-3.5">
                <Link
                  href="/agenda"
                  className="inline-flex items-center justify-center gap-1.5 rounded-[9px] bg-brand px-3.5 py-2.5 text-[12px] font-bold text-white hover:bg-brand-hover"
                >
                  Resolver agora
                  <Icon name="chevron" className="h-3 w-3" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="relative mb-1.5 font-display text-[34px] font-black italic leading-none">
                0
              </div>
              <div className="relative text-[12px] leading-relaxed text-[#B4B4BD]">
                todos os alunos <b className="text-white">com sessão</b> nesta semana 🎯
              </div>
              <div className="relative mt-auto pt-3.5">
                <Link
                  href="/agenda"
                  className="inline-flex items-center justify-center gap-1.5 rounded-[9px] border border-white/20 px-3.5 py-2.5 text-[12px] font-bold text-white hover:border-white/40"
                >
                  Ver a semana
                </Link>
              </div>
            </>
          )}
        </section>

        {/* STAT — sessões da semana (X / capacidade) */}
        <Cartao title="Sessões da semana" acao="•••">
          <div className="mb-2 font-display text-[34px] font-extrabold italic leading-none">
            {sessoesSemana}
            <span className="text-[17px] not-italic font-semibold text-muted-2">
              /{data.capacidade}
            </span>
          </div>
          <Delta valor={delta} legenda="vs. semana passada" />
          <p className="mt-1 text-[11px] text-muted">capacidade = soma das metas</p>
        </Cartao>

        {/* STAT — alunos em risco */}
        <Cartao title="Alunos em risco" acao="•••">
          <div
            className={`mb-2 font-display text-[34px] font-extrabold italic leading-none ${data.emRisco > 0 ? "text-risk" : "text-ink"}`}
          >
            {data.emRisco}
          </div>
          <p className="text-[11.5px] text-muted">
            {data.emRisco > 0
              ? `mais frio: ${data.maisFrioSessoes ?? 0} sessões nas últimas 4 semanas`
              : "ninguém em risco agora 🎯"}
          </p>
        </Cartao>

        {/* DONUT — a semana do Elite */}
        <Cartao title="A semana do Elite" acao={`${data.alunosAtivos} alunos`}>
          <div className="relative mx-auto my-1.5 h-[186px] w-[186px]">
            <svg width="186" height="186" viewBox="0 0 186 186" className="-rotate-90">
              <circle cx="93" cy="93" r={R} fill="none" stroke="#F1F1F3" strokeWidth="20" />
              {data.realizadas > 0 && (
                <circle
                  cx="93" cy="93" r={R} fill="none" stroke="#0A0A0C" strokeWidth="20"
                  strokeLinecap="round" strokeDasharray={`${realArc} ${C - realArc}`}
                />
              )}
              {data.marcadas > 0 && (
                <circle
                  cx="93" cy="93" r={R} fill="none" stroke="#E11D2E" strokeWidth="20"
                  strokeLinecap="round" strokeDasharray={`${marcArc} ${C - marcArc}`}
                  strokeDashoffset={`-${realArc}`}
                />
              )}
            </svg>
            <div className="absolute inset-0 grid place-content-center text-center">
              <small className="block text-[10.5px] tracking-wide text-muted">USO</small>
              <b className="font-display text-[28px] font-black italic leading-tight">{usoPct}%</b>
            </div>
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <LegendaDonut cor="#0A0A0C" label="Sessões realizadas" valor={data.realizadas} />
            <LegendaDonut cor="#E11D2E" label="Marcadas p/ acontecer" valor={data.marcadas} />
            <LegendaDonut cor="#E7E7EA" label="Capacidade livre" valor={restante} />
          </div>
        </Cartao>

        {/* AULAS DE HOJE */}
        <Cartao title={`Aulas de hoje · ${hojeLabel}`} acaoHref="/agenda" acao="Ver agenda →" span2>
          {aulasHoje.length === 0 ? (
            <Vazio>Nenhuma aula marcada para hoje.</Vazio>
          ) : (
            <div className="flex flex-col">
              {aulasHoje.map((s) => (
                <div key={s.id} className="flex items-center gap-3 border-b border-line-2 py-2.5 last:border-0">
                  <span className="w-[46px] flex-none font-display text-[14px] font-extrabold italic">{s.hora}</span>
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-line-2 text-[11px] font-bold text-ink-2">
                    {iniciais(s.aluno_nome)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{s.aluno_nome}</p>
                    <p className="truncate text-[11.5px] text-muted">com {s.professor_nome}</p>
                  </div>
                  <span className={`flex-none rounded-full px-2 py-1 text-[10.5px] font-bold ${CHIP[s.estado]}`}>
                    {ESTADO_SESSAO[s.estado].label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Cartao>

        {/* PRECISA DE ATENÇÃO */}
        <Cartao title="Precisa de atenção" acaoHref="/alunos" acao="Ver todos →">
          {data.fila.length === 0 ? (
            <Vazio>Ninguém sem sessão esta semana. 🎯</Vazio>
          ) : (
            data.fila.slice(0, 4).map((a) => {
              const risco = a.sessoes_4sem <= 1;
              return (
                <div key={a.id} className="flex items-center gap-3 border-b border-line-2 py-2.5 last:border-0">
                  <span
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] text-[11px] font-bold"
                    style={risco ? { background: "#FEF2F3", color: "#B91C1C" } : { background: "#FFFBEB", color: "#D97706" }}
                  >
                    {iniciais(a.nome)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/alunos/${a.id}`} className="block truncate text-[13px] font-semibold hover:text-brand">
                      {a.nome}
                    </Link>
                    <span
                      className="mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[11px]"
                      style={risco ? { background: "#FEF2F3", color: "#B91C1C" } : { background: "#FFFBEB", color: "#D97706" }}
                    >
                      {a.sessoes_4sem} sessões nas últimas 4 semanas
                    </span>
                  </div>
                  <Link href="/agenda" className="flex-none rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-semibold text-white hover:opacity-90">
                    Marcar
                  </Link>
                </div>
              );
            })
          )}
        </Cartao>

        {/* O QUE OS PROFESSORES RELATARAM (sem dado ainda) */}
        <Cartao title="O que os professores relataram" acao="Ver tudo →" acaoHref="/agenda" span2>
          <Vazio>
            Quando os professores concluírem os treinos, os relatos (empenho, evolução e
            queixas) aparecem aqui.
          </Vazio>
        </Cartao>

        {/* EVOLUÇÕES DA SEMANA (sem dado ainda) */}
        <Cartao title="Evoluções da semana">
          <Vazio>Os PRs e retornos aparecem quando houver cargas registradas nas sessões.</Vazio>
        </Cartao>

        {/* SESSÕES REALIZADAS POR SEMANA */}
        <Cartao title="Sessões realizadas por semana" acao="Últimas 8 semanas" span2>
          <div className="flex flex-1 items-end gap-2.5 pt-1" style={{ minHeight: 132 }}>
            {data.porSemana.map((b) => {
              const atual = b.semana === data.semana;
              return (
                <div key={b.semana} className="flex h-full flex-1 flex-col justify-end gap-1.5">
                  <div className="flex flex-1 items-end">
                    <div
                      className="w-full rounded-t-[5px]"
                      style={{
                        height: `${(b.realizadas / maxB) * 100}%`,
                        minHeight: b.realizadas > 0 ? 4 : 0,
                        background: atual ? "#E11D2E" : "#0A0A0C",
                      }}
                      title={`${b.realizadas} realizadas`}
                    />
                  </div>
                  <em className={`text-center text-[10.5px] not-italic ${atual ? "font-bold text-brand" : "text-muted"}`}>
                    {b.label}
                  </em>
                </div>
              );
            })}
          </div>
        </Cartao>

        {/* JULIA */}
        <section className="relative flex flex-col overflow-hidden rounded-card border border-ink bg-[linear-gradient(160deg,#151519,#0A0A0C)] p-[18px] text-white">
          <div className="pointer-events-none absolute -bottom-14 -right-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(225,29,46,.3),transparent_70%)]" />
          <div className="relative mb-3.5 flex h-5 items-center justify-between">
            <h3 className="text-[13px] font-bold">Julia · concierge</h3>
            <span className="text-[11.5px] text-[#6C6C76]">Hoje</span>
          </div>
          {data.filaJulia > 0 ? (
            <>
              <h4 className="relative font-display text-[17px] font-black italic leading-tight">
                {data.filaJulia} {data.filaJulia === 1 ? "mensagem pronta" : "mensagens prontas"}
                <br />
                pra <em className="text-red-hover">hoje</em>
              </h4>
              <p className="relative mt-2 text-[11.5px] leading-relaxed text-[#A8A8B2]">
                Revise o contexto de cada aluno e envie em um toque.
              </p>
            </>
          ) : (
            <>
              <h4 className="relative font-display text-[17px] font-black italic leading-tight">
                Nada na fila <em className="text-red-hover">agora</em>
              </h4>
              <p className="relative mt-2 text-[11.5px] leading-relaxed text-[#A8A8B2]">
                Quando houver aluno pra confirmar, lembrar ou chamar de volta, aparece aqui.
              </p>
            </>
          )}
          <div className="relative mt-auto pt-3.5">
            <Link
              href="/conversas"
              className="block rounded-[9px] bg-brand py-2.5 text-center text-[12.5px] font-bold text-white hover:bg-brand-hover"
            >
              Abrir conversas
            </Link>
          </div>
        </section>

        {/* ALUNOS POR PROFESSOR */}
        <Cartao title="Alunos por professor · esta semana" acaoHref="/professores" acao="Ver professores →" span2>
          {data.usoPorProfessor.length === 0 ? (
            <Vazio>Nenhuma aula marcada nesta semana.</Vazio>
          ) : (
            data.usoPorProfessor.map((p) => {
              const { cor } = corProfessor(p.professor_id);
              return (
                <div key={p.professor_id ?? p.nome} className="mb-3 flex items-center gap-3 last:mb-0">
                  <div className="w-[74px] flex-none truncate text-[12.5px] font-semibold">
                    {p.nome.split(" ")[0]}
                  </div>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line-2">
                    <div className="h-full rounded-full" style={{ width: `${(p.aulas / maxA) * 100}%`, background: cor }} />
                  </div>
                  <div className="w-14 flex-none text-right text-[11.5px] text-muted">
                    {p.aulas} {p.aulas === 1 ? "aula" : "aulas"}
                  </div>
                </div>
              );
            })
          )}
        </Cartao>

        {/* COMO OS ALUNOS AVALIARAM (sem dado ainda) */}
        <Cartao title="Como os alunos avaliaram" acao="0 respostas">
          <Vazio>As avaliações dos alunos aparecem quando eles responderem o questionário do treino.</Vazio>
        </Cartao>
      </div>
    </div>
  );
}

// ── auxiliares ───────────────────────────────────────────────────────────────

function Cartao({
  title,
  acao,
  acaoHref,
  span2,
  children,
}: {
  title: string;
  acao?: string;
  acaoHref?: string;
  span2?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex flex-col rounded-card border border-line bg-card p-[18px] ${span2 ? "md:col-span-2" : ""}`}>
      <div className="mb-3.5 flex h-5 items-center justify-between gap-3">
        <h3 className="truncate text-[13px] font-bold leading-5">{title}</h3>
        {acao &&
          (acaoHref ? (
            <Link href={acaoHref} className="flex-none text-[11.5px] leading-5 text-muted hover:text-brand">
              {acao}
            </Link>
          ) : (
            <span className="flex-none text-[11.5px] leading-5 text-muted">{acao}</span>
          ))}
      </div>
      {children}
    </section>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center py-6 text-center text-[12px] leading-relaxed text-muted-2">
      <p className="max-w-[34ch]">{children}</p>
    </div>
  );
}

function Delta({ valor, legenda }: { valor: number; legenda: string }) {
  if (valor === 0) {
    return (
      <div className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-muted">
        estável <span className="font-normal text-muted">{legenda}</span>
      </div>
    );
  }
  const up = valor > 0;
  return (
    <div className={`inline-flex items-center gap-1 text-[11.5px] font-semibold ${up ? "text-ok" : "text-risk"}`}>
      {up ? "↗" : "↘"} {up ? "+" : ""}
      {valor} <span className="font-normal text-muted">{legenda}</span>
    </div>
  );
}

function LegendaDonut({ cor, label, valor }: { cor: string; label: string; valor: number }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-ink-2">
      <i className="h-2.5 w-2.5 flex-none rounded" style={{ background: cor }} />
      {label}
      <b className="ml-auto font-semibold">{valor}</b>
    </div>
  );
}
