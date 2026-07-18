"use client";

// Passo 3.5 (opcional) · Conhecimento da Julia. Primeira entrega do produto.
// REGRA DE UX: digitar é o último recurso — chips e múltipla escolha primeiro,
// sempre com escape "outro/personalizar" (nunca beco). Sem mudança de schema:
// mapeia em kaha_config + linhas de kaha_faq (tipo por PREFIXO: "limite:" /
// "escalacao:"; perguntas dos alunos sem prefixo, resposta = frase natural da
// voz da Julia, não o código do chip). Vocabulário canônico; nada proibido.

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SetupData } from "@/lib/kaha/onboarding";
import { salvarFaq, salvarJulia } from "./actions";

const TONS = [
  { v: "proximo", label: "Próxima e animada" },
  { v: "premium", label: "Elegante e discreta" },
  { v: "energia", label: "Direta e objetiva" },
];
const JEITOS = ["Bora!", "Partiu treino", "Tamo junto", "meu querido / minha querida"];
const NUNCAS = [
  "Prometer desconto",
  "Garantir resultado",
  "Liberar treino sem professor",
  "Falar de outros alunos",
  "Remarcar sem consultar o professor",
];
const JANELAS = [
  { key: "comercial", label: "Comercial · 8h–20h", ini: "08:00", fim: "20:00" },
  { key: "manha_noite", label: "Manhã e noite · 6h–21h", ini: "06:00", fim: "21:00" },
  { key: "personalizar", label: "Personalizar" },
];
const DIAS = [7, 10, 15];
const PAGAMENTOS = ["Pix", "Cartão", "Recorrência", "Dinheiro"];

type Opt = { key: string; label: string; frase: (c: string) => string; comp?: { label: string; ph: string } };
const MC: { q: string; opts: Opt[] }[] = [
  {
    q: "Aluno que faltou pode repor a sessão? Como funciona?",
    opts: [
      { key: "semana", label: "Sim, na mesma semana", frase: () => "Pode repor na mesma semana, num horário livre da grade." },
      { key: "xdias", label: "Sim, em até X dias", comp: { label: "dias", ph: "7" }, frase: (c) => `Pode repor em até ${c || "alguns"} dias, num horário livre.` },
      { key: "nao", label: "Não faz reposição", frase: () => "Não fazemos reposição de sessões." },
    ],
  },
  {
    q: "Vocês abrem sábado e feriado?",
    opts: [
      { key: "meio", label: "Sim, meio período", comp: { label: "horário", ph: "8h–13h" }, frase: (c) => `Sim, meio período${c ? ` (${c})` : ""}.` },
      { key: "normal", label: "Sim, normal", frase: () => "Sim, funcionamos normalmente." },
      { key: "nao", label: "Não abre", frase: () => "Não abrimos aos sábados e feriados." },
    ],
  },
  {
    q: "Tem estacionamento? Como funciona?",
    opts: [
      { key: "proprio", label: "Próprio gratuito", frase: () => "Temos estacionamento próprio e gratuito." },
      { key: "conveniado", label: "Conveniado", frase: () => "Temos estacionamento conveniado." },
      { key: "regiao", label: "Não, há na região", frase: () => "Não temos estacionamento próprio, mas há opções na região." },
    ],
  },
  {
    q: "O que o aluno precisa levar no primeiro treino?",
    opts: [
      { key: "disposicao", label: "Roupa e disposição", frase: () => "Só roupa de treino e disposição!" },
      { key: "toalha", label: "Toalha e garrafinha", frase: () => "Roupa de treino, toalha e garrafa de água." },
    ],
  },
  {
    q: "Posso levar um convidado ou fazer uma aula experimental?",
    opts: [
      { key: "gratis", label: "1 aula grátis", frase: () => "A primeira aula é experimental e gratuita." },
      { key: "agendando", label: "Sim, agendando", frase: () => "Sim, é só agendar com a gente." },
      { key: "nao", label: "Não", frase: () => "No momento não temos aula para convidados." },
    ],
  },
];

const PREF_LIMITE = "limite:";
const PREF_ESCALACAO = "escalacao:";
const LABEL_ESCALACAO = "escalacao: Para quem a Julia encaminha quando não sabe";
const Q_PAGAMENTO = "Quais são as formas de pagamento?";

