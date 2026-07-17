// Camada de dados do wizard de onboarding. Server-only. Não toca em D0–D8.
// A capacidade do Dashboard continua vindo de kaha_alunos.meta_semanal (espelho
// denormalizado do plano) — por isso o import escreve meta_semanal = plano.meta.

import { createClient } from "@/lib/supabase/server";

export type Plano = { id: string; nome: string; meta_semanal: number; ativo: boolean };
export type ProfessorSetup = { id: string; nome: string; especialidade: string | null };
export type SetupConfig = {
  academia_nome: string | null;
  academia_horarios: string | null;
  onboarding_concluido: boolean;
};
export type SetupData = {
  config: SetupConfig;
  planos: Plano[];
  professores: ProfessorSetup[];
  alunosCount: number;
};

const CONFIG_VAZIA: SetupConfig = {
  academia_nome: null,
  academia_horarios: null,
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
  const [cfg, planos, profs, alunos] = await Promise.all([
    supabase
      .from("kaha_config")
      .select("academia_nome, academia_horarios, onboarding_concluido")
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
      .from("kaha_alunos")
      .select("id", { count: "exact", head: true })
      .eq("ativo", true),
  ]);
  return {
    config: (cfg.data as SetupConfig) ?? CONFIG_VAZIA,
    planos: (planos.data ?? []) as Plano[],
    professores: (profs.data ?? []) as ProfessorSetup[],
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

// "Configuração X de 4" — usado pelo card do Dashboard (componente standalone).
export async function contarPendencias(): Promise<PendenciasOnboarding> {
  const s = await carregarSetup();
  const passos: PassoStatus[] = [
    { label: "Academia", ok: !!s.config.academia_nome?.trim() },
    { label: "Planos", ok: s.planos.length > 0 },
    { label: "Professores", ok: s.professores.length > 0 },
    { label: "Alunos", ok: s.alunosCount > 0 },
  ];
  return {
    concluido: s.config.onboarding_concluido,
    feito: passos.filter((p) => p.ok).length,
    total: passos.length,
    passos,
  };
}
