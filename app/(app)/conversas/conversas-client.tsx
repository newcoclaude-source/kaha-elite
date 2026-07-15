"use client";

// Conversas — centro de relacionamento. Fila do dia → sugestão da Julia → enviar
// no WhatsApp. Painel de contexto do aluno à direita. "Falar com vários" no topo.

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import type { FilaItem } from "@/lib/julia/fila";
import { ROTULO_TIPO, type FilaTipo } from "@/lib/julia/templates";
import { iniciais, NOME_DIA } from "@/lib/kaha/ui";
import { marcarEnviadaAction } from "./actions";
import { FalarComVarios } from "./falar-com-varios";

const CHIP: Record<FilaTipo, string> = {
  confirmacao: "bg-warn-soft text-warn",
  pre_treino: "bg-blue-soft text-blue",
  pos_treino: "bg-ok-soft text-ok",
  resgate: "bg-red-soft text-risk",
  renovacao: "bg-line-2 text-muted",
  presenca: "bg-line-2 text-muted",
};
const AV: Record<string, string> = {
  verde: "bg-ok-soft text-ok",
  ambar: "bg-warn-soft text-warn",
  risco: "bg-red-soft text-risk",
};

export function waUrl(telefone: string | null, texto: string): string | null {
  const num = (telefone ?? "").replace(/\D/g, "");
  if (!num) return null;
  const ddi = num.startsWith("55") ? num : `55${num}`;
  return `https://wa.me/${ddi}?text=${encodeURIComponent(texto)}`;
}

