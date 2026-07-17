// Camada de dados do wizard de onboarding. Server-only. Não toca em D0–D8.
// A capacidade do Dashboard continua vindo de kaha_alunos.meta_semanal (espelho
// denormalizado do plano) — por isso o import escreve meta_semanal = plano.meta.

import { createClient } from "@/lib/supabase/server";

export type Plano = { id: string; nome: string; meta_semanal: number; ativo: boolean };
export type ProfessorSetup = { id: string; nome: string; especialidade: string | null };
export type PerfilEquipe = "gerente" | "coordenador" | "professor";
export type UsuarioEquipe = {
  id: string;
  nome: string;
  email: string | null;
  perfil: PerfilEquipe;
};
export type FaqItem = { id: string | null; pergunta: string; resposta: string };

export type SetupConfig = {
  academia_nome: string | null;
  academia_horarios: string | null;
  numero_elite: string | null;
  tom: string | null;
  janela_inicio: string | null;
  janela_fim: string | null;
  resposta_valores: string | null;
  prazo_cancelar: string | null;
  onboarding_concluido: boolean;
};

export type SetupData = {
  config: SetupConfig;
  planos: Plano[];
  professores: ProfessorSetup[];
  equipe: UsuarioEquipe[];
  faq: FaqItem[];
  alunosCount: number;
};

// FAQ pré-carregado no passo 3.5 — o gestor só responde.
export const FAQ_PADRAO: string[] = [
  "Como funciona o valor do plano?",
  "Qual o horário de funcionamento?",
  "Abre aos sábados?",
  "Tem estacionamento?",
  "Como faço para cancelar ou remarcar?",
  "Posso repor uma sessão que perdi?",
];

const CONFIG_VAZIA: SetupConfig = {
  academia_nome: null,
  academia_horarios: null,
  numero_elite: null,
  tom: null,
  janela_inicio: null,
  janela_fim: null,
  resposta_valores: null,
  prazo_cancelar: null,
  onboarding_concluido: false,
};

export async function onboardingConcluido(): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("kaha_config")
    .select("onboarding_concluido")
    .maybeSingle();
  return data?.onboarding_concluido ?? false;
}

export async function carregarSetup(): Promise<SetupData> {
  const supabase = createClient();
  const [cfg, planos, profs, equipe, faqRows, alunos] = await Promise.all([
    supabase
      .from("kaha_config")
      .select(
        "academia_nome, academia_horarios, numero_elite, tom, janela_inicio, janela_fim, resposta_valores, prazo_cancelar, onboarding_concluido",
      )
      .maybeSingle(),
    supabase
      .from("kaha_planos")
      .select("id, nome, meta_semanal, ativo")
      .eq("ativo", true)
      .order("meta_semanal", { ascending: true }),
    supabase
      .from("kaha_professores")
      .select("id, nome, especialidade")
      .eq("ativo", true)
      .order("nome", { ascending: true }),
    supabase
      .from("kaha_usuarios")
      .select("id, nome, email, perfil")
      .order("created_at", { ascending: true }),
    supabase
      .from("kaha_faq")
      .select("id, pergunta, resposta")
      .order("ordem", { ascending: true }),
    supabase
      .from("kaha_alunos")
      .select("id", { count: "exact", head: true })
      .eq("ativo", true),
  ]);

  const faqExistente = (faqRows.data ?? []) as FaqItem[];
  const faq: FaqItem[] =
    faqExistente.length > 0
      ? faqExistente
      : FAQ_PADRAO.map((pergunta) => ({ id: null, pergunta, resposta: "" }));

  return {
    config: (cfg.data as SetupConfig) ?? CONFIG_VAZIA,
    planos: (planos.data ?? []) as Plano[],
    professores: (profs.data ?? []) as ProfessorSetup[],
    equipe: (equipe.data ?? []) as UsuarioEquipe[],
    faq,
    alunosCount: alunos.count ?? 0,
  };
}

export type PassoStatus = { label: string; ok: boolean };
export type PendenciasOnboarding = {
  concluido: boolean;
  feito: number;
  total: number;
  passos: PassoStatus[];
};

// "Configuração X de 4" — obrigatórios primeiro (Academia, Planos, Alunos),
// Professores é opcional mas conta no checklist. Ordem = a do wizard.
export async function contarPendencias(): Promise<PendenciasOnboarding> {
  const s = await carregarSetup();
  const passos: PassoStatus[] = [
    { label: "Academia", ok: !!s.config.academia_nome?.trim() },
    { label: "Planos", ok: s.planos.length > 0 },
    { label: "Alunos", ok: s.alunosCount > 0 },
    { label: "Professores", ok: s.professores.length > 0 },
  ];
  return {
    concluido: s.config.onboarding_concluido,
    feito: passos.filter((p) => p.ok).length,
    total: passos.length,
    passos,
  };
}
