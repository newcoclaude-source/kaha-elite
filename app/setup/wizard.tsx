"use client";

// Wizard de onboarding self-service. Ordem: Academia(+WhatsApp) → Planos →
// Importar alunos → Conhecimento da Julia (opcional) → Professores e equipe
// (opcional). Obrigatórios: 1–3. Mobile-first, design D0, fora do shell.
// Sem ToastProvider aqui → feedback de erro inline.

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PerfilEquipe, SetupData } from "@/lib/kaha/onboarding";
import { JuliaChat, type ChatMensagem } from "@/components/julia/julia-chat";
import { CALIBRACAO_ATIVA } from "@/lib/julia/flags";
import { corProfessor } from "@/lib/kaha/cores";
import { iniciais } from "@/lib/kaha/ui";
import { ImportarAlunos } from "./import-alunos";
import { PassoJulia } from "./passo-julia";
import {
  concluirOnboarding,
  criarPlano,
  criarProfessor,
  criarUsuario,
  removerPlano,
  removerProfessor,
  removerUsuario,
  salvarAcademia,
  salvarConexaoWhatsapp,
} from "./actions";

const PASSOS = [
  { label: "Academia", obrig: true },
  { label: "Planos", obrig: true },
  { label: "Importar alunos", obrig: true },
  { label: "Conhecimento da Julia", obrig: false },
  { label: "Professores e equipe", obrig: false },
  { label: "Experimente a Julia", obrig: false },
  { label: "Conectar WhatsApp", obrig: false },
] as const;

const INPUT = "w-full rounded-[10px] border border-line px-3 py-2.5 text-sm outline-none focus:border-muted-2";
const TIME_IN = "rounded-[10px] border border-line px-3 py-2.5 text-sm outline-none focus:border-muted-2";

// Extrai HH:MM de abertura/fechamento. Formatos antigos em texto livre não casam
// e voltam vazios — ok, o gestor repreenche no seletor nativo.
function parseHorario(v: string | null): { abre: string; fecha: string } {
  const m = (v ?? "").match(/(\d{1,2}:\d{2})\D+(\d{1,2}:\d{2})/);
  return m
    ? { abre: m[1].padStart(5, "0"), fecha: m[2].padStart(5, "0") }
    : { abre: "", fecha: "" };
}

