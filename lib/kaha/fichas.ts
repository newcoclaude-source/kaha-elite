// Camada de dados das fichas de treino (B3). Roda no servidor.
// A escrita (salvarFicha) é transacional via RPC kaha_salvar_ficha.

import { createClient } from "@/lib/supabase/server";

export type Ficha = {
  id: string;
  aluno_id: string;
  nome: string;
  ativa: boolean;
  objetivo: string | null;
  divisao: string | null;
};

export type Exercicio = {
  id: string;
  nome: string;
  ordem: number;
  series: number | null;
  reps_alvo: string | null;
  carga_alvo: string | null;
  biblioteca_id: string | null;
};

export type ExercicioInput = {
  nome: string;
  series?: number | null;
  reps_alvo?: string | null;
  carga_alvo?: string | null;
  biblioteca_id?: string | null;
};

export async function obterFicha(
  alunoId: string,
): Promise<{ ficha: Ficha; exercicios: Exercicio[] } | null> {
  const supabase = createClient();

  const { data: ficha, error } = await supabase
    .from("kaha_fichas")
    .select("id, aluno_id, nome, ativa, objetivo, divisao")
    .eq("aluno_id", alunoId)
    .eq("ativa", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!ficha) return null;

  const { data: ex, error: e2 } = await supabase
    .from("kaha_ficha_exercicios")
    .select("id, nome, ordem, series, reps_alvo, carga_alvo, biblioteca_id")
    .eq("ficha_id", ficha.id)
    .order("ordem", { ascending: true });
  if (e2) throw e2;

  return { ficha: ficha as Ficha, exercicios: (ex ?? []) as Exercicio[] };
}

// Upsert da ficha + substituição transacional dos exercícios (via função SQL).
export async function salvarFicha(
  alunoId: string,
  dados: {
    objetivo?: string | null;
    divisao?: string | null;
    exercicios: ExercicioInput[];
  },
): Promise<string> {
  const supabase = createClient();

  const exercicios = dados.exercicios
    .filter((e) => e.nome && e.nome.trim())
    .map((e) => ({
      nome: e.nome.trim(),
      series:
        e.series === null || e.series === undefined || Number.isNaN(e.series)
          ? null
          : Number(e.series),
      reps_alvo: e.reps_alvo?.trim() || null,
      carga_alvo: e.carga_alvo?.trim() || null,
      biblioteca_id: e.biblioteca_id || null,
    }));

  const { data, error } = await supabase.rpc("kaha_salvar_ficha", {
    p_aluno_id: alunoId,
    p_objetivo: dados.objetivo?.trim() || null,
    p_divisao: dados.divisao?.trim() || null,
    p_exercicios: exercicios,
  });
  if (error) throw error;
  return data as string;
}