function hhmm(v: string | null): string {
  return v ? v.slice(0, 5) : "";
}
function listaNatural(itens: string[]): string {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

export function PassoJulia({ inicial }: { inicial: SetupData }) {
  const router = useRouter();
  const c = inicial.config;

  // pré-preenchimento a partir do que já existe
  const iniH = hhmm(c.janela_inicio) || "08:00";
  const fimH = hhmm(c.janela_fim) || "20:00";
  const janelaIni =
    iniH === "08:00" && fimH === "20:00" ? "comercial" : iniH === "06:00" && fimH === "21:00" ? "manha_noite" : "personalizar";
  const jeitoParts = (c.saudacao ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const limiteRows = inicial.faq.filter((f) => f.pergunta.startsWith(PREF_LIMITE));
  const escRow = inicial.faq.find((f) => f.pergunta.startsWith(PREF_ESCALACAO))?.resposta ?? "";
  const [escNomeIni = "", escWhatsIni = ""] = escRow ? escRow.split(" — ") : [];

  // Bloco 1
  const [tom, setTom] = useState(c.tom ?? "proximo");
  const [jeitoSel, setJeitoSel] = useState<Set<string>>(new Set(JEITOS.filter((j) => jeitoParts.includes(j))));
  const [jeitoOutro, setJeitoOutro] = useState(jeitoParts.filter((p) => !JEITOS.includes(p)).join(", "));
  const [janela, setJanela] = useState(janelaIni);
  const [ini, setIni] = useState(iniH);
  const [fim, setFim] = useState(fimH);
  // Bloco 2
  const [diasResgate, setDiasResgate] = useState<number>(c.dias_resgate ?? 10);
  const [horaConf, setHoraConf] = useState(hhmm(c.hora_confirmacao) || "07:00");
  const [valores, setValores] = useState<"sim" | "nao">(c.resposta_valores?.toLowerCase().includes("informar") ? "sim" : "nao");
  const [prazo, setPrazo] = useState(c.prazo_cancelar ?? "24 horas");
  const [nuncaSel, setNuncaSel] = useState<Set<string>>(new Set(NUNCAS.filter((n) => limiteRows.some((r) => r.resposta === n))));
  const [nuncaOutro, setNuncaOutro] = useState(limiteRows.find((r) => !NUNCAS.includes(r.resposta))?.resposta ?? "");
  const [escNome, setEscNome] = useState(escNomeIni);
  const [escWhats, setEscWhats] = useState(escWhatsIni);
  // Bloco 3
  const [mcSel, setMcSel] = useState<string[]>(MC.map(() => ""));
  const [mcComp, setMcComp] = useState<string[]>(MC.map(() => ""));
  const [mcOutro, setMcOutro] = useState<string[]>(MC.map(() => ""));
  const [pagSel, setPagSel] = useState<Set<string>>(new Set());
  const [pagOutro, setPagOutro] = useState("");

  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const mudou = () => setSalvo(false);

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, v: string) {
    const n = new Set(set);
    n.has(v) ? n.delete(v) : n.add(v);
    setter(n);
    mudou();
  }
  function setMc(arr: string[], setter: (a: string[]) => void, i: number, v: string) {
    setter(arr.map((x, idx) => (idx === i ? v : x)));
    mudou();
  }
  function fraseMC(i: number): string {
    const sel = mcSel[i];
    if (!sel) return "";
    if (sel === "outro") return mcOutro[i].trim();
    const opt = MC[i].opts.find((o) => o.key === sel);
    return opt ? opt.frase(mcComp[i].trim()) : "";
  }
  function frasePagamento(): string {
    const todos = [...pagSel, ...(pagOutro.trim() ? [pagOutro.trim()] : [])];
    return todos.length ? `Aceitamos ${listaNatural(todos)}.` : "";
  }

  function salvar() {
    setErro(null);
    start(async () => {
      const jeito = [...jeitoSel, ...(jeitoOutro.trim() ? [jeitoOutro.trim()] : [])].join(", ");
      const r1 = await salvarJulia({
        tom,
        saudacao: jeito,
        janela_inicio: ini,
        janela_fim: fim,
        resposta_valores: valores === "sim" ? "Pode informar os valores ao aluno." : "Direcionar para a equipe.",
        prazo_cancelar: prazo,
        dias_resgate: diasResgate,
        hora_confirmacao: horaConf,
      });
      if (!r1.ok) return setErro(r1.erro ?? "Não foi possível salvar.");

      const faq: { pergunta: string; resposta: string }[] = [];
      // limites: um por chip marcado + outro
      nuncaSel.forEach((n) => faq.push({ pergunta: `${PREF_LIMITE} ${n}`, resposta: n }));
      if (nuncaOutro.trim()) faq.push({ pergunta: `${PREF_LIMITE} (outro)`, resposta: nuncaOutro.trim() });
      // escalação
      if (escNome.trim() || escWhats.trim())
        faq.push({ pergunta: LABEL_ESCALACAO, resposta: `${escNome.trim()} — ${escWhats.trim()}` });
      // perguntas dos alunos → frase natural
      MC.forEach((m, i) => {
        const f = fraseMC(i);
        if (f) faq.push({ pergunta: m.q, resposta: f });
      });
      const fp = frasePagamento();
      if (fp) faq.push({ pergunta: Q_PAGAMENTO, resposta: fp });

      const r2 = await salvarFaq(faq);
      if (!r2.ok) return setErro(r2.erro ?? "Não foi possível salvar as perguntas.");
      setSalvo(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[13px] leading-relaxed text-muted">
        Agora você vai ensinar a Julia sobre a sua academia. Quanto melhor as respostas,
        mais a Julia parece parte do seu time desde a primeira mensagem.
      </p>

      {/* BLOCO 1 — A voz da Julia */}
      <Bloco titulo="A voz da Julia">
        <Campo label="Como a Julia deve soar com seus alunos?">
          <ChipsUnicos opcoes={TONS.map((t) => ({ v: t.v, label: t.label }))} sel={tom} onSel={(v) => { setTom(v); mudou(); }} />
        </Campo>
        <Campo label="Algum jeito seu de falar? (pode marcar vários)">
          <ChipsVarios opcoes={JEITOS} sel={jeitoSel} onToggle={(v) => toggle(jeitoSel, setJeitoSel, v)} />
          <input value={jeitoOutro} onChange={(e) => { setJeitoOutro(e.target.value); mudou(); }} placeholder="+ adicionar a sua (ex.: 'firmeza')" className={INPUT} />
        </Campo>
        <Campo label="Em quais horários a Julia pode mandar mensagem?">
          <ChipsUnicos opcoes={JANELAS.map((j) => ({ v: j.key, label: j.label }))} sel={janela} onSel={(k) => {
            setJanela(k); mudou();
            const j = JANELAS.find((x) => x.key === k);
            if (j?.ini) { setIni(j.ini); setFim(j.fim!); }
          }} />
          {janela === "personalizar" && (
            <div className="flex items-center gap-2 text-sm">
              <input type="time" value={ini} onChange={(e) => { setIni(e.target.value); mudou(); }} className={TIME} />
              <span className="text-muted">até</span>
              <input type="time" value={fim} onChange={(e) => { setFim(e.target.value); mudou(); }} className={TIME} />
            </div>
          )}
        </Campo>
      </Bloco>

      {/* BLOCO 2 — Regras que evitam problema */}
      <Bloco titulo="Regras que evitam problema">
        <Campo label="Depois de quantos dias sem treinar a Julia deve ir atrás do aluno?">
          <ChipsUnicos opcoes={DIAS.map((d) => ({ v: String(d), label: `${d} dias` }))} sel={String(diasResgate)} onSel={(v) => { setDiasResgate(Number(v)); mudou(); }} />
        </Campo>
        <Campo label="A que horas a Julia confirma as sessões do dia?">
          <input type="time" value={horaConf} onChange={(e) => { setHoraConf(e.target.value); mudou(); }} className={TIME} />
        </Campo>
        <Campo label="Se um aluno perguntar preço, a Julia pode responder?">
          <ChipsUnicos
            opcoes={[{ v: "sim", label: "Sim, pode informar" }, { v: "nao", label: "Não, direcionar para a equipe" }]}
            sel={valores}
            onSel={(v) => { setValores(v as "sim" | "nao"); mudou(); }}
          />
        </Campo>
        <Campo label="Com quanta antecedência o aluno pode desmarcar sem perder a sessão?">
          <input value={prazo} onChange={(e) => { setPrazo(e.target.value); mudou(); }} placeholder="Ex.: 24 horas" className={INPUT} />
        </Campo>
        <Campo label="Tem algo que a Julia NUNCA deve prometer ou falar? (marque)">
          <ChipsVarios opcoes={NUNCAS} sel={nuncaSel} onToggle={(v) => toggle(nuncaSel, setNuncaSel, v)} />
          <input value={nuncaOutro} onChange={(e) => { setNuncaOutro(e.target.value); mudou(); }} placeholder="+ outro que a Julia nunca deve falar" className={INPUT} />
        </Campo>
        <Campo label="Quando a Julia não souber responder, para quem ela encaminha?">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={escNome} onChange={(e) => { setEscNome(e.target.value); mudou(); }} placeholder="Nome (ex.: Recepção)" className={INPUT} />
            <input value={escWhats} onChange={(e) => { setEscWhats(e.target.value); mudou(); }} inputMode="tel" placeholder="WhatsApp" className={INPUT} />
          </div>
        </Campo>
      </Bloco>

      {/* BLOCO 3 — Perguntas dos alunos */}
      <Bloco titulo="Perguntas dos alunos">
        <p className="-mt-1 text-[12px] text-muted">Escolha a opção da casa — a Julia monta a resposta na voz dela.</p>
        {MC.map((m, i) => (
          <div key={m.q} className="rounded-xl border border-line bg-surface-2 p-3">
            <p className="mb-2 text-[12.5px] font-semibold text-ink">{m.q}</p>
            <div className="flex flex-wrap gap-2">
              {m.opts.map((o) => (
                <Chip key={o.key} ativo={mcSel[i] === o.key} onClick={() => setMc(mcSel, setMcSel, i, o.key)}>
                  {o.label}
                </Chip>
              ))}
              <Chip ativo={mcSel[i] === "outro"} onClick={() => setMc(mcSel, setMcSel, i, "outro")}>
                Outro
              </Chip>
            </div>
            {mcSel[i] && mcSel[i] !== "outro" && MC[i].opts.find((o) => o.key === mcSel[i])?.comp && (
              <input
                value={mcComp[i]}
                onChange={(e) => setMc(mcComp, setMcComp, i, e.target.value)}
                placeholder={MC[i].opts.find((o) => o.key === mcSel[i])!.comp!.ph}
                className={`${INPUT} mt-2`}
              />
            )}
            {mcSel[i] === "outro" && (
              <input value={mcOutro[i]} onChange={(e) => setMc(mcOutro, setMcOutro, i, e.target.value)} placeholder="Escreva a resposta da casa" className={`${INPUT} mt-2`} />
            )}
          </div>
        ))}
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <p className="mb-2 text-[12.5px] font-semibold text-ink">{Q_PAGAMENTO}</p>
          <ChipsVarios opcoes={PAGAMENTOS} sel={pagSel} onToggle={(v) => toggle(pagSel, setPagSel, v)} />
          <input value={pagOutro} onChange={(e) => { setPagOutro(e.target.value); mudou(); }} placeholder="+ outra forma" className={`${INPUT} mt-2`} />
        </div>
      </Bloco>

      {erro && <p className="text-xs text-risk">{erro}</p>}
      <button type="button" onClick={salvar} disabled={pending} className="self-start rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pending ? "Salvando…" : salvo ? "Salvo ✓" : "Salvar"}
      </button>
    </div>
  );
}

const INPUT = "w-full rounded-[10px] border border-line px-3 py-2.5 text-sm outline-none focus:border-muted-2";
const TIME = "rounded-[10px] border border-line px-3 py-2 text-sm outline-none focus:border-muted-2";

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[13px] font-bold">{titulo}</h3>
      {children}
    </div>
  );
}
function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-ink-2">{label}</span>
      {children}
    </label>
  );
}
function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${
        ativo ? "border-ink bg-ink text-white" : "border-line text-ink-2 hover:border-muted-2"
      }`}
    >
      {children}
    </button>
  );
}
function ChipsUnicos({ opcoes, sel, onSel }: { opcoes: { v: string; label: string }[]; sel: string; onSel: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((o) => (
        <Chip key={o.v} ativo={sel === o.v} onClick={() => onSel(o.v)}>{o.label}</Chip>
      ))}
    </div>
  );
}
function ChipsVarios({ opcoes, sel, onToggle }: { opcoes: string[]; sel: Set<string>; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((o) => (
        <Chip key={o} ativo={sel.has(o)} onClick={() => onToggle(o)}>{o}</Chip>
      ))}
    </div>
  );
}
