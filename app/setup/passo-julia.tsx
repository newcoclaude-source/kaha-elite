"use client";

// Passo 3.5 (opcional) · Conhecimento da Julia. É a primeira entrega do produto:
// as perguntas fazem o gestor sentir que está configurando algo impecável e
// capturam o que evitaria suporte manual depois. Sem mudança de schema — tudo
// mapeia em kaha_config + linhas de kaha_faq (tipo gravado como PREFIXO na
// pergunta: "limite:" / "escalacao:"; as perguntas dos alunos ficam sem prefixo).
// Vocabulário canônico: Julia é a concierge; nenhuma palavra proibida.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SetupData } from "@/lib/kaha/onboarding";
import { salvarFaq, salvarJulia } from "./actions";

const TONS = [
  { v: "proximo", label: "Próxima e animada" },
  { v: "premium", label: "Elegante e discreta" },
  { v: "energia", label: "Direta e objetiva" },
];

// Bloco 3 — perguntas dos alunos, pré-carregadas com placeholder de exemplo real.
const PERGUNTAS_ALUNOS: { q: string; ex: string }[] = [
  { q: "Aluno que faltou pode repor a sessão? Como funciona?", ex: "Ex.: pode repor em até 7 dias, num horário livre da grade." },
  { q: "Vocês abrem sábado e feriado?", ex: "Ex.: sábado das 8h às 13h; feriados a gente avisa antes." },
  { q: "Tem estacionamento? Como funciona?", ex: "Ex.: estacionamento próprio e gratuito para alunos." },
  { q: "O que o aluno precisa levar no primeiro treino?", ex: "Ex.: roupa de treino, toalha, garrafa de água e tênis." },
  { q: "Posso levar um convidado ou fazer uma aula experimental?", ex: "Ex.: a primeira aula é experimental e gratuita, agende no WhatsApp." },
  { q: "Quais são as formas de pagamento?", ex: "Ex.: Pix, cartão de crédito e boleto." },
];

const PREF_LIMITE = "limite:";
const PREF_ESCALACAO = "escalacao:";
const LABEL_LIMITE = "limite: O que a Julia nunca deve prometer ou falar";
const LABEL_ESCALACAO = "escalacao: Para quem a Julia encaminha quando não sabe";

function hhmm(v: string | null): string {
  return v ? v.slice(0, 5) : "";
}

