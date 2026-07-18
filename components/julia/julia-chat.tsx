"use client";

// Chat de teste da Julia (Fase 3). Mobile-first, design D0. A Julia responde
// (via /api/julia) mas não executa nada. Histórico só na sessão do navegador —
// nada é persistido aqui. Sem streaming: resposta simples.

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGESTOES = ["Quanto custa o Elite?", "Abrem sábado?", "Quero agendar avaliação"];

export function JuliaChat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  async function enviar(texto: string) {
    const t = texto.trim();
    if (!t || loading) return;
    setErro(null);
    const proximo: Msg[] = [...msgs, { role: "user", content: t }];
    setMsgs(proximo);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch("/api/julia", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: proximo }),
      });
      const data = await r.json();
      if (!r.ok || data.erro) {
        setErro(data.erro ?? "Não consegui responder agora.");
      } else {
        setMsgs((m) => [...m, { role: "assistant", content: data.reply as string }]);
      }
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  const vazio = msgs.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-card border border-line bg-card">
      {/* Cabeçalho */}
      <div className="flex flex-none items-center gap-3 border-b border-line px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink font-display text-sm font-black italic text-white">
          J
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Julia</p>
          <p className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" />
            concierge do Elite
          </p>
        </div>
      </div>

      {/* Conversa */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-[#FAFAFB] p-4">
        {vazio && (
          <div className="m-auto max-w-[85%] text-center">
            <p className="text-[13px] font-medium text-ink">
              Oi! Aqui é a Julia. 👋
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              Pode perguntar o que quiser sobre o Elite — ou toque numa sugestão abaixo.
            </p>
          </div>
        )}

        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div
              key={i}
              className="max-w-[80%] self-end rounded-[14px] rounded-br-[4px] bg-ink px-3.5 py-2 text-[13px] leading-relaxed text-white"
            >
              {m.content}
            </div>
          ) : (
            <div
              key={i}
              className="max-w-[82%] self-start rounded-[14px] rounded-bl-[4px] border border-line bg-card px-3.5 py-2 text-[13px] leading-relaxed text-ink-2"
            >
              <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wide text-muted-2">
                Julia
              </span>
              {m.content}
            </div>
          ),
        )}

        {loading && (
          <div className="max-w-[82%] self-start rounded-[14px] rounded-bl-[4px] border border-line bg-card px-3.5 py-2.5">
            <span className="flex gap-1">
              <Dot /> <Dot d="150ms" /> <Dot d="300ms" />
            </span>
          </div>
        )}

        {erro && (
          <p className="self-center rounded-lg bg-red-soft px-3 py-1.5 text-center text-[11.5px] text-risk">
            {erro}
          </p>
        )}
        <div ref={fimRef} />
      </div>

      {/* Sugestões (só no início) */}
      {vazio && (
        <div className="flex flex-none flex-wrap gap-2 border-t border-line px-4 pt-3">
          {SUGESTOES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => enviar(s)}
              className="rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-muted-2"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Barra de envio */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(input);
        }}
        className="flex flex-none items-end gap-2 border-t border-line p-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(input);
            }
          }}
          rows={1}
          placeholder="Escreva uma mensagem…"
          className="max-h-28 min-h-[42px] flex-1 resize-none rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-muted-2"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex-none rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

function Dot({ d = "0ms" }: { d?: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-2"
      style={{ animationDelay: d }}
    />
  );
}