export function ConversasClient({ itens }: { itens: FilaItem[] }) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [lista, setLista] = useState<FilaItem[]>(itens);
  const [selId, setSelId] = useState<string | null>(itens[0]?.aluno_id ?? null);
  const [aba, setAba] = useState<"hoje" | "todas">("hoje");
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [variosAberto, setVariosAberto] = useState(false);
  const [mobileThread, setMobileThread] = useState(false);

  const sel = useMemo(
    () => lista.find((i) => i.aluno_id === selId) ?? null,
    [lista, selId],
  );

  function textoDe(item: FilaItem): string {
    return textos[item.aluno_id] ?? item.mensagem;
  }

  function removerEir(alunoId: string) {
    setLista((prev) => {
      const next = prev.filter((i) => i.aluno_id !== alunoId);
      if (selId === alunoId) setSelId(next[0]?.aluno_id ?? null);
      return next;
    });
  }

  function enviar(item: FilaItem) {
    const texto = textoDe(item);
    const url = waUrl(item.telefone, texto);
    if (!url) {
      toast("Esse aluno não tem WhatsApp cadastrado", "erro");
      return;
    }
    window.open(url, "_blank", "noopener");
    startTransition(async () => {
      await marcarEnviadaAction({
        aluno_id: item.aluno_id,
        tipo: item.tipo,
        conteudo: texto,
      });
    });
    removerEir(item.aluno_id);
    setMobileThread(false);
    toast("Marcada como enviada");
  }

  const variosCandidatos = lista.filter((i) =>
    ["resgate", "presenca", "renovacao"].includes(i.tipo),
  );

  return (
    <div className="mx-auto flex h-[100dvh] max-w-[1400px] flex-col px-4 py-5 lg:px-6">
      {/* Topo */}
      <header className="mb-4 flex flex-none items-center gap-3">
        <div className="flex-1">
          <h1 className="title-brand text-2xl">Conversas</h1>
          <p className="text-xs text-muted">
            A Julia sugere, você revisa e envia.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVariosAberto(true)}
          className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink-2 hover:border-red hover:text-red"
        >
          <Icon name="alunos" className="h-4 w-4" />
          <span className="hidden sm:inline">Falar com vários</span>
        </button>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[300px_1fr] xl:grid-cols-[320px_1fr_300px]">
        {/* LISTA */}
        <div
          className={`flex min-h-0 flex-col overflow-hidden rounded-card border border-line bg-card ${
            mobileThread ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="flex h-5 flex-none items-center justify-between px-[18px] pb-3 pt-[18px]">
            <h3 className="text-[13px] font-bold">Caixa de entrada</h3>
            <span className="text-[11.5px] text-muted">
              {lista.length} {lista.length === 1 ? "pendente" : "pendentes"}
            </span>
          </div>
          <div className="mx-[18px] mb-3 flex flex-none gap-0.5 rounded-lg bg-line-2 p-[3px]">
            {(["hoje", "todas"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAba(a)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[11.5px] font-semibold ${
                  aba === a ? "bg-card text-ink shadow-sm" : "text-muted"
                }`}
              >
                {a === "hoje" ? "Fila de hoje" : "Todas"}
                {a === "hoje" && (
                  <span className="rounded-full bg-red px-1.5 text-[9.5px] text-white">
                    {lista.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {lista.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium text-ink">
                  Nenhuma mensagem pendente
                </p>
                <p className="mt-1 text-xs text-muted">
                  A semana está em dia. 🎯
                </p>
              </div>
            ) : (
              lista.map((it) => {
                const on = it.aluno_id === selId;
                return (
                  <button
                    key={it.aluno_id}
                    type="button"
                    onClick={() => {
                      setSelId(it.aluno_id);
                      setMobileThread(true);
                    }}
                    className={`flex w-full gap-2.5 rounded-xl p-2.5 text-left ${
                      on ? "bg-red-soft" : "hover:bg-line-2/60"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl text-[11px] font-bold ${
                        AV[it.contexto.semaforo]
                      }`}
                    >
                      {iniciais(it.aluno_nome)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink">
                        {it.aluno_nome}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-muted">
                        {textoDe(it)}
                      </span>
                      <span
                        className={`mt-1.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${CHIP[it.tipo]}`}
                      >
                        {ROTULO_TIPO[it.tipo]}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* THREAD + SUGESTÃO */}
        <div
          className={`min-h-0 flex-col overflow-hidden rounded-card border border-line bg-card ${
            mobileThread ? "flex" : "hidden lg:flex"
          }`}
        >
          {!sel ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted">
              Selecione uma conversa na fila.
            </div>
          ) : (
            <>
              <div className="flex flex-none items-center gap-3 border-b border-line px-[18px] py-3.5">
                <button
                  type="button"
                  onClick={() => setMobileThread(false)}
                  className="lg:hidden"
                  aria-label="Voltar"
                >
                  <Icon name="chevron" className="h-5 w-5 rotate-180 text-muted" />
                </button>
                <span
                  className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl text-[11px] font-bold ${AV[sel.contexto.semaforo]}`}
                >
                  {iniciais(sel.aluno_nome)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {sel.aluno_nome}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {sel.objetivo || "Elite"}
                    {sel.contexto.sessao_semana &&
                      ` · ${NOME_DIA[sel.contexto.sessao_semana.dia_semana]} ${sel.contexto.sessao_semana.hora} com ${sel.contexto.sessao_semana.professor_nome}`}
                  </p>
                </div>
              </div>

              {/* histórico (mensagens já enviadas) */}
              <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto bg-[#FAFAFB] p-[18px]">
                {sel.historico.length === 0 ? (
                  <p className="m-auto max-w-[70%] text-center text-xs text-muted-2">
                    Ainda sem mensagens enviadas para {iniciais(sel.aluno_nome)}.
                    A sugestão abaixo é o primeiro toque.
                  </p>
                ) : (
                  [...sel.historico].reverse().map((m, i) => (
                    <div
                      key={i}
                      className="max-w-[74%] self-end rounded-[13px] rounded-br-[4px] bg-ink px-3 py-2 text-[12.5px] leading-relaxed text-white"
                    >
                      <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wide text-red-hover">
                        Julia
                      </span>
                      {m.conteudo}
                    </div>
                  ))
                )}
              </div>

              {/* sugestão da Julia */}
              <div className="flex-none p-[18px] pt-3">
                <div className="relative overflow-hidden rounded-[13px] bg-gradient-to-br from-[#151519] to-[#0A0A0C] p-3.5">
                  <div className="mb-2 flex items-center gap-2">
                    <b className="text-[10px] font-bold uppercase tracking-wide text-white">
                      Sugestão da Julia
                    </b>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${CHIP[sel.tipo]}`}
                    >
                      {ROTULO_TIPO[sel.tipo]}
                    </span>
                    <span className="ml-auto text-[10px] text-muted">editável</span>
                  </div>
                  <textarea
                    value={textoDe(sel)}
                    onChange={(e) =>
                      setTextos((p) => ({ ...p, [sel.aluno_id]: e.target.value }))
                    }
                    rows={3}
                    className="w-full resize-none rounded-lg border border-white/10 bg-white/5 p-2.5 text-[12.5px] leading-relaxed text-[#D4D4D8] outline-none focus:border-white/25"
                  />
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => enviar(sel)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zap px-3 py-2 text-[11.5px] font-bold text-[#0B1A12] hover:brightness-105"
                    >
                      <Icon name="conversas" className="h-3.5 w-3.5" />
                      Enviar no WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removerEir(sel.aluno_id);
                        setMobileThread(false);
                      }}
                      className="rounded-lg px-3 py-2 text-[11.5px] font-semibold text-muted hover:text-ink"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* CONTEXTO */}
        {sel && (
          <div className="hidden min-h-0 flex-col overflow-y-auto rounded-card border border-line bg-card p-[18px] xl:flex">
            <Contexto item={sel} />
          </div>
        )}
      </div>

      {variosAberto && (
        <FalarComVarios
          candidatos={variosCandidatos}
          textoDe={textoDe}
          onEnviar={enviar}
          onClose={() => setVariosAberto(false)}
        />
      )}
    </div>
  );
}

function Contexto({ item }: { item: FilaItem }) {
  const c = item.contexto;
  const verdes = Math.max(0, Math.min(4, c.sessoes_4sem));
  return (
    <>
      <div className="border-b border-line-2 pb-3.5 text-center">
        <span
          className={`mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border-2 font-display text-lg font-black italic ${
            c.semaforo === "verde"
              ? "border-ok bg-ok-soft text-ok"
              : c.semaforo === "ambar"
                ? "border-warn bg-warn-soft text-warn"
                : "border-risk bg-red-soft text-risk"
          }`}
        >
          {iniciais(item.aluno_nome)}
        </span>
        <h2 className="font-display text-base font-extrabold italic">
          {item.aluno_nome}
        </h2>
        <p className="mt-0.5 text-[11.5px] text-muted">
          {item.objetivo || "Elite"}
          {c.elite_desde && ` · Elite ${c.elite_desde}`}
        </p>
      </div>

      <Bloco titulo="Uso · 4 semanas">
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded ${i < verdes ? "bg-ok" : "bg-[#FEE2E4]"}`}
            />
          ))}
        </div>
      </Bloco>

      {c.sessao_semana && (
        <Bloco titulo="Esta semana">
          <Kv>
            <b className="font-semibold">
              {NOME_DIA[c.sessao_semana.dia_semana]} {c.sessao_semana.hora}
            </b>{" "}
            com {c.sessao_semana.professor_nome}
          </Kv>
          {c.treino_do_dia && <Kv>{c.treino_do_dia}</Kv>}
        </Bloco>
      )}

      {(c.ultima_carga_texto || c.ultima_nota != null) && (
        <Bloco titulo="Última sessão">
          {c.ultima_carga_texto && (
            <Kv>
              Última carga <b className="font-semibold">{c.ultima_carga_texto}</b>
            </Kv>
          )}
          {c.ultima_nota != null && (
            <Kv>
              Avaliou com <b className="font-semibold">{c.ultima_nota}</b> de 5
            </Kv>
          )}
        </Bloco>
      )}

      <Bloco titulo="O que sabemos dela">
        <div className="rounded-[10px] border border-[#FDE68A] bg-warn-soft p-2.5 text-[11.5px] leading-relaxed text-[#78350F]">
          <b className="mb-1 block text-[9.5px] font-bold uppercase tracking-wide text-[#92400E]">
            Preferências
          </b>
          {c.preferencias || "Ainda sem preferências anotadas."}
        </div>
      </Bloco>

      <Link
        href={`/alunos/${item.aluno_id}`}
        className="mt-auto rounded-lg bg-ink py-2.5 text-center text-xs font-semibold text-white hover:opacity-90"
      >
        Ver perfil completo
      </Link>
    </>
  );
}

function Bloco({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-line-2 py-3.5 last:border-0">
      <p className="mb-2 text-[9.5px] font-bold uppercase tracking-wider text-muted-2">
        {titulo}
      </p>
      {children}
    </div>
  );
}

function Kv({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-xs text-ink-2 last:mb-0">{children}</p>
  );
}
