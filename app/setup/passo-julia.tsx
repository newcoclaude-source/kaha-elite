"use client";

// Passo 3.5 (opcional) · Conhecimento da Julia. Grava em campos que JÁ EXISTEM
// em kaha_config (tom, janelas, resposta_valores, prazo_cancelar) + kaha_faq.
// 6 perguntas comuns vêm pré-carregadas (FAQ_PADRAO) — o gestor só responde.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SetupData } from "@/lib/kaha/onboarding";
import { salvarFaq, salvarJulia } from "./actions";

const TONS = [
  { v: "proximo", label: "Próximo" },
  { v: "energia", label: "Energia" },
  { v: "premium", label: "Premium" },
];

function hhmm(v: string | null): string {
  return v ? v.slice(0, 5) : "";
}

export function PassoJulia({ inicial }: { inicial: SetupData }) {
  const router = useRouter();
  const c = inicial.config;
  const [tom, setTom] = useState(c.tom ?? "proximo");
  const [ini, setIni] = useState(hhmm(c.janela_inicio) || "08:00");
  const [fim, setFim] = useState(hhmm(c.janela_fim) || "20:00");
  const [valores, setValores] = useState(c.resposta_valores ?? "");
  const [prazo, setPrazo] = useState(c.prazo_cancelar ?? "");
  const [faq, setFaq] = useState(inicial.faq.map((f) => ({ ...f })));
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function setResposta(i: number, valor: string) {
    setFaq((prev) => prev.map((f, idx) => (idx === i ? { ...f, resposta: valor } : f)));
    setSalvo(false);
  }

  function salvar() {
    setErro(null);
    start(async () => {
      const r1 = await salvarJulia({
        tom,
        janela_inicio: ini,
        janela_fim: fim,
        resposta_valores: valores,
        prazo_cancelar: prazo,
      });
      if (!r1.ok) return setErro(r1.erro ?? "Não foi possível salvar.");
      const r2 = await salvarFaq(faq.map((f) => ({ pergunta: f.pergunta, resposta: f.resposta })));
      if (!r2.ok) return setErro(r2.erro ?? "Não foi possível salvar o FAQ.");
      setSalvo(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted">
        O que a Julia precisa saber para responder aos alunos com a voz da casa. Tudo
        opcional — dá pra ajustar depois em Configurações.
      </p>

      {/* Tom */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-ink-2">Tom da conversa</span>
        <div className="flex gap-2">
          {TONS.map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => setTom(t.v)}
              className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${
                tom === t.v
                  ? "border-ink bg-ink text-white"
                  : "border-line text-ink-2 hover:border-muted-2"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Janela de envio */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-ink-2">Janela de mensagens</span>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="time"
            value={ini}
            onChange={(e) => setIni(e.target.value)}
            className="rounded-[10px] border border-line px-3 py-2 outline-none focus:border-muted-2"
          />
          <span className="text-muted">até</span>
          <input
            type="time"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="rounded-[10px] border border-line px-3 py-2 outline-none focus:border-muted-2"
          />
        </div>
      </div>

      {/* Resposta a valores + prazo de cancelamento */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-ink-2">
          Quando perguntarem sobre valores, a Julia responde…
        </span>
        <textarea
          value={valores}
          onChange={(e) => setValores(e.target.value)}
          rows={2}
          placeholder="Ex.: encaminha para um consultor humano tratar o plano."
          className="w-full resize-none rounded-[10px] border border-line px-3 py-2.5 text-sm outline-none focus:border-muted-2"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-ink-2">Prazo para cancelar/remarcar</span>
        <input
          value={prazo}
          onChange={(e) => setPrazo(e.target.value)}
          placeholder="Ex.: até 3 horas antes da sessão"
          className="w-full rounded-[10px] border border-line px-3 py-2.5 text-sm outline-none focus:border-muted-2"
        />
      </label>

      {/* FAQ */}
      <div className="flex flex-col gap-2">
        <span className="text-[12px] font-semibold text-ink-2">Perguntas frequentes</span>
        {faq.map((f, i) => (
          <div key={i} className="rounded-xl border border-line bg-surface-2 p-3">
            <p className="mb-1 text-[12.5px] font-semibold text-ink">{f.pergunta}</p>
            <textarea
              value={f.resposta}
              onChange={(e) => setResposta(i, e.target.value)}
              rows={2}
              placeholder="Resposta da casa…"
              className="w-full resize-none rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-muted-2"
            />
          </div>
        ))}
      </div>

      {erro && <p className="text-xs text-risk">{erro}</p>}
      <button
        type="button"
        onClick={salvar}
        disabled={pending}
        className="self-start rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Salvando…" : salvo ? "Salvo ✓" : "Salvar"}
      </button>
    </div>
  );
}
