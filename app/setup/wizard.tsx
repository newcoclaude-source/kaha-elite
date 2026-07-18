"use client";

// Wizard de onboarding self-service. Ordem: Academia(+WhatsApp) → Planos →
// Importar alunos → Conhecimento da Julia (opcional) → Professores e equipe
// (opcional). Obrigatórios: 1–3. Mobile-first, design D0, fora do shell.
// Sem ToastProvider aqui → feedback de erro inline.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PerfilEquipe, SetupData } from "@/lib/kaha/onboarding";
import { JuliaChat } from "@/components/julia/julia-chat";
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
} from "./actions";

const PASSOS = [
  { label: "Academia", obrig: true },
  { label: "Planos", obrig: true },
  { label: "Importar alunos", obrig: true },
  { label: "Conhecimento da Julia", obrig: false },
  { label: "Professores e equipe", obrig: false },
  { label: "Experimente a Julia", obrig: false },
] as const;

const INPUT = "w-full rounded-[10px] border border-line px-3 py-2.5 text-sm outline-none focus:border-muted-2";

export function Wizard({ inicial, preview }: { inicial: SetupData; preview: boolean }) {
  const router = useRouter();
  const [passo, setPasso] = useState(0);
  const [concluindo, iniciarConclusao] = useTransition();

  const avancar = () => setPasso((p) => Math.min(p + 1, PASSOS.length - 1));
  const voltar = () => setPasso((p) => Math.max(p - 1, 0));
  function concluir() {
    iniciarConclusao(async () => {
      await concluirOnboarding();
      router.replace("/agenda");
      router.refresh();
    });
  }

  const atual = PASSOS[passo];
  const ultimo = passo === PASSOS.length - 1;

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
            <p className="text-[13px] text-muted">
              Pronto! Converse com a Julia como se fosse um aluno. Ela responde na hora — quem
              executa é você e sua equipe.
            </p>
            <div className="h-[58vh]">
              <JuliaChat />
            </div>
          </div>
        )}
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
              onClick={concluir}
              disabled={concluindo}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {concluindo ? "Concluindo…" : "Concluir configuração"}
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
  const [nome, setNome] = useState(inicial.config.academia_nome ?? "");
  const [horarios, setHorarios] = useState(inicial.config.academia_horarios ?? "");
  const [whatsapp, setWhatsapp] = useState(inicial.config.numero_elite ?? "");
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function salvar() {
    setErro(null);
    start(async () => {
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
        <textarea value={horarios} onChange={(e) => { setHorarios(e.target.value); setSalvo(false); }} rows={2} placeholder="Ex.: Seg a Sex 6h–22h · Sáb 8h–13h" className={`${INPUT} resize-none`} />
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
function PassoProfessoresEquipe({ inicial }: { inicial: SetupData }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [esp, setEsp] = useState("");
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function add() {
    setErro(null);
    start(async () => {
      const r = await criarProfessor({ nome, especialidade: esp });
      if (r.ok) { setNome(""); setEsp(""); router.refresh(); }
      else setErro(r.erro ?? "Não foi possível adicionar.");
    });
  }
  const remover = (id: string) => start(async () => { await removerProfessor(id); router.refresh(); });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-muted">Quem dá os treinos. A grade de horários você monta depois, em Professores.</p>
        {inicial.professores.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{p.nome}</div>
              {p.especialidade && <div className="truncate text-[11.5px] text-muted">{p.especialidade}</div>}
            </div>
            <button type="button" onClick={() => remover(p.id)} disabled={pending} className="text-muted-2 hover:text-risk" aria-label="Remover professor">✕</button>
          </div>
        ))}
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do professor" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-muted-2" />
            <input value={esp} onChange={(e) => setEsp(e.target.value)} placeholder="Especialidade (opcional)" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-muted-2" />
            <button type="button" onClick={add} disabled={pending} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">Adicionar</button>
          </div>
          {erro && <p className="mt-1 text-xs text-risk">{erro}</p>}
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

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-ink-2">{label}</span>
      {children}
    </label>
  );
}