export function Wizard({ inicial, preview }: { inicial: SetupData; preview: boolean }) {
  const router = useRouter();
  const [passo, setPasso] = useState(0);
  const [sucesso, setSucesso] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<ChatMensagem[]>([]); // teste-como-aluno
  const [chatMsgsCalib, setChatMsgsCalib] = useState<ChatMensagem[]>([]); // entrevista
  const [modoJulia, setModoJulia] = useState<"calibracao" | "aluno">(
    CALIBRACAO_ATIVA ? "calibracao" : "aluno",
  );
  const [concluindo, iniciarConclusao] = useTransition();

  const avancar = () => setPasso((p) => Math.min(p + 1, PASSOS.length - 1));
  const voltar = () => setPasso((p) => Math.max(p - 1, 0));
  function finalizar() {
    iniciarConclusao(async () => {
      // Sem router.refresh() aqui: com onboarding_concluido=true o /setup
      // redirecionaria para /agenda e pularia a tela de sucesso. O resumo usa
      // o `inicial` já atualizado pelos refreshes de cada passo.
      await concluirOnboarding();
      setSucesso(true);
    });
  }

  const atual = PASSOS[passo];
  const ultimo = passo === PASSOS.length - 1;

  if (sucesso) return <TelaSucesso inicial={inicial} />;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 py-8">
      <div className="mb-6 flex items-center gap-2.5">
        <div className="grid h-9 w-9 place-items-center rounded-[9px] bg-brand font-display text-lg font-black italic text-white">
          K
        </div>
        <div>
          <div className="font-display text-[15px] font-extrabold italic uppercase leading-none">
            CT Kaha
          </div>
          <div className="text-[9.5px] uppercase tracking-[0.14em] text-muted">
            Configuração inicial
          </div>
        </div>
        {preview && (
          <span className="ml-auto rounded-full bg-warn-soft px-2 py-1 text-[10px] font-bold text-warn">
            pré-visualização
          </span>
        )}
      </div>

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[13px] font-bold">{atual.label}</span>
          <span className="text-[11.5px] text-muted">
            {atual.obrig ? "Obrigatório" : "Opcional"} · passo {passo + 1} de {PASSOS.length}
          </span>
        </div>
        <div className="flex gap-1.5">
          {PASSOS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= passo ? "bg-brand" : "bg-line-2"}`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1">
        {passo === 0 && <PassoAcademia inicial={inicial} />}
        {passo === 1 && <PassoPlanos inicial={inicial} />}
        {passo === 2 && <ImportarAlunos planos={inicial.planos} />}
        {passo === 3 && <PassoJulia inicial={inicial} />}
        {passo === 4 && <PassoProfessoresEquipe inicial={inicial} />}
        {passo === 5 && (
          <div className="flex flex-col gap-3">
            {CALIBRACAO_ATIVA && (
              <div className="flex gap-1 rounded-lg bg-line-2 p-1 text-[12px] font-semibold">
                <button
                  type="button"
                  onClick={() => setModoJulia("calibracao")}
                  className={`flex-1 rounded-md py-1.5 ${modoJulia === "calibracao" ? "bg-card text-ink shadow-sm" : "text-muted"}`}
                >
                  Configurar conversando
                </button>
                <button
                  type="button"
                  onClick={() => setModoJulia("aluno")}
                  className={`flex-1 rounded-md py-1.5 ${modoJulia === "aluno" ? "bg-card text-ink shadow-sm" : "text-muted"}`}
                >
                  Testar como aluno
                </button>
              </div>
            )}
            <p className="text-[13px] text-muted">
              {CALIBRACAO_ATIVA && modoJulia === "calibracao"
                ? "A Julia te pergunta como você quer atender — responda no seu jeito e ela vai configurando. No fim, mostra como ficam as mensagens."
                : "Converse com a Julia como se fosse um aluno. Ela responde na hora — quem executa é você e sua equipe."}
            </p>
            <div className="h-[52vh]">
              {CALIBRACAO_ATIVA && modoJulia === "calibracao" ? (
                <JuliaChat mode="calibracao" messages={chatMsgsCalib} onMessagesChange={setChatMsgsCalib} />
              ) : (
                <JuliaChat messages={chatMsgs} onMessagesChange={setChatMsgs} />
              )}
            </div>
            {(!CALIBRACAO_ATIVA || modoJulia === "aluno") && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                <p className="text-[12.5px] text-ink-2">Não ficou do seu jeito?</p>
                <button
                  type="button"
                  onClick={() => setPasso(3)}
                  className="flex-none text-[13px] font-semibold text-brand hover:underline"
                >
                  Ajustar como a Julia fala →
                </button>
              </div>
            )}
          </div>
        )}
        {passo === 6 && <PassoConectarWhatsapp inicial={inicial} />}
      </div>

      <div className="mt-6 flex items-center gap-3 border-t border-line pt-4">
        {passo > 0 ? (
          <button
            type="button"
            onClick={voltar}
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink-2 hover:border-muted-2"
          >
            Voltar
          </button>
        ) : (
          <span />
        )}
        <div className="ml-auto flex items-center gap-3">
          {!ultimo && !atual.obrig && (
            <button
              type="button"
              onClick={avancar}
              className="text-sm font-semibold text-muted hover:text-ink"
            >
              Pular
            </button>
          )}
          {ultimo ? (
            <button
              type="button"
              onClick={finalizar}
              disabled={concluindo}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {concluindo ? "Finalizando…" : "Finalizar configuração"}
            </button>
          ) : (
            <button
              type="button"
              onClick={avancar}
              className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Continuar
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

// ── Passo 1 · Academia (+ WhatsApp oficial) ──────────────────────────────────
function PassoAcademia({ inicial }: { inicial: SetupData }) {
  const router = useRouter();
  const horarioIni = parseHorario(inicial.config.academia_horarios);
  const [nome, setNome] = useState(inicial.config.academia_nome ?? "");
  const [abre, setAbre] = useState(horarioIni.abre);
  const [fecha, setFecha] = useState(horarioIni.fecha);
  const [whatsapp, setWhatsapp] = useState(inicial.config.numero_elite ?? "");
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function salvar() {
    setErro(null);
    start(async () => {
      const horarios = abre && fecha ? `${abre} às ${fecha}` : "";
      const r = await salvarAcademia({ nome, horarios, whatsapp });
      if (r.ok) {
        setSalvo(true);
        router.refresh();
      } else setErro(r.erro ?? "Não foi possível salvar.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted">O básico da sua academia. Ajustável depois em Configurações.</p>
      <Campo label="Nome da academia">
        <input value={nome} onChange={(e) => { setNome(e.target.value); setSalvo(false); }} placeholder="Ex.: CT Kaha" className={INPUT} />
      </Campo>
      <Campo label="WhatsApp oficial">
        <input value={whatsapp} onChange={(e) => { setWhatsapp(e.target.value); setSalvo(false); }} inputMode="tel" placeholder="Ex.: (11) 90000-0000" className={INPUT} />
      </Campo>
      <Campo label="Horário de funcionamento">
        <div className="flex items-center gap-2">
          <input type="time" value={abre} onChange={(e) => { setAbre(e.target.value); setSalvo(false); }} aria-label="Abre" className={TIME_IN} />
          <span className="text-sm text-muted">às</span>
          <input type="time" value={fecha} onChange={(e) => { setFecha(e.target.value); setSalvo(false); }} aria-label="Fecha" className={TIME_IN} />
        </div>
      </Campo>
      {erro && <p className="text-xs text-risk">{erro}</p>}
      <button type="button" onClick={salvar} disabled={pending} className="self-start rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pending ? "Salvando…" : salvo ? "Salvo ✓" : "Salvar"}
      </button>
    </div>
  );
}

// ── Passo 2 · Planos ─────────────────────────────────────────────────────────
function PassoPlanos({ inicial }: { inicial: SetupData }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [meta, setMeta] = useState("3");
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function add() {
    setErro(null);
    start(async () => {
      const r = await criarPlano({ nome, meta_semanal: parseInt(meta, 10) });
      if (r.ok) { setNome(""); setMeta("3"); router.refresh(); }
      else setErro(r.erro ?? "Não foi possível criar.");
    });
  }
  const remover = (id: string) => start(async () => { await removerPlano(id); router.refresh(); });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted">Cada aluno segue um plano com uma meta de treinos por semana. A capacidade é a soma das metas.</p>
      <div className="flex flex-col gap-2">
        {inicial.planos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted-2">Nenhum plano ainda.</p>
        ) : (
          inicial.planos.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.nome}</div>
                <div className="text-[11.5px] text-muted">{p.meta_semanal}× por semana</div>
              </div>
              <button type="button" onClick={() => remover(p.id)} disabled={pending} className="text-muted-2 hover:text-risk" aria-label="Remover plano">✕</button>
            </div>
          ))
        )}
      </div>
      <div className="rounded-xl border border-line bg-surface-2 p-3">
        <div className="flex gap-2">
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do plano (ex.: Elite)" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-muted-2" />
          <input value={meta} onChange={(e) => setMeta(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="w-16 rounded-lg border border-line px-2 py-2 text-center text-sm outline-none focus:border-muted-2" aria-label="Meta semanal" />
          <button type="button" onClick={add} disabled={pending} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">Adicionar</button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-2">Meta = treinos por semana.</p>
        {erro && <p className="mt-1 text-xs text-risk">{erro}</p>}
      </div>
    </div>
  );
}

// ── Passo 4 · Professores e equipe ───────────────────────────────────────────
const ESPECIALIDADES = ["Musculação", "Funcional", "Emagrecimento", "Performance", "Condicionamento"];

function PassoProfessoresEquipe({ inicial }: { inicial: SetupData }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [esp, setEsp] = useState("");
  const [espOutra, setEspOutra] = useState(false);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function add() {
    setErro(null);
    if (!nome.trim()) { setErro("Dê um nome ao professor."); return; }
    start(async () => {
      const r = await criarProfessor({ nome, especialidade: esp });
      if (r.ok) { setNome(""); setEsp(""); setEspOutra(false); router.refresh(); }
      else setErro(r.erro ?? "Não foi possível adicionar.");
    });
  }
  const remover = (id: string) => start(async () => { await removerProfessor(id); router.refresh(); });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-muted">Quem dá os treinos. A grade de horários você monta depois, em Professores.</p>
        {inicial.professores.map((p) => {
          const { cor, soft } = corProfessor(p.id);
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
              <span
                className="flex h-9 w-9 flex-none items-center justify-center rounded-xl text-[11px] font-bold"
                style={{ color: cor, backgroundColor: soft, border: `1px solid ${cor}` }}
              >
                {iniciais(p.nome)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.nome}</div>
                {p.especialidade && <div className="truncate text-[11.5px] text-muted">{p.especialidade}</div>}
              </div>
              <button type="button" onClick={() => remover(p.id)} disabled={pending} className="text-muted-2 hover:text-risk" aria-label="Remover professor">✕</button>
            </div>
          );
        })}
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2 p-3">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder="Nome do professor"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-muted-2"
          />
          <div className="flex flex-wrap gap-1.5">
            {ESPECIALIDADES.map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => { setEsp(x); setEspOutra(false); }}
                className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold ${esp === x && !espOutra ? "border-ink bg-ink text-white" : "border-line text-ink-2 hover:border-muted-2"}`}
              >
                {x}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setEspOutra(true); setEsp(""); }}
              className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold ${espOutra ? "border-ink bg-ink text-white" : "border-line text-ink-2 hover:border-muted-2"}`}
            >
              + outra
            </button>
          </div>
          {espOutra && (
            <input
              value={esp}
              onChange={(e) => setEsp(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
              placeholder="Qual especialidade?"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-muted-2"
            />
          )}
          <button type="button" onClick={add} disabled={pending} className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">Adicionar</button>
          {erro && <p className="text-xs text-risk">{erro}</p>}
        </div>
      </div>

      <Equipe inicial={inicial} />
    </div>
  );
}

// Equipe (kaha_usuarios) — captura de dado, não controle de acesso.
function Equipe({ inicial }: { inicial: SetupData }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState<PerfilEquipe>("professor");
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function add() {
    setErro(null);
    start(async () => {
      const r = await criarUsuario({ nome, email, perfil });
      if (r.ok) { setNome(""); setEmail(""); setPerfil("professor"); router.refresh(); }
      else setErro(r.erro ?? "Não foi possível adicionar.");
    });
  }
  const remover = (id: string) => start(async () => { await removerUsuario(id); router.refresh(); });

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-5">
      <div>
        <h3 className="text-[13px] font-bold">Equipe</h3>
        <p className="mt-1 text-[12.5px] text-muted">
          Cadastre sua equipe. Os acessos individuais são liberados em seguida — hoje a
          plataforma opera pelo seu login.
        </p>
      </div>
      {inicial.equipe.map((u) => (
        <div key={u.id} className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{u.nome}</div>
            <div className="truncate text-[11.5px] text-muted">
              {u.perfil}
              {u.email ? ` · ${u.email}` : ""}
            </div>
          </div>
          <button type="button" onClick={() => remover(u.id)} disabled={pending} className="text-muted-2 hover:text-risk" aria-label="Remover pessoa">✕</button>
        </div>
      ))}
      <div className="rounded-xl border border-line bg-surface-2 p-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-muted-2" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" placeholder="E-mail" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-muted-2" />
          </div>
          <div className="flex gap-2">
            <select value={perfil} onChange={(e) => setPerfil(e.target.value as PerfilEquipe)} className="flex-1 rounded-lg border border-line px-2 py-2 text-sm outline-none focus:border-muted-2">
              <option value="gerente">Gerente</option>
              <option value="coordenador">Coordenador</option>
              <option value="professor">Professor</option>
            </select>
            <button type="button" onClick={add} disabled={pending} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">Adicionar</button>
          </div>
        </div>
        {erro && <p className="mt-1 text-xs text-risk">{erro}</p>}
      </div>
    </div>
  );
}

// ── Passo 6 · Conectar WhatsApp (informativo — a ativação é feita com a equipe)
function PassoConectarWhatsapp({ inicial }: { inicial: SetupData }) {
  const router = useRouter();
  const [conectado, setConectado] = useState<boolean | null>(
    inicial.config.numero_ja_conectado,
  );
  const [pending, start] = useTransition();
  const numeroInformado = !!inicial.config.numero_elite?.trim();

  function escolher(v: boolean) {
    setConectado(v);
    start(async () => {
      await salvarConexaoWhatsapp({ numero_ja_conectado: v });
      router.refresh();
    });
  }

  const status = [
    { label: "Número informado", feito: numeroInformado },
    { label: "Conta Business preparada", emBreve: true },
    { label: "Verificação Meta", emBreve: true },
    { label: "Conexão concluída", emBreve: true },
  ];
  const prepare = [
    "WhatsApp Business App atualizado (v2.24.17 ou mais recente) num celular com câmera.",
    "Login do Facebook de quem administra o negócio.",
    "Portfólio empresarial da Meta (pode criar na hora — a escolha é definitiva).",
    "Página do Facebook vinculada ao WhatsApp Business.",
    "Durante a conexão: celular com o app aberto e internet estável.",
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[15px] font-bold">Conecte seu WhatsApp</h3>
        <p className="text-[13px] leading-relaxed text-muted">
          Este será o número oficial usado pela Julia, a concierge do Elite, para
          conversar com seus alunos.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-line bg-card p-3">
        {status.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 text-[13px]">
            <StatusDot feito={!!s.feito} />
            <span className={s.feito ? "text-ink" : "text-ink-2"}>{s.label}</span>
            {s.emBreve && (
              <span className="ml-auto rounded-full bg-line-2 px-2 py-0.5 text-[10px] font-semibold text-muted">
                em breve
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[12px] font-semibold text-ink-2">Prepare-se — o que ter em mãos:</p>
        <ul className="flex flex-col gap-2">
          {prepare.map((p, i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-2">
              <span className="mt-[3px] h-4 w-4 flex-none rounded-full border border-line" />
              {p}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2 p-3">
        <p className="text-[12.5px] font-semibold text-ink">
          Seu número já foi usado em alguma outra ferramenta de mensagens antes?
        </p>
        <div className="flex gap-2">
          {[
            { v: true, label: "Sim" },
            { v: false, label: "Não" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => escolher(o.v)}
              disabled={pending}
              className={`rounded-full border px-4 py-1.5 text-[12.5px] font-semibold ${
                conectado === o.v
                  ? "border-ink bg-ink text-white"
                  : "border-line text-ink-2 hover:border-muted-2"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-2">
          Isso ajuda nossa equipe a preparar a ativação com segurança.
        </p>
      </div>

      <p className="rounded-xl bg-blue-soft px-3 py-2.5 text-[12.5px] leading-relaxed text-blue">
        Nesta fase inicial, nossa equipe faz a ativação junto com você.
      </p>
    </div>
  );
}