export function PassoJulia({ inicial }: { inicial: SetupData }) {
  const router = useRouter();
  const c = inicial.config;

  // parse do FAQ cru
  const limiteIni = inicial.faq.find((f) => f.pergunta.startsWith(PREF_LIMITE))?.resposta ?? "";
  const escRow = inicial.faq.find((f) => f.pergunta.startsWith(PREF_ESCALACAO))?.resposta ?? "";
  const [escNomeIni = "", escWhatsIni = ""] = escRow ? escRow.split(" — ") : [];
  const respIni = PERGUNTAS_ALUNOS.map((p) => inicial.faq.find((f) => f.pergunta === p.q)?.resposta ?? "");

  // Bloco 1
  const [tom, setTom] = useState(c.tom ?? "proximo");
  const [jeito, setJeito] = useState(c.saudacao ?? "");
  const [ini, setIni] = useState(hhmm(c.janela_inicio) || "08:00");
  const [fim, setFim] = useState(hhmm(c.janela_fim) || "20:00");
  // Bloco 2 (itens 3-4 com default seguro pré-preenchido)
  const [valores, setValores] = useState<"sim" | "nao">(
    c.resposta_valores?.toLowerCase().includes("informar") ? "sim" : "nao",
  );
  const [prazo, setPrazo] = useState(c.prazo_cancelar ?? "24 horas");
  const [limite, setLimite] = useState(limiteIni);
  const [escNome, setEscNome] = useState(escNomeIni);
  const [escWhats, setEscWhats] = useState(escWhatsIni);
  // Bloco 3
  const [resp, setResp] = useState<string[]>(respIni);

  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function setResposta(i: number, v: string) {
    setResp((prev) => prev.map((r, idx) => (idx === i ? v : r)));
    setSalvo(false);
  }

  function salvar() {
    setErro(null);
    start(async () => {
      const r1 = await salvarJulia({
        tom,
        saudacao: jeito,
        janela_inicio: ini,
        janela_fim: fim,
        resposta_valores:
          valores === "sim"
            ? "Pode informar os valores ao aluno."
            : "Direcionar para a equipe.",
        prazo_cancelar: prazo,
      });
      if (!r1.ok) return setErro(r1.erro ?? "Não foi possível salvar.");

      const faq: { pergunta: string; resposta: string }[] = [];
      if (limite.trim()) faq.push({ pergunta: LABEL_LIMITE, resposta: limite.trim() });
      if (escNome.trim() || escWhats.trim())
        faq.push({ pergunta: LABEL_ESCALACAO, resposta: `${escNome.trim()} — ${escWhats.trim()}` });
      PERGUNTAS_ALUNOS.forEach((p, i) => {
        if (resp[i]?.trim()) faq.push({ pergunta: p.q, resposta: resp[i].trim() });
      });
      const r2 = await salvarFaq(faq);
      if (!r2.ok) return setErro(r2.erro ?? "Não foi possível salvar as perguntas.");
      setSalvo(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] leading-relaxed text-muted">
        Agora você vai ensinar a Julia sobre a sua academia. Quanto melhor as respostas,
        mais a Julia parece parte do seu time desde a primeira mensagem.
      </p>

      {/* BLOCO 1 — A voz da Julia */}
      <Bloco titulo="A voz da Julia">
        <Campo label="Como a Julia deve soar com seus alunos?">
          <div className="flex flex-wrap gap-2">
            {TONS.map((t) => (
              <button
                key={t.v}
                type="button"
                onClick={() => { setTom(t.v); setSalvo(false); }}
                className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${
                  tom === t.v ? "border-ink bg-ink text-white" : "border-line text-ink-2 hover:border-muted-2"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            value={jeito}
            onChange={(e) => { setJeito(e.target.value); setSalvo(false); }}
            placeholder="Algum jeito seu de falar? ex.: 'Bora!', 'meu querido'"
            className={INPUT}
          />
        </Campo>
        <Campo label="Em quais horários a Julia pode mandar mensagem para os alunos?">
          <div className="flex items-center gap-2 text-sm">
            <input type="time" value={ini} onChange={(e) => { setIni(e.target.value); setSalvo(false); }} className={TIME} />
            <span className="text-muted">até</span>
            <input type="time" value={fim} onChange={(e) => { setFim(e.target.value); setSalvo(false); }} className={TIME} />
          </div>
        </Campo>
      </Bloco>

      {/* BLOCO 2 — Regras que evitam problema */}
      <Bloco titulo="Regras que evitam problema">
        <Campo label="Se um aluno perguntar preço, a Julia pode responder?">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Opcao ativo={valores === "sim"} onClick={() => { setValores("sim"); setSalvo(false); }}>
              Sim, pode informar
            </Opcao>
            <Opcao ativo={valores === "nao"} onClick={() => { setValores("nao"); setSalvo(false); }}>
              Não, direcionar para a equipe
            </Opcao>
          </div>
        </Campo>
        <Campo label="Com quanta antecedência o aluno pode desmarcar sem perder a sessão?">
          <input value={prazo} onChange={(e) => { setPrazo(e.target.value); setSalvo(false); }} placeholder="Ex.: 24 horas" className={INPUT} />
        </Campo>
        <Campo label="Tem algo que a Julia NUNCA deve prometer ou falar?">
          <textarea
            value={limite}
            onChange={(e) => { setLimite(e.target.value); setSalvo(false); }}
            rows={2}
            placeholder="Ex.: prometer descontos, garantir resultados, liberar treino sem professor."
            className={`${INPUT} resize-none`}
          />
        </Campo>
        <Campo label="Quando a Julia não souber responder, para quem ela encaminha?">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={escNome} onChange={(e) => { setEscNome(e.target.value); setSalvo(false); }} placeholder="Nome (ex.: Recepção)" className={INPUT} />
            <input value={escWhats} onChange={(e) => { setEscWhats(e.target.value); setSalvo(false); }} inputMode="tel" placeholder="WhatsApp" className={INPUT} />
          </div>
        </Campo>
      </Bloco>

      {/* BLOCO 3 — Perguntas dos alunos */}
      <Bloco titulo="Perguntas dos alunos">
        <p className="-mt-1 text-[12px] text-muted">
          As dúvidas mais comuns já estão aqui — é só completar a resposta da casa.
        </p>
        {PERGUNTAS_ALUNOS.map((p, i) => (
          <div key={p.q} className="rounded-xl border border-line bg-surface-2 p-3">
            <p className="mb-1 text-[12.5px] font-semibold text-ink">{p.q}</p>
            <textarea
              value={resp[i]}
              onChange={(e) => setResposta(i, e.target.value)}
              rows={2}
              placeholder={p.ex}
              className="w-full resize-none rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-muted-2"
            />
          </div>
        ))}
      </Bloco>

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

const INPUT = "w-full rounded-[10px] border border-line px-3 py-2.5 text-sm outline-none focus:border-muted-2";
const TIME = "rounded-[10px] border border-line px-3 py-2 text-sm outline-none focus:border-muted-2";

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[13px] font-bold">{titulo}</h3>
      {children}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-ink-2">{label}</span>
      {children}
    </label>
  );
}

function Opcao({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
        ativo ? "border-ink bg-ink text-white" : "border-line text-ink-2 hover:border-muted-2"
      }`}
    >
      {children}
    </button>
  );
}