function StatusDot({ feito }: { feito: boolean }) {
  return feito ? (
    <span className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-ok text-[9px] font-bold text-white">
      ✓
    </span>
  ) : (
    <span className="h-4 w-4 flex-none rounded-full border border-line" />
  );
}

// ── Tela de sucesso (pós-wizard) ─────────────────────────────────────────────
function TelaSucesso({ inicial }: { inicial: SetupData }) {
  const c = inicial.config;
  const juliaPersonalizada =
    inicial.faq.length > 0 || !!c.saudacao?.trim() || !!c.resposta_valores?.trim();
  const linhas = [
    inicial.alunosCount > 0 &&
      `${inicial.alunosCount} ${inicial.alunosCount === 1 ? "aluno importado" : "alunos importados"}`,
    inicial.professores.length > 0 &&
      `${inicial.professores.length} ${inicial.professores.length === 1 ? "professor" : "professores"}`,
    juliaPersonalizada && "Julia personalizada",
    !!c.numero_elite?.trim() && "WhatsApp cadastrado",
    inicial.equipe.length > 0 && "Equipe cadastrada",
  ].filter(Boolean) as string[];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-5 py-10 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-ok-soft text-3xl">
        🎉
      </div>
      <h1 className="font-display text-2xl font-black italic">Tudo pronto.</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        Sua academia já pode começar a usar o Kaha Elite.
      </p>

      {linhas.length > 0 && (
        <div className="mt-6 w-full rounded-2xl border border-line bg-card p-4">
          <ul className="flex flex-col gap-2.5 text-left">
            {linhas.map((l) => (
              <li key={l} className="flex items-center gap-2.5 text-[13px] text-ink">
                <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-ok text-[10px] font-bold text-white">
                  ✓
                </span>
                {l}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-7 flex w-full flex-col gap-2.5 sm:flex-row">
        <Link
          href="/julia"
          className="flex-1 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          Testar a Julia
        </Link>
        <Link
          href="/dashboard"
          className="flex-1 rounded-xl border border-line px-5 py-3 text-sm font-semibold text-ink-2 hover:border-muted-2"
        >
          Entrar na plataforma
        </Link>
      </div>
    </main>
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
